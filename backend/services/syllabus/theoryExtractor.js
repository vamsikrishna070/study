

import { parseUnitNumber, cleanOcrTypo, romanToArabic } from './normalizer.js';
import { extractTheoryUnitsFromTable, isScannedTableSyllabus } from './tableExtractor.js';
import { stripMetadataColumns } from './spatialLayoutParser.js';

const TABLE_HEADER_REGEX = /^(?:Unit\s*No\.?|Unit\s*Name|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?|S\.No\.?|Hours?|Lecture\s*Hours?|Period|Marks?|Credits?|L\s*T\s*P\s*C)$/i;
const PAGE_NUMBER_REGEX = /^--\s*\d+\s*(?:of\s*\d+)?\s*--$|^Page\s+\d+(?:\s+of\s+\d+)?$|^\d+\s*\/\s*\d+$/i;

export function isReferenceOrJunk(line) {
  if (!line || typeof line !== 'string') return true;
  let trimmed = line.trim();
  if (trimmed.length < 2) return true;

  trimmed = trimmed.replace(/^[•●○▪▫➢✓\-*+o\s]+/, '').trim();
  if (trimmed.length < 2) return true;

  if (/https?:\/\//i.test(trimmed)) return true;
  if (PAGE_NUMBER_REGEX.test(trimmed)) return true;
  if (TABLE_HEADER_REGEX.test(trimmed)) return true;

  if (
    /^(?:Learning\s+Assessment|Recommended\s+Resources|Other\s+Resources|Bloom’s\s+Level|Course\s+Designers|Internal\s+Continuous|External\s+Evaluation|CLA-I|Mid-I|Lab\s+Performance|Cognitive\s+Task|Course\s+Objectives?|Course\s+Outcomes?|Program\s+Outcomes?|CO-PO\s+Mapping|Assessment\s+Pattern|Hardware\s+Requirements?|Software\s+Requirements?|System\s+Requirements?|SmartBridge\s+Educational)/i.test(
      trimmed
    )
  )
    return true;
  if (/^(?:Desktop\/Laptop|CUDA-compatible|Minimum\s+\d+GB\s+system\s+RAM|\d+\s*GB\+\s+fast\s+storage|Alternative:\s*Access\s+to\s+cloud)/i.test(trimmed)) return true;
  if (/^(?:Level-\d|Remember|Understand|Apply|Analyse|Evaluate|Create)\s+/i.test(trimmed)) return true;
  if (/^(?:CO\d|PO\d|PSO\d)\s*[:-]/i.test(trimmed)) return true;
  if (/^(?:Theory\s*\(\d+%\)|Practical\s*\(\d+%\)|External\s*Theory|External\s*Lab)/i.test(trimmed)) return true;

  if (
    /^(?:Text\s*Books?|Reference\s*Books?|Suggested\s*Readings?|References?|Prescribed\s*Books?|Web\s*Resources?|Online\s*Resources?)\s*[:-]?/i.test(
      trimmed
    )
  )
    return true;
  if (/\b(?:edition|McGraw\s*Hill|Pearson|OReilly|Prentice\s*Hall|Cengage|Nerd\s*Ranch|Oracle\s*Press|Wiley|Oxford\s*University\s*Press|Springer|PHI\s*Learning)\b/i.test(trimmed))
    return true;
  if (/^(?:\d+\.\s+)?(?:Mr\.|Ms\.|Dr\.|Prof\.)\s+[A-Z]/i.test(trimmed)) return true;
  if (/^\d+\.\s+[A-Z][a-z]+.*(?:\(\d{4}\)|\d{4})/i.test(trimmed)) return true;
  if (/^Total\s+(?:Theory\s+|Lab\s+)?Contact\s+Hours?/i.test(trimmed)) return true;

  if (/^[\d.,\s;:/\-_()|'’`"]+$/.test(trimmed) && !/[a-zA-Z]/.test(trimmed)) return true;

  return false;
}

export function splitOutsideBrackets(text, delimiter = ',') {
  const parts = [];
  let current = '';
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '(' || char === '[' || char === '{') depth++;
    else if (char === ')' || char === ']' || char === '}') depth = Math.max(0, depth - 1);

    if (char === delimiter && depth === 0) {
      if (current.trim()) parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

export function splitCompositeTopic(text) {
  if (!text || typeof text !== 'string') return [];

  let cleaned = stripMetadataColumns(text);
  cleaned = cleaned
    .replace(/^\d+[.)\]:-]?\s+/, '')
    .replace(/^[-*•o]\s*/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  cleaned = cleanOcrTypo(cleaned);

  if (cleaned.length < 3 || isReferenceOrJunk(cleaned)) return [];

  if (cleaned.includes(';')) {
    const parts = splitOutsideBrackets(cleaned, ';')
      .map((p) => p.trim())
      .filter((p) => p.length > 2 && !isReferenceOrJunk(p));
    if (parts.length > 1) {
      return parts.map(cleanOcrTypo);
    }
  }

  const colonMatch = cleaned.match(/^([^:]+):\s*(.+)$/);
  if (colonMatch) {
    const category = colonMatch[1].trim();
    const rest = colonMatch[2].trim();
    if (rest.includes(',') && !rest.toLowerCase().includes('etc.')) {
      const subItems = splitOutsideBrackets(rest, ',')
        .map((s) => s.trim())
        .filter((s) => s.length > 2 && !isReferenceOrJunk(s));
      if (subItems.length > 1) {
        return [
          cleanOcrTypo(`${category} - ${subItems[0]}`),
          ...subItems.slice(1).map(cleanOcrTypo),
        ];
      }
    }
  }

  const commaCount = (cleaned.match(/,/g) || []).length;
  if (commaCount >= 2 && cleaned.length > 35) {
    const parts = splitOutsideBrackets(cleaned, ',')
      .map((p) => p.trim())
      .filter((p) => p.length > 2 && !isReferenceOrJunk(p));
    if (parts.length >= 2) {
      return parts.map(cleanOcrTypo);
    }
  }

  return [cleaned];
}

const UNIT_HEADER_REGEX = /^(?:UNIT|Unit|MODULE|Module|CHAPTER|Chapter|SECTION|Section|PART|Part|BLOCK|Block)\s*[:.\-–—]?\s*([0-9IVXLCDM]+|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)(?:[\s:.\-–—]+(.*))?$/i;
const ROMAN_HEADING_REGEX = /^([IVXLCDM]+)\.\s+([A-Z].*)$/i;

export function extractTheoryUnits(theoryLines) {
  if (isScannedTableSyllabus(theoryLines)) {
    const tableUnits = extractTheoryUnitsFromTable(theoryLines);
    if (tableUnits.length >= 3 && tableUnits.every((u) => u.topics.length > 0)) {
      return tableUnits;
    }
  }

  const units = [];
  let currentUnit = null;
  let pendingLines = [];

  const hasExplicitUnits = theoryLines.some(
    (l) => UNIT_HEADER_REGEX.test(l.trim()) || ROMAN_HEADING_REGEX.test(l.trim())
  );

  const addTopicToCurrentUnit = (title) => {
    if (!currentUnit || !title) return;
    const cleanTitle = cleanOcrTypo(stripMetadataColumns(title));
    if (cleanTitle.length < 2 || isReferenceOrJunk(cleanTitle)) return;

    const exists = currentUnit.topics.some(
      (t) => t.title.toLowerCase().trim() === cleanTitle.toLowerCase().trim()
    );
    if (!exists) {
      currentUnit.topics.push({
        title: cleanTitle,
        name: cleanTitle,
        confidence: 0.95,
      });
    }
  };

  const processPendingLines = () => {
    if (!currentUnit || pendingLines.length === 0) {
      pendingLines = [];
      return;
    }

    const hasTableColumns = pendingLines.some((l) =>
      /\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)+$/.test(l)
    );

    if (hasTableColumns) {
      let buffer = '';
      for (const rawLine of pendingLines) {
        if (isReferenceOrJunk(rawLine)) continue;

        const isRowEnd = /\s+\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)+$/.test(rawLine);
        const isStandaloneTableCell = /^\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/.test(rawLine);

        if (isStandaloneTableCell) {
          if (buffer) {
            splitCompositeTopic(buffer).forEach(addTopicToCurrentUnit);
            buffer = '';
          }
          continue;
        }

        buffer = buffer ? `${buffer} ${rawLine}` : rawLine;

        if (isRowEnd) {
          splitCompositeTopic(buffer).forEach(addTopicToCurrentUnit);
          buffer = '';
        }
      }

      if (buffer) {
        splitCompositeTopic(buffer).forEach(addTopicToCurrentUnit);
      }
    } else {
      let buffer = '';
      for (const rawLine of pendingLines) {
        if (isReferenceOrJunk(rawLine)) continue;

        const isBulletOrNum = /^[-*•o]\s+|^\d+[.)\]]\s+|^[a-zA-Z][.)]\s+/.test(rawLine);

        if (isBulletOrNum) {
          if (buffer) {
            splitCompositeTopic(buffer).forEach(addTopicToCurrentUnit);
            buffer = '';
          }
          buffer = rawLine;
        } else {
          if (buffer && /[.;:]$/.test(buffer)) {
            splitCompositeTopic(buffer).forEach(addTopicToCurrentUnit);
            buffer = rawLine;
          } else {
            buffer = buffer ? `${buffer} ${rawLine}` : rawLine;
          }
        }
      }

      if (buffer) {
        splitCompositeTopic(buffer).forEach(addTopicToCurrentUnit);
      }
    }

    pendingLines = [];
  };

  for (let i = 0; i < theoryLines.length; i++) {
    const line = theoryLines[i].trim();
    if (!line || PAGE_NUMBER_REGEX.test(line)) continue;

    const unitMatch = line.match(UNIT_HEADER_REGEX) || line.match(ROMAN_HEADING_REGEX);
    if (unitMatch) {
      processPendingLines();
      const rawNum = unitMatch[1];
      const unitNumber = parseUnitNumber(rawNum, units.length + 1);
      let rawTitle = (unitMatch[2] || '').trim();

      if (!rawTitle && i + 1 < theoryLines.length) {
        const nextLine = theoryLines[i + 1].trim();
        if (
          !UNIT_HEADER_REGEX.test(nextLine) &&
          !ROMAN_HEADING_REGEX.test(nextLine) &&
          !TABLE_HEADER_REGEX.test(nextLine) &&
          !isReferenceOrJunk(nextLine) &&
          nextLine.length < 80 &&
          !/^\d+/.test(nextLine)
        ) {
          rawTitle = nextLine;
          i++;
        }
      }

      rawTitle = rawTitle
        .replace(/\s*\(\s*\d+\s*(?:hours?|hrs?|lectures?|periods?)?\s*\)/i, '')
        .replace(/\s+\d+(?:\s+\d+)*\s*$/, '')
        .trim();

      if (/^\d+$/.test(rawTitle)) {
        rawTitle = '';
      }

      rawTitle = cleanOcrTypo(rawTitle);

      currentUnit = {
        unitNumber,
        unitName: rawTitle || `Unit ${unitNumber}`,
        name: rawTitle || `Unit ${unitNumber}`,
        topics: [],
      };
      units.push(currentUnit);
      continue;
    }

    if (!currentUnit) {
      if (!hasExplicitUnits && line.length > 5 && !isReferenceOrJunk(line) && !TABLE_HEADER_REGEX.test(line)) {
        currentUnit = {
          unitNumber: 1,
          unitName: 'Course Content',
          name: 'Course Content',
          topics: [],
        };
        units.push(currentUnit);
        pendingLines.push(line);
      }
      continue;
    }

    pendingLines.push(line);
  }

  processPendingLines();

  return units.filter((u) => u.topics.length > 0);
}
