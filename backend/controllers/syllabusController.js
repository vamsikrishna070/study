import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import Topic from '../models/Topic.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Dummy fetch because node 18+ has native fetch
export async function extractSyllabus(req, res) {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    const { fileData } = req.body;
    if (!fileData || !fileData.url) {
      return res.status(400).json({ success: false, message: 'Syllabus file data is required' });
    }

    // Save to subject
    subject.syllabusFile = fileData;
    await subject.save();

    // Fetch PDF from Cloudinary URL
    const response = await fetch(fileData.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Extract text
    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length < 50) {
      return res.status(422).json({ 
        success: false, 
        message: 'This PDF appears to be scanned or contains no extractable text. Text extraction was not sufficient.',
        scanned: true
      });
    }

    // Very naive pattern matching to find Units and Topics
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const units = [];
    let currentUnit = null;

    const unitRegex = /^(UNIT|MODULE|CHAPTER)\s+([IVXLCDM\d]+|ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN)(?:[\s\-\:]+)?(.*)?$/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const unitMatch = line.match(unitRegex);

      if (unitMatch) {
        let title = unitMatch[3] ? unitMatch[3].trim() : '';
        if (!title && i + 1 < lines.length && !lines[i+1].match(unitRegex)) {
          // Sometimes title is on the next line
          title = lines[i+1];
        }

        currentUnit = {
          name: `${unitMatch[1]} ${unitMatch[2]}`.toUpperCase() + (title ? ` - ${title}` : ''),
          topics: []
        };
        units.push(currentUnit);
      } else if (currentUnit) {
        // Assume non-unit lines are potential topics if they look somewhat like it
        // E.g., "1.1 Introduction", "• Concept A", or just regular lines.
        // We'll skip lines that are too long (probably paragraph text).
        if (line.length < 150) {
          // If it's a list item or starts with numbers
          const topicClean = line.replace(/^[\d\.\-\•\*\s]+/, '').trim();
          if (topicClean.length > 3) {
            currentUnit.topics.push({ name: topicClean });
          }
        }
      }
    }

    // Filter out units with no topics or topics that are obviously garbage
    const cleanUnits = units.map(u => ({
      name: u.name,
      topics: [...new Set(u.topics)].slice(0, 15) // max 15 topics to avoid crazy extraction
    })).filter(u => u.topics.length > 0);

    res.json({ success: true, data: { units: cleanUnits } });
  } catch (error) {
    console.error('Syllabus extraction error:', error);
    res.status(500).json({ success: false, message: 'Failed to extract syllabus' });
  }
}

export async function confirmSyllabus(req, res) {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    const { units } = req.body;
    if (!units || !Array.isArray(units)) {
      return res.status(400).json({ success: false, message: 'Units array is required' });
    }

    // Bulk create
    let unitOrder = 0;
    for (const u of units) {
      unitOrder++;
      const unitDoc = await Unit.create({
        user: req.user._id,
        subject: subject._id,
        title: u.name,
        order: unitOrder
      });

      if (u.topics && Array.isArray(u.topics)) {
        for (const t of u.topics) {
          await Topic.create({
            user: req.user._id,
            subject: subject._id,
            unit: unitDoc._id,
            title: t.name,
            status: 'not-started',
            importance: 'medium'
          });
        }
      }
    }

    res.json({ success: true, message: 'Syllabus successfully saved' });
  } catch (error) {
    console.error('Syllabus confirmation error:', error);
    res.status(500).json({ success: false, message: 'Failed to save syllabus' });
  }
}
