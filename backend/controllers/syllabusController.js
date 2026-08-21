import Subject from "../models/Subject.js";
import Unit from "../models/Unit.js";
import Topic from "../models/Topic.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

let pdfParseLegacy;
let PDFParseClass;
try {
  const pdfParseModule = require("pdf-parse");
  if (typeof pdfParseModule === "function") {
    pdfParseLegacy = pdfParseModule;
  }
  if (typeof pdfParseModule?.default === "function") {
    pdfParseLegacy = pdfParseModule.default;
  }
  if (typeof pdfParseModule?.PDFParse === "function") {
    PDFParseClass = pdfParseModule.PDFParse;
  }
} catch (error) {
  console.error("[SyllabusExtract] Failed to load pdf-parse module", {
    message: error.message,
    nodeVersion: process.version,
  });
}

async function parsePdfText(buffer) {
  if (typeof pdfParseLegacy === "function") {
    const parsed = await pdfParseLegacy(buffer);
    return parsed?.text || "";
  }

  if (typeof PDFParseClass === "function") {
    const parser = new PDFParseClass({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed?.text || "";
    } finally {
      if (typeof parser.destroy === "function") {
        await parser.destroy();
      }
    }
  }

  throw new Error("Unsupported pdf-parse API shape.");
}

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const THEORY_SECTION_REGEX = /course\s+uniti[sz]ation\s+plan\s+theory/i;
const LAB_SECTION_REGEX = /course\s+uniti[sz]ation\s+plan\s+(lab|laboratory)/i;
const UNIT_LINE_REGEX = /^UNIT\s*(\d+)\s*(.*)$/i;

function parseContactHours(value) {
  if (!value) return { stripped: "", contactHours: null };
  const match = value.match(
    /(?:^|\s)(\d{1,2}(?:\.\d+)?)\s*(?:hours?|hrs?)?\s*$/i,
  );
  if (!match) return { stripped: value.trim(), contactHours: null };

  const contactHours = Number(match[1]);
  if (!Number.isFinite(contactHours) || contactHours > 30) {
    return { stripped: value.trim(), contactHours: null };
  }

  const stripped = value.slice(0, match.index).trim();
  return { stripped, contactHours };
}

function cleanUnitTitle(value, unitNumber) {
  const raw = value
    .replace(/^[-:,.\s]+/, "")
    .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, "")
    .trim();
  return raw || `Unit ${unitNumber}`;
}

function cleanTopicText(value) {
  let topic = value
    .replace(/[\u2022\u25E6]/g, " ")
    .replace(/^[-*o]\s+/i, "")
    .replace(/^\d+[.)\]:-]?\s+/, "")
    .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, "")
    .replace(/\s+\d{1,2}(?:\.\d+)?\s*(?:hours?|hrs?)\s*$/i, "")
    .replace(/\s+\d{1,2}(?:\.\d+)?\s+\d+(?:\s*,\s*\d+)*$/i, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!topic) return "";
  if (
    /^(unit\s*no\.?|topic\s*name|contact\s*hours?|clos?|s\.\s*no\.?|sl\.\s*no\.?)$/i.test(
      topic,
    )
  )
    return "";
  if (/^\d+(?:\s*,\s*\d+)*$/.test(topic)) return "";
  return topic;
}

function parseSyllabusTheoryUnits(text) {
  const normalizedLines = text
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const theoryStart = normalizedLines.findIndex((line) =>
    THEORY_SECTION_REGEX.test(line),
  );
  let theoryLines = normalizedLines;

  if (theoryStart >= 0) {
    theoryLines = normalizedLines.slice(theoryStart + 1);
  }

  const labStart = theoryLines.findIndex((line) =>
    LAB_SECTION_REGEX.test(line),
  );
  if (labStart >= 0) {
    theoryLines = theoryLines.slice(0, labStart);
  }

  const units = [];
  let currentUnit = null;
  let pendingTopic = "";

  const pushPendingTopic = () => {
    if (!currentUnit || !pendingTopic) return;
    const cleaned = cleanTopicText(pendingTopic);
    if (cleaned.length > 2) {
      currentUnit.topics.push({ name: cleaned });
    }
    pendingTopic = "";
  };

  for (const line of theoryLines) {
    if (/^total\s+theory\s+contact\s+hours?/i.test(line)) {
      break;
    }

    const unitMatch = line.match(UNIT_LINE_REGEX);
    if (unitMatch) {
      pushPendingTopic();
      const unitNumber = Number(unitMatch[1]);
      const remainder = unitMatch[2]?.trim() || "";
      const { stripped, contactHours } = parseContactHours(remainder);

      currentUnit = {
        unitNumber,
        name: cleanUnitTitle(stripped, unitNumber),
        contactHours,
        topics: [],
      };
      units.push(currentUnit);
      continue;
    }

    if (!currentUnit) continue;

    if (
      /^(unit\s*no\.?|topic\s*name|contact\s*hours?|clos?|s\.\s*no\.?|sl\.\s*no\.?)$/i.test(
        line,
      )
    ) {
      continue;
    }

    const maybeTopic = cleanTopicText(line);
    if (!maybeTopic) continue;

    const startsNewTopic =
      /^\d+[.)\]:-]?\s+/.test(line) || /^[-*\u2022]/.test(line);
    if (startsNewTopic) {
      pushPendingTopic();
      pendingTopic = maybeTopic;
      continue;
    }

    if (!pendingTopic) {
      pendingTopic = maybeTopic;
      continue;
    }

    pendingTopic = `${pendingTopic} ${maybeTopic}`
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  pushPendingTopic();

  return units.filter((unit) => unit.topics.length > 0);
}

export async function extractSyllabus(req, res) {
  try {
    const subjectId = req.params.id;
    const userId = req.user?._id?.toString();

    console.info("[SyllabusExtract] Started", { subjectId, userId });

    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user._id,
    });
    if (!subject)
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });

    const syllabusFile = subject.syllabusFile || {};
    if (!syllabusFile.url) {
      return res.status(400).json({
        success: false,
        message: "Syllabus PDF has not been uploaded for this subject.",
      });
    }

    const storedMimeType = (syllabusFile.mimeType || "").toLowerCase();
    if (
      storedMimeType &&
      !storedMimeType.includes("pdf") &&
      !storedMimeType.includes("octet-stream")
    ) {
      return res.status(400).json({
        success: false,
        message: "Uploaded file is not a PDF.",
      });
    }

    if (!pdfParseLegacy && !PDFParseClass) {
      throw new HttpError(500, "PDF parser is unavailable on server.");
    }

    console.info("[SyllabusExtract] Syllabus file metadata", {
      subjectId,
      hasUrl: Boolean(syllabusFile.url),
      publicId: syllabusFile.publicId || "",
      originalName: syllabusFile.originalName || "",
      mimeType: syllabusFile.mimeType || "",
    });

    let response;
    try {
      response = await fetch(syllabusFile.url);
    } catch (error) {
      console.error("[SyllabusExtract] PDF fetch request failed", {
        subjectId,
        message: error.message,
      });
      throw new HttpError(502, "Could not download syllabus PDF from storage.");
    }

    const contentType = response.headers.get("content-type") || "";
    const contentLength = response.headers.get("content-length") || "unknown";

    console.info("[SyllabusExtract] PDF fetch response", {
      subjectId,
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      contentType,
      contentLength,
    });

    if (!response.ok) {
      throw new HttpError(
        502,
        `Could not download syllabus PDF from storage. (${response.status} ${response.statusText})`,
      );
    }

    const normalizedContentType = contentType.toLowerCase();
    const contentTypeLooksPdfLike =
      normalizedContentType.includes("application/pdf") ||
      normalizedContentType.includes("application/octet-stream") ||
      normalizedContentType.includes("binary/octet-stream");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      throw new HttpError(502, "Could not download syllabus PDF from storage.");
    }

    const signature = buffer.subarray(0, 4).toString("utf8");
    if (signature !== "%PDF") {
      if (!contentTypeLooksPdfLike) {
        throw new HttpError(
          502,
          `Could not download syllabus PDF from storage. Received content type: ${contentType || "unknown"}.`,
        );
      }
      throw new HttpError(400, "Uploaded file is not a PDF.");
    }

    let text = "";
    try {
      text = await parsePdfText(buffer);
    } catch (error) {
      console.error("[SyllabusExtract] pdf-parse failed", {
        subjectId,
        message: error.message,
        nodeVersion: process.version,
        parserMode: pdfParseLegacy ? "legacy-function" : "v2-class",
      });
      throw new HttpError(500, "Unexpected PDF parsing error.");
    }

    if (!text || text.trim().length < 50) {
      return res.status(422).json({
        success: false,
        message: "Could not extract readable text from PDF.",
      });
    }

    const units = parseSyllabusTheoryUnits(text);

    if (units.length === 0) {
      return res.status(422).json({
        success: false,
        message: "Could not detect syllabus structure from this PDF.",
      });
    }

    console.info("[SyllabusExtract] Completed", {
      subjectId,
      unitCount: units.length,
      topicCount: units.reduce((sum, unit) => sum + unit.topics.length, 0),
    });

    res.json({ success: true, data: { units } });
  } catch (error) {
    if (error instanceof HttpError) {
      console.error("[SyllabusExtract] Handled failure", {
        statusCode: error.statusCode,
        message: error.message,
      });
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    console.error("[SyllabusExtract] Unexpected failure", {
      message: error.message,
      stack: error.stack,
      nodeVersion: process.version,
    });
    return res.status(500).json({
      success: false,
      message: "Failed to extract syllabus due to an unexpected server error.",
    });
  }
}

export async function confirmSyllabus(req, res) {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!subject)
      return res
        .status(404)
        .json({ success: false, message: "Subject not found" });

    const { units } = req.body;
    if (!units || !Array.isArray(units)) {
      return res
        .status(400)
        .json({ success: false, message: "Units array is required" });
    }

    // Delete existing units and topics for this subject
    await Unit.deleteMany({ subject: subject._id, user: req.user._id });
    await Topic.deleteMany({ subject: subject._id, user: req.user._id });

    // Insert Units and Topics
    let unitOrder = 0;
    for (const u of units) {
      unitOrder++;
      const unitDoc = await Unit.create({
        user: req.user._id,
        subject: subject._id,
        title: u.name,
        order: unitOrder,
      });

      if (u.topics && Array.isArray(u.topics)) {
        let topicOrder = 0;
        for (const t of u.topics) {
          topicOrder++;
          await Topic.create({
            user: req.user._id,
            subject: subject._id,
            unit: unitDoc._id,
            title: t.name,
            status: "not-started",
            importance: "medium",
            order: topicOrder,
          });
        }
      }
    }

    res.json({ success: true, message: "Syllabus successfully saved" });
  } catch (error) {
    console.error("Confirm error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to save syllabus" });
  }
}
