import { createRequire } from 'module';
const require = createRequire(import.meta.url);

let pdfParseLegacy;
let PDFParseClass;

try {
  const pdfParseModule = require('pdf-parse');
  if (typeof pdfParseModule === 'function') {
    pdfParseLegacy = pdfParseModule;
  }
  if (typeof pdfParseModule?.default === 'function') {
    pdfParseLegacy = pdfParseModule.default;
  }
  if (typeof pdfParseModule?.PDFParse === 'function') {
    PDFParseClass = pdfParseModule.PDFParse;
  }
} catch (error) {
  console.error('[SyllabusExtractor] Failed to load pdf-parse module:', error.message);
}

/**
 * Parses raw text from PDF buffer using the appropriate pdf-parse instance
 */
export async function parsePdfBufferToText(buffer) {
  if (typeof pdfParseLegacy === 'function') {
    const parsed = await pdfParseLegacy(buffer);
    return parsed?.text || '';
  }

  if (typeof PDFParseClass === 'function') {
    const parser = new PDFParseClass({ data: buffer });
    try {
      const parsed = await parser.getText();
      return parsed?.text || '';
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  }

  throw new Error('No compatible PDF parser available.');
}

/**
 * Converts Roman numerals (I, II, III, IV, V, VI, etc.) to Arabic integers
 */
export function romanToArabic(roman) {
  if (!roman || typeof roman !== 'string') return null;
  const map = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  const str = roman.trim().toUpperCase();
  let result = 0;
  for (let i = 0; i < str.length; i++) {
    const curr = map[str[i]];
    const next = map[str[i + 1]];
    if (!curr) return null;
    if (next && next > curr) {
      result += next - curr;
      i++;
    } else {
      result += curr;
    }
  }
  return result > 0 ? result : null;
}

/**
 * Parses unit number from string (Arabic or Roman)
 */
export function parseUnitNumber(str, defaultNum = 1) {
  if (!str) return defaultNum;
  const clean = str.replace(/^unit\s*/i, '').trim();
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0) return num;
  const roman = romanToArabic(clean);
  if (roman !== null) return roman;
  return defaultNum;
}

/**
 * Contextual OCR and formatting cleanup for known PDF artifacts
 */
export function cleanOcrTypo(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\bEven Handling\b/gi, 'Event Handling')
    .replace(/\bFileIntputStream\b/gi, 'FileInputStream')
    .replace(/\bUsingWildcardArguments\b/gi, 'Using Wildcard Arguments')
    .replace(/\bCreatingGenericMethod\b/gi, 'Creating Generic Method')
    .replace(/\bGenericClassHierarchies\b/gi, 'Generic Class Hierarchies')
    .replace(/\bJavaFxBasicConcept\b/gi, 'JavaFX Basic Concepts')
    .replace(/\bAJavaFXApplicationSkeleton\b/gi, 'A JavaFX Application Skeleton')
    .replace(/\bSimple javaFXControl\b/gi, 'Simple JavaFX Controls')
    .replace(/\bExploringJavaFXControls\b/gi, 'Exploring JavaFX Controls')
    .replace(/\bEffectsand Transforms\b/gi, 'Effects and Transforms')
    .replace(/\bIntroductiontoJavaFXMenusAnOverviewof\b/gi, 'Introduction to JavaFX Menus, An Overview of')
    .replace(/\bAddImagetoMenuItem\b/gi, 'Add Image to MenuItem')
    .replace(/\bCreating MenuandToolbar\b/gi, 'Creating Menu and Toolbar')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Identifies if a line is a reference, grading rubric, header/footer, or metadata
 */
export function isReferenceOrJunk(line) {
  if (!line || typeof line !== 'string') return true;
  const trimmed = line.trim();
  if (trimmed.length < 2) return true;

  if (/https?:\/\//i.test(trimmed)) return true;
  if (/^--\s*\d+\s*of\s*\d+\s*--$/i.test(trimmed)) return true;
  if (/^(?:Course\s+Unitization\s+Plan\s*\(Lab\)|Course\s+Utilization\s+Plan\s*[–-]\s*Lab)/i.test(trimmed)) return true;
  if (/^(?:Unit\s*No\.?|Unit\s*Name|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?)$/i.test(trimmed)) return true;
  if (/^(?:Learning\s+Assessment|Recommended\s+Resources|Other\s+Resources|Bloom’s\s+Level|Course\s+Designers|Internal\s+Continuous|External\s+Evaluation|CLA-I|Mid-I|Lab\s+Performance|Cognitive\s+Task)/i.test(trimmed)) return true;
  if (/^(?:Level-\d|Remember|Understand|Apply|Analyse|Evaluate)\s+/i.test(trimmed)) return true;
  if (/^(?:Theory\s*\(\d+%\)|Practical\s*\(\d+%\)|External\s*Theory|External\s*Lab)/i.test(trimmed)) return true;
  if (/\b(?:edition|McGraw\s*Hill|Pearson|OReilly|Prentice\s*Hall|Cengage|Nerd\s*Ranch|Oracle\s*Press)\b/i.test(trimmed)) return true;
  if (/^(?:\d+\.\s+)?(?:Mr\.|Ms\.|Dr\.|Prof\.)\s+[A-Z]/i.test(trimmed)) return true;
  if (/^\d+\.\s+[A-Z][a-z]+.*(?:\(\d{4}\)|\d{4})/i.test(trimmed)) return true;
  if (/^Total\s+(?:Theory\s+|Lab\s+)?Contact\s+Hours?/i.test(trimmed)) return true;
  return false;
}

/**
 * Structure-aware syllabus extractor
 * @param {string} rawText Raw extracted text from PDF
 * @returns {{ courseName: string, courseCode: string, units: Array<{ unitNumber: number, unitName: string, topics: Array<{ title: string, confidence: number }> }> }}
 */
export function extractSyllabusStructure(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { courseName: '', courseCode: '', units: [] };
  }

  const lines = rawText
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Extract Course Name and Course Code from content (never from filename)
  let courseName = '';
  let courseCode = '';

  for (let i = 0; i < Math.min(lines.length, 35); i++) {
    const line = lines[i];
    const codeMatch = line.match(/Course\s+Code\s*:?\s*([A-Z]{2,5}\s*\d{2,4}[A-Z]?)/i);
    if (codeMatch && !courseCode) {
      courseCode = codeMatch[1].replace(/\s+/g, ' ').trim();
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j];
        if (
          !/SRM|University|Neerukonda|Mandal|District|Andhra|522240|Department|Category|Semester|Credit/i.test(
            prev
          ) &&
          prev.length > 3
        ) {
          courseName = prev.replace(/\s{2,}/g, ' ').trim();
          break;
        }
      }
    }
  }

  // 2. Structural Parsing
  const UNIT_HEADER_REGEX = /^(?:UNIT|Unit|MODULE|Module|CHAPTER|Chapter)\s*([0-9IVXLCDM]+)\s*[:-]?\s*(.*)$/i;
  const TABLE_HEADER_REGEX = /^(?:Unit\s*No\.?|Unit\s*Name|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?)$/i;
  const PAGE_NUMBER_REGEX = /^--\s*\d+\s*of\s*\d+\s*--$/i;
  const LAB_START_REGEX = /Course\s+Unitization\s+Plan\s*\(?(?:Lab|Laboratory)\)?|Course\s+Utilization\s+Plan\s*[–-]?\s*Lab|PART\s*\d+:\s*ASM/i;

  let inTheory = false;
  const units = [];
  let currentUnit = null;
  let pendingLines = [];

  const processPendingLines = () => {
    if (!currentUnit || pendingLines.length === 0) return;

    let buffer = '';
    for (const rawLine of pendingLines) {
      if (isReferenceOrJunk(rawLine) || TABLE_HEADER_REGEX.test(rawLine) || PAGE_NUMBER_REGEX.test(rawLine)) {
        continue;
      }

      // Check if line ends with table metadata columns (e.g. 1 1 1,2 or 2 4 3 or 1 4 1,3)
      const hasTableCols = /\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)+$/.test(rawLine);
      const isStandaloneTableCell = /^\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/.test(rawLine);

      if (isStandaloneTableCell) {
        if (buffer) {
          let cleaned = buffer
            .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, '')
            .replace(/\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/, '')
            .replace(/^\d+[.)\]:-]?\s+/, '')
            .replace(/^[-*•o]\s*/, '')
            .replace(/\s{2,}/g, ' ')
            .trim();

          cleaned = cleanOcrTypo(cleaned);

          if (cleaned.length > 2 && !TABLE_HEADER_REGEX.test(cleaned) && !isReferenceOrJunk(cleaned)) {
            if (!currentUnit.topics.some((t) => t.title.toLowerCase() === cleaned.toLowerCase())) {
              currentUnit.topics.push({
                title: cleaned,
                confidence: 0.95,
              });
            }
          }
          buffer = '';
        }
        continue;
      }

      if (buffer) {
        buffer += ' ' + rawLine;
      } else {
        buffer = rawLine;
      }

      if (hasTableCols) {
        let cleaned = buffer
          .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, '')
          .replace(/\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/, '')
          .replace(/^\d+[.)\]:-]?\s+/, '')
          .replace(/^[-*•o]\s*/, '')
          .replace(/\s{2,}/g, ' ')
          .trim();

        cleaned = cleanOcrTypo(cleaned);

        if (cleaned.length > 2 && !TABLE_HEADER_REGEX.test(cleaned) && !isReferenceOrJunk(cleaned)) {
          if (!currentUnit.topics.some((t) => t.title.toLowerCase() === cleaned.toLowerCase())) {
            currentUnit.topics.push({
              title: cleaned,
              confidence: 0.95,
            });
          }
        }
        buffer = '';
      }
    }

    if (buffer) {
      let cleaned = buffer
        .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, '')
        .replace(/\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/, '')
        .replace(/^\d+[.)\]:-]?\s+/, '')
        .replace(/^[-*•o]\s*/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      cleaned = cleanOcrTypo(cleaned);

      if (cleaned.length > 2 && !TABLE_HEADER_REGEX.test(cleaned) && !isReferenceOrJunk(cleaned)) {
        if (!currentUnit.topics.some((t) => t.title.toLowerCase() === cleaned.toLowerCase())) {
          currentUnit.topics.push({
            title: cleaned,
            confidence: 0.95,
          });
        }
      }
    }

    pendingLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (PAGE_NUMBER_REGEX.test(line)) continue;

    if (LAB_START_REGEX.test(line)) {
      // Exclude laboratory & practical experiments from theory syllabus
      inTheory = false;
      break;
    }

    if (/Course\s+Unitization\s+Plan\s*\(?Theory\)?/i.test(line)) {
      inTheory = true;
      continue;
    }

    const unitMatch = line.match(UNIT_HEADER_REGEX);
    if (unitMatch) {
      inTheory = true;
      processPendingLines();
      const rawNum = unitMatch[1];
      const unitNumber = parseUnitNumber(rawNum, units.length + 1);
      let rawTitle = (unitMatch[2] || '').trim();
      // Remove trailing contact hours or numbers from unit title
      rawTitle = rawTitle.replace(/\s+\d+(?:\s+\d+)*\s*$/, '').trim();
      rawTitle = cleanOcrTypo(rawTitle);

      currentUnit = {
        unitNumber,
        unitName: rawTitle || `Unit ${unitNumber}`,
        topics: [],
      };
      units.push(currentUnit);
      continue;
    }

    if (!inTheory || !currentUnit) continue;

    pendingLines.push(line);
  }

  processPendingLines();

  return {
    courseName,
    courseCode,
    units: units.filter((u) => u.topics.length > 0),
  };
}
