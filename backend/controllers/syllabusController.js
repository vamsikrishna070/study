import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import Topic from '../models/Topic.js';
import {
  parsePdfBufferToText,
  parseTxtBufferToText,
  parseDocxBufferToText,
  detectDocumentType,
  extractSyllabusStructure,
} from '../services/syllabusExtractorService.js';

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * @desc Extract syllabus units & topics from uploaded syllabus PDF, TXT, or DOCX document
 * @route POST /api/syllabus/:id/extract
 * @access Private
 */
export async function extractSyllabus(req, res) {
  const subjectId = req.params.id;
  const userId = req.user?._id?.toString();

  console.info('[SYLLABUS] Request received', { subjectId, userId });

  try {
    const subject = await Subject.findOne({
      _id: subjectId,
      user: req.user._id,
    });
    if (!subject) {
      console.warn('[SYLLABUS] returning 404 because: Subject not found', { subjectId });
      return res.status(404).json({ success: false, message: 'Subject not found' });
    }

    const syllabusFile = subject.syllabusFile || {};
    if (!syllabusFile.url) {
      console.warn('[SYLLABUS] returning 400 because: No syllabus file URL on subject', { subjectId });
      return res.status(400).json({
        success: false,
        message: 'Syllabus document has not been uploaded for this subject.',
      });
    }

    console.info('[SYLLABUS] file/url:', syllabusFile.url);
    console.info('[SYLLABUS] mime:', syllabusFile.mimeType || 'unknown');
    console.info('[SYLLABUS] originalName:', syllabusFile.originalName || 'unknown');

    let response;
    try {
      response = await fetch(syllabusFile.url);
    } catch (error) {
      console.error('[SYLLABUS] Document fetch request failed', {
        subjectId,
        url: syllabusFile.url,
        message: error.message,
      });
      throw new HttpError(502, 'Could not download syllabus document from storage.');
    }

    if (!response.ok) {
      console.error('[SYLLABUS] Storage response not OK', {
        status: response.status,
        statusText: response.statusText,
      });
      throw new HttpError(
        502,
        `Could not download syllabus document from storage (${response.status} ${response.statusText}).`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      console.error('[SYLLABUS] Storage returned HTML error page instead of document', { contentType });
      throw new HttpError(502, 'Storage returned an invalid response instead of the document file.');
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.info('[SYLLABUS] PDF buffer size:', buffer.length, 'bytes');

    if (!buffer.length) {
      console.warn('[SYLLABUS] returning 502 because: Downloaded document is empty');
      throw new HttpError(502, 'Downloaded syllabus document is empty.');
    }

    const docType = detectDocumentType(buffer, syllabusFile.originalName, syllabusFile.mimeType);
    console.info('[SYLLABUS] document type:', docType);

    if (docType === 'unsupported') {
      console.warn('[SYLLABUS] returning 400 because: Unsupported document format');
      throw new HttpError(400, 'Please upload a PDF, TXT, or DOCX syllabus file.');
    }

    let text = '';
    try {
      if (docType === 'pdf') {
        text = await parsePdfBufferToText(buffer);
      } else if (docType === 'docx') {
        text = await parseDocxBufferToText(buffer);
      } else if (docType === 'txt') {
        text = parseTxtBufferToText(buffer);
      }
    } catch (error) {
      console.error('[SYLLABUS] Document text parsing failed', {
        subjectId,
        docType,
        message: error.message,
      });
      if (docType === 'docx') {
        throw new HttpError(422, 'Could not read the DOCX syllabus file format.');
      } else if (docType === 'txt') {
        throw new HttpError(422, 'Could not read the TXT syllabus file encoding.');
      } else {
        throw new HttpError(422, 'Could not extract readable text from PDF.');
      }
    }

    console.info('[SYLLABUS] extracted text length:', text.length);
    if (text.length > 0) {
      console.info('[SYLLABUS] sample text preview:', text.substring(0, 200).replace(/\s+/g, ' '));
    }

    if (!text || text.trim().length < 20) {
      console.warn('[SYLLABUS] returning 422 because: Extracted text length < 20 characters (empty or scanned/image-only PDF)');
      return res.status(422).json({
        success: false,
        message: 'Could not extract readable text from this document. If this is a scanned image PDF, please provide a text-based document.',
      });
    }

    const extractionResult = extractSyllabusStructure(text);
    const { courseName, courseCode, theoryUnits, labExperiments, units, hasTheory, hasLab } = extractionResult;

    console.info('[SYLLABUS] extractor result:', {
      courseName,
      courseCode,
      hasTheory,
      hasLab,
      theoryUnitCount: theoryUnits?.length || 0,
      labExperimentCount: labExperiments?.length || 0,
      totalUnits: units?.length || 0,
      topicCount: units?.reduce((sum, u) => sum + (u.topics?.length || 0), 0) || 0,
    });

    if (!units || units.length === 0) {
      console.warn('[SYLLABUS] returning 422 because: 0 units detected by structural extractor');
      return res.status(422).json({
        success: false,
        message: 'Could not detect syllabus units or laboratory experiments from this document. Please ensure the document contains numbered units, modules, or experiment sections.',
      });
    }

    const formattedTheoryUnits = (theoryUnits || []).map((u) => ({
      unitNumber: u.unitNumber,
      unitName: u.unitName,
      name: u.unitName,
      topics: u.topics.map((t) => ({
        title: t.title,
        name: t.title,
        confidence: t.confidence || 0.95,
      })),
    }));

    const formattedLabExperiments = (labExperiments || []).map((e) => ({
      experimentNumber: e.experimentNumber,
      title: e.title,
      name: e.title,
      confidence: e.confidence || 0.95,
    }));

    // Map units for frontend compatibility (supports both name/unitName and topics name/title)
    const formattedUnits = units.map((u) => ({
      unitNumber: u.unitNumber,
      unitName: u.unitName,
      name: u.unitName,
      topics: u.topics.map((t) => ({
        title: t.title,
        name: t.title,
        confidence: t.confidence || 0.95,
      })),
    }));

    console.info('[SYLLABUS] Completed successfully', {
      subjectId,
      docType,
      courseName,
      courseCode,
      hasTheory,
      hasLab,
      theoryUnitCount: formattedTheoryUnits.length,
      labExperimentCount: formattedLabExperiments.length,
      totalUnits: formattedUnits.length,
      topicCount: formattedUnits.reduce((sum, unit) => sum + unit.topics.length, 0),
    });

    res.json({
      success: true,
      data: {
        courseName,
        courseCode,
        hasTheory,
        hasLab,
        theoryUnits: formattedTheoryUnits,
        labExperiments: formattedLabExperiments,
        units: formattedUnits,
      },
    });
  } catch (error) {
    if (error instanceof HttpError) {
      console.error('[SYLLABUS] Handled failure', {
        statusCode: error.statusCode,
        message: error.message,
      });
      return res
        .status(error.statusCode)
        .json({ success: false, message: error.message });
    }

    console.error('[SYLLABUS] Unexpected failure', {
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
 * @route POST /api/syllabus/:id/confirm
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
    console.error('Confirm error:', error);
    res.status(500).json({ success: false, message: 'Failed to save syllabus' });
  }
}
