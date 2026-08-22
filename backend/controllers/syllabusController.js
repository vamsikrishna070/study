import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import Topic from '../models/Topic.js';
import {
  parsePdfBufferToText,
  extractSyllabusStructure,
} from '../services/syllabusExtractorService.js';

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * @desc Extract syllabus units & topics from uploaded syllabus PDF
 * @route POST /api/syllabus/:id/extract
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
        message: 'Syllabus PDF has not been uploaded for this subject.',
      });
    }

    let response;
    try {
      response = await fetch(syllabusFile.url);
    } catch (error) {
      console.error('[SyllabusExtract] PDF fetch request failed', {
        subjectId,
        message: error.message,
      });
      throw new HttpError(502, 'Could not download syllabus PDF from storage.');
    }

    if (!response.ok) {
      throw new HttpError(
        502,
        `Could not download syllabus PDF from storage (${response.status} ${response.statusText}).`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!buffer.length) {
      throw new HttpError(502, 'Downloaded syllabus PDF is empty.');
    }

    // Verify PDF signature (%PDF-)
    const signature = buffer.subarray(0, 4).toString('utf8');
    if (signature !== '%PDF') {
      throw new HttpError(400, 'Uploaded file is not a valid PDF.');
    }

    let text = '';
    try {
      text = await parsePdfBufferToText(buffer);
    } catch (error) {
      console.error('[SyllabusExtract] PDF text parsing failed', {
        subjectId,
        message: error.message,
      });
      throw new HttpError(500, 'Unexpected PDF parsing error.');
    }

    if (!text || text.trim().length < 30) {
      return res.status(422).json({
        success: false,
        message: 'Could not extract readable text from PDF.',
      });
    }

    const extractionResult = extractSyllabusStructure(text);
    const { courseName, courseCode, units } = extractionResult;

    if (!units || units.length === 0) {
      return res.status(422).json({
        success: false,
        message: 'Could not detect theory syllabus structure from this PDF.',
      });
    }

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

    console.info('[SyllabusExtract] Completed', {
      subjectId,
      courseName,
      courseCode,
      unitCount: formattedUnits.length,
      topicCount: formattedUnits.reduce((sum, unit) => sum + unit.topics.length, 0),
    });

    res.json({
      success: true,
      data: {
        courseName,
        courseCode,
        units: formattedUnits,
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
