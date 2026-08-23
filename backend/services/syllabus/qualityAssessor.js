/**
 * Text Quality Assessment Module.
 * Evaluates extracted text per page and per document to decide whether OCR is required.
 */

export const QUALITY_LEVELS = {
  GOOD: 'GOOD',
  PARTIAL: 'PARTIAL',
  POOR: 'POOR',
  EMPTY: 'EMPTY',
};

const SYLLABUS_KEYWORDS = [
  'unit',
  'module',
  'chapter',
  'course',
  'syllabus',
  'theory',
  'lab',
  'laboratory',
  'experiment',
  'practical',
  'topics',
  'hours',
  'credits',
  'semester',
  'introduction',
  'management',
  'programming',
  'system',
  'algorithm',
  'data',
  'analysis',
  'design',
  'network',
  'database',
  'learning',
  'outcome',
  'clo',
  'plo',
];

/**
 * Assesses the quality of raw text extracted from a single PDF page.
 * @param {string} pageText Text extracted from page
 * @param {number} [pageNumber=1] Page number (1-indexed)
 * @returns {{ quality: string, score: number, charCount: number, alphaRatio: number, keywordCount: number, needsOcr: boolean, reasons: string[] }}
 */
export function assessPageQuality(pageText, pageNumber = 1) {
  if (!pageText || typeof pageText !== 'string') {
    return {
      quality: QUALITY_LEVELS.EMPTY,
      score: 0,
      charCount: 0,
      alphaRatio: 0,
      keywordCount: 0,
      needsOcr: true,
      reasons: ['Page contains zero extracted text characters.'],
    };
  }

  const trimmed = pageText.trim();
  const charCount = trimmed.length;

  if (charCount < 35) {
    return {
      quality: QUALITY_LEVELS.EMPTY,
      score: 0.1,
      charCount,
      alphaRatio: 0,
      keywordCount: 0,
      needsOcr: true,
      reasons: [`Extracted text length is very low (${charCount} characters).`],
    };
  }

  // Count alphabetic characters
  const alphaMatches = trimmed.match(/[a-zA-Z]/g) || [];
  const alphaRatio = alphaMatches.length / charCount;

  // Count recognizable words (3+ letters)
  const words = trimmed.split(/\s+/).filter((w) => w.length >= 3 && /^[a-zA-Z]+$/.test(w));
  const wordCount = words.length;

  // Count replacement characters & strange symbols
  const replacementMatches = trimmed.match(/[\uFFFD\u0000-\u0008\u000E-\u001F]/g) || [];
  const garbageRatio = replacementMatches.length / charCount;

  // Count syllabus domain keywords
  const lowerText = trimmed.toLowerCase();
  const matchedKeywords = SYLLABUS_KEYWORDS.filter((kw) => lowerText.includes(kw));
  const keywordCount = matchedKeywords.length;

  // Detect scanned cover/metadata page (e.g. ml.pdf page 1 with only CLOs/address and missing course title)
  const isScannedCoverHeader =
    pageNumber === 1 &&
    charCount < 200 &&
    !lowerText.includes('code') &&
    !lowerText.includes('unit') &&
    !lowerText.includes('module');

  const reasons = [];

  if (isScannedCoverHeader) {
    reasons.push('Page 1 contains sparse text without course title or code, likely an embedded scanned header.');
    return {
      quality: QUALITY_LEVELS.POOR,
      score: 0.35,
      charCount,
      alphaRatio,
      keywordCount,
      needsOcr: true,
      reasons,
    };
  }

  if (garbageRatio > 0.15) {
    reasons.push(`High replacement/garbage character ratio (${(garbageRatio * 100).toFixed(1)}%).`);
    return {
      quality: QUALITY_LEVELS.POOR,
      score: 0.2,
      charCount,
      alphaRatio,
      keywordCount,
      needsOcr: true,
      reasons,
    };
  }

  if (alphaRatio < 0.25 && charCount > 100) {
    reasons.push(`Low alphabetic character ratio (${(alphaRatio * 100).toFixed(1)}%).`);
    return {
      quality: QUALITY_LEVELS.POOR,
      score: 0.3,
      charCount,
      alphaRatio,
      keywordCount,
      needsOcr: true,
      reasons,
    };
  }

  if (charCount >= 100 && (alphaRatio >= 0.35 || wordCount >= 15)) {
    return {
      quality: QUALITY_LEVELS.GOOD,
      score: 0.95,
      charCount,
      alphaRatio,
      keywordCount,
      needsOcr: false,
      reasons: ['Readable text extracted successfully.'],
    };
  }

  if (charCount >= 40 && keywordCount >= 1) {
    return {
      quality: QUALITY_LEVELS.PARTIAL,
      score: 0.85,
      charCount,
      alphaRatio,
      keywordCount,
      needsOcr: false,
      reasons: ['Moderate quality text with syllabus keywords.'],
    };
  }

  reasons.push('Insufficient text quality or density.');
  return {
    quality: QUALITY_LEVELS.POOR,
    score: 0.35,
    charCount,
    alphaRatio,
    keywordCount,
    needsOcr: true,
    reasons,
  };
}
