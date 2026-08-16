import Subject from '../models/Subject.js';
import Unit from '../models/Unit.js';
import Topic from '../models/Topic.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

export async function extractSyllabus(req, res) {
  try {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.user._id });
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found' });

    const { fileData } = req.body;
    if (!fileData || !fileData.url) {
      return res.status(400).json({ success: false, message: 'Syllabus file data is required' });
    }

    const response = await fetch(fileData.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF from URL: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdfData = await pdfParse(buffer);
    const text = pdfData.text;

    if (!text || text.trim().length < 50) {
      return res.status(422).json({ 
        success: false, 
        message: 'This PDF appears to be scanned or image-based.',
        scanned: true
      });
    }

    // Parsing Logic tailored for SRM AP
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const units = [];
    let currentUnit = null;
    let pendingTopic = '';

    const pushPendingTopic = () => {
      if (pendingTopic && currentUnit) {
        let cleaned = pendingTopic.replace(/[\d\s,]+$/, '').trim(); // remove trailing metadata "3 3 1,2"
        cleaned = cleaned.replace(/^[-•*o]\s*/, '').trim(); // remove leading dashes
        if (cleaned.length > 2) {
          currentUnit.topics.push({ name: cleaned });
        }
        pendingTopic = '';
      }
    };

    const unitRegex = /^UNIT\s+(\d+)(?:\s*(?:—|-|:)\s*(.*))?/i;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.match(/Course Utilization Plan – Lab/i) || line.match(/Total theory contact hours/i) || line.match(/Total Contact Hours/i)) {
        break; // Stop parsing at Lab or end of Theory
      }

      const unitMatch = line.match(unitRegex);
      if (unitMatch) {
        pushPendingTopic();
        const uNum = unitMatch[1];
        let uName = unitMatch[2] ? unitMatch[2].trim() : '';
        
        if (!uName && i + 1 < lines.length && !lines[i+1].match(unitRegex) && !lines[i+1].match(/contact hours/i)) {
          uName = lines[i+1];
        }

        currentUnit = {
          name: `UNIT ${uNum} - ${uName || 'Title'}`,
          topics: []
        };
        units.push(currentUnit);
        continue;
      }

      if (currentUnit) {
        if (line.match(/contact hours/i) || line.match(/^Topics:/i) || line.match(/Unit No./i) || line.match(/CLOs/i)) {
          continue; // ignore table headers and metadata
        }

        const isNewTopic = line.match(/^[-•*o]/);
        if (isNewTopic) {
          pushPendingTopic();
          pendingTopic = line;
        } else {
          if (!pendingTopic) {
            pendingTopic = line;
          } else {
            pendingTopic += ' ' + line;
          }
        }
      }
    }
    pushPendingTopic();

    if (units.length === 0) {
      return res.status(422).json({ success: false, message: 'Could not detect syllabus structure from this PDF.' });
    }

    res.json({ success: true, data: { units } });
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

    // Insert Units and Topics
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
        let topicOrder = 0;
        for (const t of u.topics) {
          topicOrder++;
          await Topic.create({
            user: req.user._id,
            subject: subject._id,
            unit: unitDoc._id,
            title: t.name,
            status: 'not-started',
            importance: 'medium',
            order: topicOrder
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
