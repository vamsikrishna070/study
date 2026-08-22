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
 * Converts English number words (First, Second, Third, Fourth, Fifth...) to integers
 */
export function wordToNumber(word) {
  if (!word || typeof word !== 'string') return null;
  const map = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
  };
  const clean = word.trim().toLowerCase();
  return map[clean] || null;
}

/**
 * Parses unit number from string (Arabic, Roman, or Word)
 */
export function parseUnitNumber(str, defaultNum = 1) {
  if (!str) return defaultNum;
  const clean = str.replace(/^(?:unit|module|chapter|section|part|block)\s*[:.\-–—]?\s*/i, '').trim();
  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0) return num;
  const roman = romanToArabic(clean);
  if (roman !== null) return roman;
  const wordNum = wordToNumber(clean);
  if (wordNum !== null) return wordNum;
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
  if (/^--\s*\d+\s*(?:of\s*\d+)?\s*--$/i.test(trimmed)) return true;
  if (/^Page\s+\d+(?:\s+of\s+\d+)?$/i.test(trimmed)) return true;
  if (/^\d+\s*\/\s*\d+$/i.test(trimmed)) return true;

  // Lab and non-theory sections
  if (/^(?:Course\s+Unitization\s+Plan\s*\(Lab\)|Course\s+Utilization\s+Plan\s*[–-]\s*Lab|PART\s*\d*:\s*ASM|LIST\s+OF\s+EXPERIMENTS|LABORATORY\s+EXPERIMENTS)/i.test(trimmed)) return true;

  // Table header artifacts
  if (/^(?:Unit\s*No\.?|Unit\s*Name|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?|S\.No\.?|Hours?|Lecture\s*Hours?|Period|Marks?|Credits?|L\s*T\s*P\s*C)$/i.test(trimmed)) return true;

  // Evaluation, Bloom's, Course Outcomes, Designers, Assessments
  if (/^(?:Learning\s+Assessment|Recommended\s+Resources|Other\s+Resources|Bloom’s\s+Level|Course\s+Designers|Internal\s+Continuous|External\s+Evaluation|CLA-I|Mid-I|Lab\s+Performance|Cognitive\s+Task|Course\s+Objectives?|Course\s+Outcomes?|Program\s+Outcomes?|CO-PO\s+Mapping|Assessment\s+Pattern|Evaluation\s+Pattern|Marks\s+Distribution|Question\s+Paper\s+Pattern|Continuous\s+Internal\s+Assessment)/i.test(trimmed)) return true;
  if (/^(?:Level-\d|Remember|Understand|Apply|Analyse|Evaluate|Create)\s+/i.test(trimmed)) return true;
  if (/^(?:CO\d|PO\d|PSO\d)\s*[:.\-]/i.test(trimmed)) return true;
  if (/^(?:Theory\s*\(\d+%\)|Practical\s*\(\d+%\)|External\s*Theory|External\s*Lab)/i.test(trimmed)) return true;

  // Textbooks, Publishers, Authors, Online resources
  if (/^(?:Text\s*Books?|Reference\s*Books?|Suggested\s*Readings?|References?|Prescribed\s*Books?|Web\s*Resources?|Online\s*Resources?|MOOCs?|NPTEL(?:\s*Courses?)?|E-Books?|Self\s*Learning\s*Material)\s*[:-]?/i.test(trimmed)) return true;
  if (/\b(?:edition|McGraw\s*Hill|Pearson|OReilly|Prentice\s*Hall|Cengage|Nerd\s*Ranch|Oracle\s*Press|Wiley|Oxford\s*University\s*Press|Springer|PHI\s*Learning)\b/i.test(trimmed)) return true;
  if (/^(?:\d+\.\s+)?(?:Mr\.|Ms\.|Dr\.|Prof\.)\s+[A-Z]/i.test(trimmed)) return true;
  if (/^\d+\.\s+[A-Z][a-z]+.*(?:\(\d{4}\)|\d{4})/i.test(trimmed)) return true;
  if (/^Total\s+(?:Theory\s+|Lab\s+)?Contact\s+Hours?/i.test(trimmed)) return true;

  // Standalone numbers or dates or isolated punctuation
  if (/^[\d.,\s;:/\-_()]+$/.test(trimmed) && !/[a-zA-Z]/.test(trimmed)) return true;

  return false;
}

/**
 * Checks if a section header indicates the end of theory syllabus
 */
export function isNonTheorySectionHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  return (
    /^(?:Text\s*Books?|Reference\s*Books?|References|Suggested\s*Readings?|Prescribed\s*Books?|Web\s*Resources?|Online\s*Resources?|MOOCs?|NPTEL|E-Books?|Self\s*Learning\s*Material)\s*[:-]?$/i.test(trimmed) ||
    /^(?:Course\s+Unitization\s+Plan\s*\(Lab\)|Course\s+Utilization\s+Plan\s*[–-]\s*Lab|PART\s*\d*:\s*ASM|LIST\s+OF\s+EXPERIMENTS|LABORATORY\s+EXPERIMENTS)/i.test(trimmed) ||
    /^(?:Course\s+Outcomes?|Program\s+Outcomes?|CO-PO\s+Mapping|Bloom’s\s+Level\s+of\s+Cognitive\s+Task|Assessment\s+Pattern|Evaluation\s+Scheme|Question\s+Paper\s+Pattern|Marks\s+Distribution)/i.test(trimmed)
  );
}

/**
 * Splits a string by a delimiter character, respecting parenthetical groups (parentheses & brackets)
 */
export function splitRespectingParentheses(str, delimiter = ',') {
  if (!str || typeof str !== 'string') return [];
  const result = [];
  let current = '';
  let parenDepth = 0;
  let bracketDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (char === '(') parenDepth++;
    else if (char === ')') parenDepth = Math.max(0, parenDepth - 1);
    else if (char === '[') bracketDepth++;
    else if (char === ']') bracketDepth = Math.max(0, bracketDepth - 1);

    if (char === delimiter && parenDepth === 0 && bracketDepth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) result.push(current.trim());
  return result;
}

/**
 * Cleans a single topic title from leading bullets/numbers and trailing punctuation
 */
export function cleanTopicTitle(title) {
  if (!title || typeof title !== 'string') return '';
  let cleaned = title
    .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, '')
    .replace(/\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/, '')
    .replace(/^(?:\d+(?:\.\d+)*[.)\]:]?|[-*•o–—]|\([a-zA-Z0-9]+\)|[a-zA-Z][.)\]])\s+/, '')
    .replace(/^[-*•o–—.)\]:\s]+/, '')
    .replace(/[-*•o–—,;:\s.]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleanOcrTypo(cleaned);
}

/**
 * Splits a composite topic text (delimited by semicolons, commas, dashes, or sub-numberings) into atomic topic items
 */
export function splitCompositeTopic(text) {
  if (!text || typeof text !== 'string') return [];

  let cleaned = cleanTopicTitle(text);
  if (cleaned.length < 3 || isReferenceOrJunk(cleaned)) return [];

  // Check if text has in-line sub-numberings (e.g. "1.1 Process Concepts 1.2 Process Scheduling 1.3 Operations")
  const subNumPattern = /(?:^|\s+)(?:\d+\.\d+|\([a-zA-Z0-9]+\)|[a-zA-Z]\))\s+/g;
  const subNumMatches = [...cleaned.matchAll(subNumPattern)];
  if (subNumMatches.length >= 1) {
    const parts = [];
    if (subNumMatches[0].index > 0) {
      const firstSlice = cleanTopicTitle(cleaned.slice(0, subNumMatches[0].index));
      if (firstSlice.length > 2 && !isReferenceOrJunk(firstSlice)) {
        parts.push(firstSlice);
      }
    }
    for (let i = 0; i < subNumMatches.length; i++) {
      const start = subNumMatches[i].index + subNumMatches[i][0].length;
      const nextStart = i + 1 < subNumMatches.length ? subNumMatches[i + 1].index : cleaned.length;
      const slice = cleaned.slice(start, nextStart).trim();
      const cleanedSlice = cleanTopicTitle(slice);
      if (cleanedSlice.length > 2 && !isReferenceOrJunk(cleanedSlice)) {
        parts.push(cleanedSlice);
      }
    }
    if (parts.length >= 2) {
      return parts;
    }
  }

  // Check if text has multiple topics separated by semicolons (e.g. "Topic 1; Topic 2; Topic 3")
  if (cleaned.includes(';')) {
    const parts = splitRespectingParentheses(cleaned, ';')
      .map(cleanTopicTitle)
      .filter((p) => p.length > 2 && !isReferenceOrJunk(p));
    if (parts.length > 1) {
      return parts;
    }
  }

  // Check if text is a colon-led category with comma-separated topics
  // e.g. "Process Management: Process Concepts, CPU Scheduling, Operations on Processes"
  const colonMatch = cleaned.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    const category = cleanTopicTitle(colonMatch[1]);
    const rest = colonMatch[2].trim();
    if (rest.includes(',') && !rest.toLowerCase().includes('etc.')) {
      const subItems = splitRespectingParentheses(rest, ',')
        .map(cleanTopicTitle)
        .filter((s) => s.length > 2 && !isReferenceOrJunk(s));
      if (subItems.length > 1) {
        return [
          cleanTopicTitle(`${category} - ${subItems[0]}`),
          ...subItems.slice(1),
        ];
      }
    }
  }

  // Check if text is a comma-separated paragraph with 2+ distinct topics (respecting parentheses)
  // e.g. "Main Memory Management, Contiguous Memory Allocation (Single, Multiple), Segmentation, Virtual Memory"
  const commaParts = splitRespectingParentheses(cleaned, ',');
  if (commaParts.length >= 2 && cleaned.length > 35) {
    const parts = commaParts
      .map(cleanTopicTitle)
      .filter((p) => p.length > 2 && !isReferenceOrJunk(p));
    if (parts.length >= 2) {
      return parts;
    }
  }

  return [cleaned];
}

/**
 * Structure-aware syllabus extractor supporting OBE tables, standard paragraphs, and bulleted syllabi
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

  // 1. Extract Course Name and Course Code
  let courseName = '';
  let courseCode = '';

  for (let i = 0; i < Math.min(lines.length, 45); i++) {
    const line = lines[i];

    // Pattern 1: Inline Code and Title on same line, e.g. "CS401PC: DATABASE MANAGEMENT SYSTEMS", "20CS41T: OPERATING SYSTEMS", "CS8492 - DATABASE SYSTEMS"
    const inlineMatch = line.match(/^([A-Z]{2,6}\s*[-/]?\s*\d{2,5}[A-Z]{0,3}|\d{1,4}[A-Z]{2,6}\s*[-/]?\s*[0-9A-Z]{1,5}|[A-Z0-9]{4,10})\s*[:.\-–—]\s*(.+)$/i);
    if (inlineMatch && !courseCode && !courseName && !/^(?:UNIT|MODULE|CHAPTER|PART|SECTION)\b/i.test(inlineMatch[1])) {
      const codeCand = inlineMatch[1].replace(/\s+/g, ' ').trim();
      const nameCand = inlineMatch[2]
        .replace(/^(?:Course\s+Title|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course|Course|Subject)\s*[:.\-–—]\s*/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
      if (nameCand.length > 3 && !isReferenceOrJunk(nameCand)) {
        courseCode = codeCand;
        courseName = nameCand;
        continue;
      }
    }

    // Pattern 2: Explicit "Course Code" / "Subject Code" matching (supporting formats like CSE 302, 20CS41T, CS-301)
    const codeMatch = line.match(/(?:Course|Subject)?\s*Code\s*[:.\-–—]?\s*([A-Z]{2,6}\s*[-/]?\s*\d{2,5}[A-Z]{0,3}|\d{1,4}[A-Z]{2,6}\s*[-/]?\s*[0-9A-Z]{1,5}|[A-Z0-9]{4,10})/i);
    if (codeMatch && !courseCode) {
      courseCode = codeMatch[1].replace(/\s+/g, ' ').trim();
      for (let j = i - 1; j >= 0; j--) {
        const prev = lines[j];
        if (
          !/SRM|University|Institute|College|Department|Category|Semester|Credit|Regulation|B\.?\s*Tech|M\.?\s*Tech|Andhra|Hyderabad|Tamil|Bangalore/i.test(
            prev
          ) &&
          prev.length > 3 &&
          !isReferenceOrJunk(prev)
        ) {
          courseName = prev
            .replace(/^(?:Course\s+Title|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course|Course|Subject)\s*[:.\-–—]\s*/i, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
          break;
        }
      }
    }

    // Pattern 3: Direct "Course Title" / "Subject Name" matching
    const nameMatch = line.match(/(?:Course\s+Title|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course)\s*[:.\-–—]?\s*(.+)$/i);
    if (nameMatch && !courseName) {
      courseName = nameMatch[1].replace(/\s{2,}/g, ' ').trim();
    }
  }

  // Matches: UNIT 1, UNIT I, UNIT - 1, UNIT - I, UNIT: 1, UNIT: I, FIRST UNIT, UNIT 01, MODULE 1, MODULE I, CHAPTER 1, SECTION 1, etc.
  const UNIT_HEADER_REGEX = /^(?:UNIT|Unit|MODULE|Module|CHAPTER|Chapter|SECTION|Section|PART|Part|BLOCK|Block)\s*[:.\-–—]?\s*([0-9IVXLCDM]+|[A-Za-z]+)(?:[\s:.\-–—]+(.*))?$/i;
  const WORD_UNIT_HEADER_REGEX = /^(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+(?:UNIT|Unit|MODULE|Module|CHAPTER|Chapter)\s*[:.\-–—]?(?:[\s:.\-–—]+(.*))?$/i;
  const TABLE_HEADER_REGEX = /^(?:Unit\s*No\.?|Unit\s*Name|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?)$/i;
  const PAGE_NUMBER_REGEX = /^--\s*\d+\s*(?:of\s*\d+)?\s*--$|^Page\s+\d+(?:\s+of\s+\d+)?$/i;

  let inTheory = false;
  const units = [];
  let currentUnit = null;
  let pendingLines = [];

  const addTopicToCurrentUnit = (title) => {
    if (!currentUnit || !title) return;
    const cleanTitle = cleanTopicTitle(title);
    if (cleanTitle.length < 2 || isReferenceOrJunk(cleanTitle) || TABLE_HEADER_REGEX.test(cleanTitle)) {
      return;
    }
    const alreadyExists = currentUnit.topics.some(
      (t) => t.title.toLowerCase().trim() === cleanTitle.toLowerCase().trim()
    );
    if (!alreadyExists) {
      currentUnit.topics.push({
        title: cleanTitle,
        confidence: 0.95,
      });
    }
  };

  const processPendingLines = () => {
    if (!currentUnit || pendingLines.length === 0) {
      pendingLines = [];
      return;
    }

    // Check if the lines in this unit represent an OBE table (ending with column numbers)
    const hasTableColumns = pendingLines.some((l) =>
      /\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)+$/.test(l)
    );

    if (hasTableColumns) {
      // Table row extraction
      let buffer = '';
      for (const rawLine of pendingLines) {
        if (isReferenceOrJunk(rawLine) || TABLE_HEADER_REGEX.test(rawLine) || PAGE_NUMBER_REGEX.test(rawLine)) {
          continue;
        }

        const isRowEnd = /\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)+$/.test(rawLine);
        const isStandaloneTableCell = /^\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/.test(rawLine);

        if (isStandaloneTableCell) {
          if (buffer) {
            const extracted = splitCompositeTopic(buffer);
            extracted.forEach(addTopicToCurrentUnit);
            buffer = '';
          }
          continue;
        }

        if (buffer) {
          buffer += ' ' + rawLine;
        } else {
          buffer = rawLine;
        }

        if (isRowEnd) {
          const extracted = splitCompositeTopic(buffer);
          extracted.forEach(addTopicToCurrentUnit);
          buffer = '';
        }
      }

      if (buffer) {
        const extracted = splitCompositeTopic(buffer);
        extracted.forEach(addTopicToCurrentUnit);
      }
    } else {
      // Standard syllabus (paragraph, bulleted, or line-by-line)
      let buffer = '';
      for (const rawLine of pendingLines) {
        if (isReferenceOrJunk(rawLine) || TABLE_HEADER_REGEX.test(rawLine) || PAGE_NUMBER_REGEX.test(rawLine)) {
          continue;
        }

        // Bullet point or numbered topic start
        const isBulletOrNum = /^[-*•o–—]\s+|^\d+[.)\]]\s+|^[a-zA-Z][.)]\s+|^\(\d+\)\s+|^\([a-zA-Z]\)\s+/.test(rawLine);

        if (isBulletOrNum) {
          if (buffer) {
            const extracted = splitCompositeTopic(buffer);
            extracted.forEach(addTopicToCurrentUnit);
            buffer = '';
          }
          buffer = rawLine;
        } else {
          // Check if previous line ended with complete sentence, semicolon, or colon
          if (buffer && /[.;:]$/.test(buffer)) {
            const extracted = splitCompositeTopic(buffer);
            extracted.forEach(addTopicToCurrentUnit);
            buffer = rawLine;
          } else if (buffer) {
            buffer += ' ' + rawLine;
          } else {
            buffer = rawLine;
          }
        }
      }

      if (buffer) {
        const extracted = splitCompositeTopic(buffer);
        extracted.forEach(addTopicToCurrentUnit);
      }
    }

    pendingLines = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (PAGE_NUMBER_REGEX.test(line)) continue;

    // Check for section ending (e.g. Text Books, References, Lab section)
    if (isNonTheorySectionHeader(line)) {
      if (inTheory) {
        processPendingLines();
        inTheory = false;
      }
      continue;
    }

    if (/Course\s+Unitization\s+Plan\s*\(?Theory\)?/i.test(line)) {
      inTheory = true;
      continue;
    }

    const wordUnitMatch = line.match(WORD_UNIT_HEADER_REGEX);
    const unitMatch = wordUnitMatch ? null : line.match(UNIT_HEADER_REGEX);

    if (wordUnitMatch || unitMatch) {
      inTheory = true;
      processPendingLines();

      let unitNumber;
      let rawTitle = '';

      if (wordUnitMatch) {
        unitNumber = wordToNumber(wordUnitMatch[1]) || (units.length + 1);
        rawTitle = (wordUnitMatch[2] || '').trim();
      } else {
        const rawNum = unitMatch[1];
        unitNumber = parseUnitNumber(rawNum, units.length + 1);
        rawTitle = (unitMatch[2] || '').trim();
      }

      // Strip hours from rawTitle
      rawTitle = rawTitle
        .replace(/\s*\(\s*\d+\s*(?:hours?|hrs?|lectures?|periods?)?\s*\)/i, '')
        .replace(/\s+\d+(?:\s+\d+)*\s*$/, '')
        .trim();

      // If unit title is empty or was only hours, inspect subsequent lines (skipping hours-only lines)
      if (!rawTitle && i + 1 < lines.length) {
        let peekIdx = i + 1;
        while (peekIdx < lines.length && peekIdx <= i + 2) {
          const candLine = lines[peekIdx];
          if (
            !UNIT_HEADER_REGEX.test(candLine) &&
            !WORD_UNIT_HEADER_REGEX.test(candLine) &&
            !isNonTheorySectionHeader(candLine) &&
            !TABLE_HEADER_REGEX.test(candLine)
          ) {
            // If line is just hours/contact count (e.g. "(10 Hours)" or "9 Lectures"), skip to next line
            if (/^\(?\s*\d+\s*(?:hours?|hrs?|lectures?|periods?)?\s*\)?$/i.test(candLine)) {
              peekIdx++;
              continue;
            }
            if (candLine.length < 90 && !/^\d+$/.test(candLine)) {
              rawTitle = candLine;
              i = peekIdx; // Consume up to this line
              break;
            }
          }
          break;
        }
      }

      rawTitle = rawTitle
        .replace(/\s*\(\s*\d+\s*(?:hours?|hrs?|lectures?|periods?)?\s*\)/i, '')
        .replace(/\s+\d+(?:\s+\d+)*\s*$/, '')
        .trim();
      rawTitle = cleanTopicTitle(rawTitle);

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
