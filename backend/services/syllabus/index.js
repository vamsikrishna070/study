

import { validateDocumentBuffer, SUPPORTED_TYPES } from './fileValidator.js';
import { parsePdfDocument } from './pdfParser.js';
import { parseDocxDocument } from './docxParser.js';
import { parseTxtDocument } from './txtParser.js';
import { extractMetadata } from './metadataExtractor.js';
import { segmentDocumentSections } from './sectionSegmenter.js';
import { extractTheoryUnits } from './theoryExtractor.js';
import { extractLabExperiments } from './labExtractor.js';
import { validateExtraction } from './validator.js';
import { normalizeDocumentText } from './normalizer.js';

export { romanToArabic, parseUnitNumber, cleanOcrTypo } from './normalizer.js';
export { isReferenceOrJunk } from './theoryExtractor.js';

export async function parsePdfBufferToText(buffer) {
  const result = await parsePdfDocument(buffer);
  return result.combinedText || '';
}

export function extractSyllabusStructure(rawText, options = {}) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      courseName: '',
      courseCode: '',
      units: [],
      theoryUnits: [],
      labExperiments: [],
      hasTheory: false,
      hasLab: false,
      metadata: {
        confidence: 0,
        confidenceLevel: 'low',
        warnings: ['Empty input text'],
      },
    };
  }

  const normalized = normalizeDocumentText(rawText);
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);

  const { courseName, courseCode } = extractMetadata(lines);

  const { theoryLines, labLines } = segmentDocumentSections(lines);

  const theoryUnits = extractTheoryUnits(theoryLines);

  const labExperiments = extractLabExperiments(labLines);

  const units = [...theoryUnits];
  if (labExperiments.length > 0) {
    units.push({
      unitNumber: theoryUnits.length + 1,
      unitName: 'Laboratory Experiments',
      name: 'Laboratory Experiments',
      isLab: true,
      topics: labExperiments.map((e) => ({
        title: e.title,
        name: e.title,
        confidence: e.confidence || 0.95,
      })),
    });
  }

  const validation = validateExtraction({
    theoryUnits,
    labExperiments,
    courseName,
    courseCode,
    parseMetadata: options.parseMetadata || {},
  });

  return {
    courseName,
    courseCode,
    units,
    theoryUnits,
    labExperiments,
    hasTheory: theoryUnits.length > 0,
    hasLab: labExperiments.length > 0,
    metadata: {
      sourceType: options.sourceType || 'text',
      pages: options.totalPages || 1,
      ocrUsed: Boolean(options.ocrUsed),
      ocrPages: options.ocrPages || [],
      confidence: validation.confidence,
      confidenceLevel: validation.confidenceLevel,
      warnings: validation.warnings,
      theoryUnitCount: theoryUnits.length,
      labExperimentCount: labExperiments.length,
    },
  };
}

export async function extractSyllabusFromBuffer(buffer, options = {}) {

  const fileValidation = validateDocumentBuffer(buffer, options.originalFileName, options.mimeType);
  if (!fileValidation.valid) {
    const err = new Error(fileValidation.error || 'Invalid or unsupported document format.');
    err.statusCode = 400;
    err.fileType = fileValidation.fileType;
    throw err;
  }

  const fileType = fileValidation.fileType;
  let parseResult;

  if (fileType === SUPPORTED_TYPES.PDF) {
    parseResult = await parsePdfDocument(buffer, options);
  } else if (fileType === SUPPORTED_TYPES.DOCX) {
    parseResult = await parseDocxDocument(buffer);
  } else if (fileType === SUPPORTED_TYPES.TXT) {
    parseResult = parseTxtDocument(buffer);
  } else {
    const err = new Error('Unsupported document format.');
    err.statusCode = 400;
    throw err;
  }

  const combinedText = parseResult.combinedText || '';
  if (!combinedText || combinedText.trim().length < 25) {
    const err = new Error('Could not extract readable syllabus text from document.');
    err.statusCode = 422;
    err.metadata = parseResult;
    throw err;
  }

  const extracted = extractSyllabusStructure(combinedText, {
    sourceType: fileType,
    totalPages: parseResult.totalPages,
    ocrUsed: parseResult.ocrUsed,
    ocrPages: parseResult.ocrPages,
    parseMetadata: {
      ocrUsed: parseResult.ocrUsed,
      confidence: parseResult.ocrUsed ? 0.90 : 0.96,
      pages: parseResult.pages,
    },
  });

  extracted.metadata.pageDetails = (parseResult.pages || []).map((p) => ({
    pageNumber: p.pageNumber,
    quality: p.quality,
    extractionMethod: p.extractionMethod,
    ocrUsed: p.ocrUsed,
    confidence: p.confidence,
  }));

  return extracted;
}
