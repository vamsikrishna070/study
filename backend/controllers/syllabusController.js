import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import Topic from '../models/Topic.js';
import {
  extractSyllabusFromBuffer,
  sanitizeDocumentUrl,
} from '../services/syllabusExtractorService.js';

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * @desc Extract syllabus units & topics from uploaded syllabus document (PDF, DOCX, TXT)
 * @route POST /api/syllabus/:id/extract or /api/subjects/:id/syllabus/extract
 * @access Private
 */
export async function extractSyllabus(req, res) {
  try {
    const subjectId = req.params.id;
    const userId = req.user?._id?.toString();

    console.info('[SyllabusExtract] Started', { subjectId, userId });

    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user._id,
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const syllabusFile = subject.syllabusFile || {};
    if (!syllabusFile.url) {
      return res.status(400).json({
        success: false,
        message: 'Syllabus document has not been uploaded for this subject.',
      });
    }

    const cleanDownloadUrl = sanitizeDocumentUrl(syllabusFile.url);

    let response;
    try {
      response = await fetch(cleanDownloadUrl);
    } catch (error) {
      console.error('[SyllabusExtract] Document fetch request failed', {
        subjectId,
        url: cleanDownloadUrl,
        message: error.message,
      });
      throw new HttpError(502, 'Could not download syllabus document from storage.');
    }

    if (!response.ok) {
      throw new HttpError(
        502,
        `Could not download syllabus document from storage (${response.status} ${response.statusText}).`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      throw new HttpError(502, 'Downloaded syllabus document is empty.');
    }

    let extractionResult;
    try {
      extractionResult = await extractSyllabusFromBuffer(buffer, {
        originalFileName: syllabusFile.originalName,
        mimeType: syllabusFile.mimeType,
      });
    } catch (error) {
      console.error('[SyllabusExtract] Extraction failed:', {
        subjectId,
        message: error.message,
        statusCode: error.statusCode,
      });
      throw new HttpError(error.statusCode || 500, error.message || 'Failed to extract syllabus.');
    }

    const { courseName, courseCode, units, theoryUnits, labExperiments, hasTheory, hasLab, metadata } = extractionResult;

    if (!units || units.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Could not detect syllabus units or experiments from this document.',
        metadata,
      });
    }

    // Map units for frontend & mobile compatibility
    const formattedUnits = units.map((u) => ({
      unitNumber: u.unitNumber,
      unitName: u.unitName || u.name,
      name: u.unitName || u.name,
      isLab: Boolean(u.isLab),
      topics: (u.topics || []).map((t) => ({
        title: t.title || t.name,
        name: t.title || t.name,
        confidence: t.confidence || 0.95,
      })),
    }));

    console.info('[SyllabusExtract] Completed successfully', {
      subjectId,
      courseName,
      courseCode,
      theoryUnitCount: theoryUnits.length,
      labExperimentCount: labExperiments.length,
      totalUnits: formattedUnits.length,
      ocrUsed: metadata.ocrUsed,
      confidence: metadata.confidence,
    });

    res.json({
      success: true,
      data: {
        courseName: courseName || subject.name,
        courseCode: courseCode || subject.code,
        units: formattedUnits,
        theoryUnits,
        labExperiments,
        hasTheory,
        hasLab,
        metadata,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.error('[SyllabusExtract] Handled failure', {
        statusCode: error.statusCode,
        message: error.message,
      });
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    console.error('[SyllabusExtract] Unexpected failure', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({
      success: false,
      message: 'Failed to extract syllabus due to an unexpected server error.',
    });
  }
}

/**
 * @desc Confirm and persist reviewed syllabus units & topics
 * @route POST /api/syllabus/:id/confirm or /api/subjects/:id/syllabus/confirm
 * @access Private
 */
export async function confirmSyllabus(req, res) {
  try {
    const subject = await Subject.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!subject) {
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const { units } = req.body;
    if (!units || !Array.isArray(units)) {
      return res
        .status(400)
        .json({ success: false, message: 'Units array is required' });
    }

    // Delete existing units and topics for this subject
    await Unit.deleteMany({ subject: subject._id, user: req.user._id });
    await Topic.deleteMany({ subject: subject._id, user: req.user._id });

    // Insert Units and Topics
    let unitOrder = 0;
    for (const u of units) {
      unitOrder++;
      const unitTitle = u.name || u.unitName || u.title || `Unit ${unitOrder}`;
      const unitDoc = await Unit.create({
        user: req.user._id,
        subject: subject._id,
        title: unitTitle,
        order: unitOrder,
      });

      if (u.topics && Array.isArray(u.topics)) {
        let topicOrder = 0;
        for (const t of u.topics) {
          topicOrder++;
          const topicTitle = t.name || t.title || `Topic ${topicOrder}`;
          await Topic.create({
            user: req.user._id,
            subject: subject._id,
            unit: unitDoc._id,
            title: topicTitle,
            status: 'not-started',
            importance: 'medium',
            order: topicOrder,
          });
        }
      }
    }

    res.json({ success: true, message: 'Syllabus successfully saved' });
  } catch (error) {
    console.error('[SyllabusConfirm] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to save syllabus' });
  }
}
