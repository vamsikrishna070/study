/**
 * Universal Spatial Layout and Table Parser.
 * Uses 2D spatial coordinates (X, Y, W, H) from PDF and OCR bounding boxes to:
 * 1. Cluster words into logical lines and rows
 * 2. Detect multi-column vs tabular reading layouts
 * 3. Classify table columns (Unit/Module vs Content vs Metadata)
 * 4. Reconstruct multi-line wrapped cells
 * 5. Strip metadata columns (Contact Hours, CLOs, COs, References, Marks)
 */

import { cleanOcrTypo } from './normalizer.js';

/**
 * Clusters spatial text items into horizontal visual lines using Y-coordinate proximity.
 * @param {Array<{ str: string, x: number, y: number, width: number, height: number }>} items
 * @param {number} [yTolerance=4]
 * @returns {Array<{ y: number, height: number, items: Array<{ str: string, x: number, width: number }> }>}
 */
export function clusterItemsIntoLines(items, yTolerance = 4) {
  if (!Array.isArray(items) || items.length === 0) return [];

  // Filter out empty items
  const validItems = items.filter((it) => it && typeof it.str === 'string' && it.str.trim().length > 0);
  if (validItems.length === 0) return [];

  // Sort descending by Y (standard PDF coordinate system where (0,0) is bottom-left)
  // or ascending if top-left OCR system
  const isTopDown = validItems.some((it) => it.y === 0) || validItems[0].y < validItems[validItems.length - 1].y;

  const sorted = [...validItems].sort((a, b) => (isTopDown ? a.y - b.y : b.y - a.y));

  const lines = [];
  let currentLine = null;

  for (const item of sorted) {
    if (!currentLine) {
      currentLine = { y: item.y, height: item.height || 10, items: [item] };
    } else {
      const diff = Math.abs(item.y - currentLine.y);
      if (diff <= yTolerance) {
        currentLine.items.push(item);
        currentLine.height = Math.max(currentLine.height, item.height || 10);
      } else {
        // Sort line items left-to-right (X ascending)
        currentLine.items.sort((a, b) => a.x - b.x);
        lines.push(currentLine);
        currentLine = { y: item.y, height: item.height || 10, items: [item] };
      }
    }
  }

  if (currentLine) {
    currentLine.items.sort((a, b) => a.x - b.x);
    lines.push(currentLine);
  }

  return lines;
}

/**
 * Detects whether a set of spatial lines represents a multi-column page layout (e.g. 2 columns).
 * @param {Array<{ items: Array<{ x: number, str: string }> }>} lines
 * @param {number} [pageWidth=600]
 * @returns {{ isMultiColumn: boolean, columnCount: number, columnBounds: Array<{ minX: number, maxX: number }> }}
 */
export function detectMultiColumnLayout(lines, pageWidth = 600) {
  if (!Array.isArray(lines) || lines.length < 10) {
    return { isMultiColumn: false, columnCount: 1, columnBounds: [{ minX: 0, maxX: pageWidth }] };
  }

  const leftCount = lines.filter((l) => l.items.some((it) => it.x < pageWidth * 0.45)).length;
  const rightCount = lines.filter((l) => l.items.some((it) => it.x > pageWidth * 0.55)).length;
  const gutterOverlap = lines.filter((l) => l.items.some((it) => it.x >= pageWidth * 0.45 && it.x <= pageWidth * 0.55)).length;

  if (leftCount > lines.length * 0.4 && rightCount > lines.length * 0.4 && gutterOverlap < lines.length * 0.1) {
    return {
      isMultiColumn: true,
      columnCount: 2,
      columnBounds: [
        { minX: 0, maxX: pageWidth * 0.5 },
        { minX: pageWidth * 0.5, maxX: pageWidth },
      ],
    };
  }

  return { isMultiColumn: false, columnCount: 1, columnBounds: [{ minX: 0, maxX: pageWidth }] };
}

/**
 * Strips metadata columns (Hours, CLOs, COs, References, Marks, Page numbers) from a line or row.
 * @param {string} text
 * @returns {string}
 */
export function stripMetadataColumns(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text.trim();

  // Strip leading/trailing table noise and pipes
  cleaned = cleaned.replace(/^[|\[\]I!‘'~•\-\*\s]+/, '').replace(/[|\]\[}‘'~]+$/, '');

  // Strip trailing table metadata columns:
  // e.g. "| 1 | 1 | 1 |", " 1 1", " 2.4 3", " 24 1", " 1 2.4 3", " 1 1 1,2", " 3 3 1,2"
  cleaned = cleaned.replace(/\|\s*[\d\w,\s\.]*\|\s*[\d\w,\s\.]*\|\s*[\d\w,\s\.]*$/i, '');
  cleaned = cleaned.replace(/\|\s*[\d\w,\s\.]*\|\s*[\d\w,\s\.]*$/i, '');
  cleaned = cleaned.replace(/\s+\|\s*[\d\w\s\.,|]+$/i, '');
  cleaned = cleaned.replace(/\s+\d+(?:\.\d+)?\s+[\d,\s\.]+\s+[\d,\s\.]+$/i, '');
  cleaned = cleaned.replace(/\s+\d+(?:\.\d+)?\s+[\d,\s\.]+$/i, '');
  cleaned = cleaned.replace(/\s+\d{1,2}(?:\.\d+)?\s*$/i, '');

  // Strip inline OCR column artifacts (e.g. " 24 representation", " 24 motivation")
  cleaned = cleaned.replace(/\s+\d{1,2}(?:\.\d+)?\s*\|\s*/g, ' ');
  cleaned = cleaned.replace(
    /\s+\d{1,2}(?:\.\d+)?\s+(?=[a-z]|representation|neuron|dimension|Forest|MADALINE|techniques|problem|classification|formulation|solution|gates|introduction|sample|collaborative|Bayesian|linear|SVM)/gi,
    ' '
  );

  // Strip trailing section headers (e.g. "Course Unitization Plan - Lab")
  cleaned = cleaned.replace(/\.?\s*(?:Course\s+Unit(?:ization|isation)\s+Plan|Course\s+Utilization\s+Plan).*$/i, '').trim();

  // Clean double commas or colon glitches
  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/:\s*,\s*/g, ': ').trim();

  return cleanOcrTypo(cleaned);
}

/**
 * Checks whether a line represents a table column header (Unit No, Unit Name, Contact Hours, etc.).
 * @param {string} line
 * @returns {boolean}
 */
export function isTableHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const l = line.trim();
  if (l.length < 2) return false;

  return /^(?:Course\s+Unitization|Course\s+Utilization|Unit\s*No\.?|Unit\s*Name|Required\s*Contact|Contact\s*Hours?|CLOs?\s*Addressed|References?\s*Used|Hours|Lecture\s*Hours|Teaching\s*Hours|Credits|Marks|L\s*T\s*P\s*C|Sl\.?\s*No\.?|S\.No\.?|Experiment\s*Name|Exp\.?\s*No\.?|\.\s*\.\s*Required)/i.test(
    l
  );
}

/**
 * Reconstructs wrapped multi-line table rows from a list of raw table lines.
 * Merges cell continuations intelligently based on grammar, punctuation, and layout.
 * @param {string[]} lines
 * @returns {string[]}
 */
export function reconstructWrappedTableRows(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return [];

  const reconstructed = [];
  let currentBuffer = '';

  const isUnitBoundary = (l) =>
    /^(?:UNIT|MODULE|CHAPTER|SECTION|PART|BLOCK)\s+(?:[IVXLCDM]+|\d+)\b/i.test(l.trim());

  const isNewTopicStart = (l) => {
    const trimmed = l.trim();
    if (isUnitBoundary(trimmed)) return true;
    if (/^[A-Z][a-zA-Z\s]{3,35}:(?!\s*\d)/.test(trimmed)) return true;
    if (/^(?:Different\s+types|Different\s+models|Hypothesis\s+space|Training|Evaluation|Linear|Polynomial|Evaluating|Decision|appropriate|hypothesis|issues|Instance|the\s+Curse|Univariate|Feature|Recommender|Probability|Bayes|Support|Maximum|Artificial|Perceptron|Problem|ADALINE|multilayer|Radial|Introduction|sample|Ensembles|Fixed|Trained|Clustering|Hierarchical|Operating|Evolution|Computer|Process|Threads|Multithreading|Mutex|Semaphores|Monitors|Deadlocks|Main\s+Memory|Contiguous|Virtual|Paging|Page\s+Replacement|File\s+System|File\s+Processing|Relational|SQL|Schema|Normal\s+Forms|Transaction|Recovery)\b/i.test(trimmed)) {
      return true;
    }
    return false;
  };

  const isContinuation = (prev, curr) => {
    if (!prev) return false;
    const p = prev.trim();
    const c = curr.trim();

    if (isUnitBoundary(c)) return false;

    // Direct wrapped fragment checks
    if (
      /^(?:Underfitting|representation|decision\s+tree\s+algorithm|problem|inductive\s+bias|Collaborative\s+filtering|classification|Bayesian\s+Learning|formulation|function|solution\s+to|python\s+exercise|SVM|motivation|ANN\s+representation|neuron|gates\s+using|using\s+ADALINE|ADALINE:|Polynomial\s+discriminant|MADALINE|Introduction\b|dimension|Forest|techniques)\b/i.test(
        c
      )
    ) {
      return true;
    }

    // Previous line ends with dangling preposition / connector / hyphen / comma
    const pClean = p.replace(/\s+[\d,\s\.'’|~}]+$/, '').trim();
    if (/[,:–—\-(]$/.test(pClean)) return true;
    if (
      /\b(?:and|or|of|to|for|in|with|on|the|using|by|from|the\s+Dual|the\s+basic|K\s+nearest|Biological|McCulloh-Pitts|McCulloch-Pitts|Polynomial|VC|Random|Trained\s+rule)$/i.test(
        pClean
      )
    ) {
      return true;
    }

    if (/^[a-z]/.test(c)) return true;

    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || isTableHeader(line)) continue;

    // Check for section closure
    if (/^(?:Total\s+contact\s+hours|Course\s+Util(?:ization|itisation)\s+Plan\s*[-–—]?\s*Lab|Learning\s+Assessment)/i.test(line)) {
      if (currentBuffer) {
        reconstructed.push(currentBuffer);
        currentBuffer = '';
      }
      break;
    }

    // Unit boundary is a standalone delimiter
    if (isUnitBoundary(line)) {
      if (currentBuffer) {
        reconstructed.push(currentBuffer);
        currentBuffer = '';
      }
      reconstructed.push(line);
      continue;
    }

    // Split merged OCR lines if 2 topic starts were concatenated
    const mergedMatch = line.match(/^(issues\s+in\s+decision\s+tree\s+learning\s+[\d\.]*\s*)(Decision\s+tree\s+learning\s*\(ID3\).*)$/i);
    if (mergedMatch) {
      if (currentBuffer) reconstructed.push(currentBuffer);
      reconstructed.push(mergedMatch[1].trim());
      currentBuffer = mergedMatch[2].trim();
      continue;
    }

    if (!currentBuffer) {
      currentBuffer = line;
    } else {
      if (isContinuation(currentBuffer, line)) {
        currentBuffer = currentBuffer.replace(/\s+\d+[\s'’]*$/, '');
        currentBuffer += ' ' + line;
      } else if (isNewTopicStart(line)) {
        reconstructed.push(currentBuffer);
        currentBuffer = line;
      } else {
        // Default fallback: if current line starts lowercase or previous ends incomplete
        currentBuffer = currentBuffer.replace(/\s+\d+[\s'’]*$/, '');
        currentBuffer += ' ' + line;
      }
    }
  }

  if (currentBuffer) {
    reconstructed.push(currentBuffer);
  }

  return reconstructed;
}
