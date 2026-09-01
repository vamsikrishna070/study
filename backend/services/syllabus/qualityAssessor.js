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

  const alphaMatches = trimmed.match(/[a-zA-Z]/g) || [];
  const alphaRatio = charCount > 0 ? alphaMatches.length / charCount : 0;

  const replacementMatches = trimmed.match(/[\uFFFD\u0000-\u0008\u000E-\u001F]/g) || [];
  const garbageRatio = charCount > 0 ? replacementMatches.length / charCount : 0;

  if (charCount < 35) {
    const isCleanText = alphaMatches.length > 0 && garbageRatio < 0.05;
    return {
      quality: isCleanText ? QUALITY_LEVELS.PARTIAL : QUALITY_LEVELS.EMPTY,
      score: isCleanText ? 0.4 : 0.1,
      charCount,
      alphaRatio,
      keywordCount: 0,
      needsOcr: !isCleanText,
      reasons: [`Extracted text length is low (${charCount} characters).`],
    };
  }

  const words = trimmed.split(/\s+/).filter((w) => w.length >= 3 && /^[a-zA-Z]+$/.test(w));
  const wordCount = words.length;

  const lowerText = trimmed.toLowerCase();
  const matchedKeywords = SYLLABUS_KEYWORDS.filter((kw) => lowerText.includes(kw));
  const keywordCount = matchedKeywords.length;

  const isScannedCoverHeader =
    pageNumber === 1 &&
    charCount < 200 &&
    garbageRatio > 0.05 &&
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
