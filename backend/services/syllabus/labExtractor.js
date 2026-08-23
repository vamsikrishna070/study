/**
 * Laboratory Experiment Extraction Module.
 * Extracts laboratory experiments and practical tasks independently from theory units.
 */

import { cleanOcrTypo } from './normalizer.js';

const TABLE_HEADER_WORDS = [
  'exp',
  'no',
  'experiment',
  'name',
  'required',
  'contact',
  'hours',
  'clos',
  'addressed',
  'references',
  'used',
  'sl',
  'program',
  'lecture',
  'period',
  'marks',
  'credits',
  'pa',
  'clo',
  'co',
  'conta',
  'ct',
  'hour',
  's',
  'reference',
  'plan',
  'unitization',
  'utilization',
];

/**
 * Identifies if a line is composed predominantly of table column header words.
 */
function isTableHeaderLine(line) {
  if (!line || typeof line !== 'string') return true;
  const words = line.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const headerWordCount = words.filter((w) => TABLE_HEADER_WORDS.includes(w)).length;
  return headerWordCount / words.length >= 0.4;
}

/**
 * Cleans an individual lab experiment title.
 */
function cleanExperimentTitle(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text
    .replace(/^(?:Exp(?:eriment)?\.?\s*(?:No\.?)?\s*\d+[:.\-–—]?|\bProgram\s*\d+[:.\-–—]?|\d+[.)\]:-]?\s*)/i, '')
    .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, '')
    .replace(/\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)+$/, '')
    .replace(/(?:Course\s+Unit(?:ization|isation)\s+Plan\s*[-–—]?\s*(?:Theory|Lab)?).*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  cleaned = cleanOcrTypo(cleaned);
  return cleaned;
}

/**
 * Extracts structured lab experiments from segmented lab section lines.
 * @param {string[]} labLines
 * @returns {Array<{ experimentNumber: number, title: string, name: string, confidence: number }>}
 */
export function extractLabExperiments(labLines) {
  if (!labLines || labLines.length === 0) return [];

  const experiments = [];
  let currentBuffer = '';
  let currentExpNumber = 0;

  // Matches "Exp 1", "Exp. No. 1", "Experiment 1", "Program 1", "1. Title", "1 Title", or standalone "1"
  const EXP_START_REGEX = /^(?:Exp(?:eriment)?\.?\s*(?:No\.?)?\s*(\d+)|\bProgram\s*(\d+)|^(\d+)(?:\s*[:.\-–—]|\s+|$))/i;
  const ACTION_START_REGEX = /^(?:Write\s+a\s+program|Implement\s+|Design\s+|Build\s+|Given\s+a\s+dataset|Installation\s+of|Introduction\s+to\s+Python|Machine\s+Learning\s+packages)\b/;

  const flushBuffer = () => {
    if (!currentBuffer) return;
    if (isTableHeaderLine(currentBuffer)) {
      currentBuffer = '';
      return;
    }

    const cleanTitle = cleanExperimentTitle(currentBuffer);
    const alphaCount = (cleanTitle.match(/[a-zA-Z]/g) || []).length;

    if (alphaCount >= 4 && !isTableHeaderLine(cleanTitle)) {
      // Deduplicate case-insensitively
      const exists = experiments.some((e) => e.title.toLowerCase() === cleanTitle.toLowerCase());
      if (!exists) {
        experiments.push({
          experimentNumber: currentExpNumber || (experiments.length + 1),
          title: cleanTitle,
          name: cleanTitle,
          confidence: 0.95,
        });
      }
    }
    currentBuffer = '';
  };

  for (let i = 0; i < labLines.length; i++) {
    const line = labLines[i].trim();
    if (!line || isTableHeaderLine(line)) continue;

    // Skip table column number rows (e.g. "2 4 4" or "2 5 3, 9" or "4 1, 2 5" or standalone "30")
    if (/^\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)+$/.test(line) || /^Total\s+(?:Contact\s+)?Hours/i.test(line)) {
      continue;
    }

    // Skip standalone numbers if they look like contact hours (e.g. "30", "45", "100%")
    if (/^(?:30|45|50|60|100%?)$/.test(line)) {
      continue;
    }

    const startMatch = line.match(EXP_START_REGEX);
    const isNumberedStart = Boolean(startMatch);

    if (isNumberedStart) {
      flushBuffer();
      const numStr = startMatch[1] || startMatch[2] || startMatch[3];
      currentExpNumber = parseInt(numStr, 10) || (experiments.length + 1);
      const remainder = line.replace(EXP_START_REGEX, '').trim();
      currentBuffer = remainder;
    } else if (
      ACTION_START_REGEX.test(line) &&
      currentBuffer.length > 30 &&
      !/(?:to|for|in|the|a|an|and|of|with|by|on)$/i.test(currentBuffer.trim())
    ) {
      flushBuffer();
      currentExpNumber = currentExpNumber + 1;
      currentBuffer = line;
    } else {
      // Continuation of previous experiment description
      if (currentBuffer) {
        currentBuffer += ` ${line}`;
      } else {
        currentBuffer = line;
      }
    }
  }

  flushBuffer();

  return experiments;
}
