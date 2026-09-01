

const LIGATURE_MAP = {
  '\uFB00': 'ff',
  '\uFB01': 'fi',
  '\uFB02': 'fl',
  '\uFB03': 'ffi',
  '\uFB04': 'ffl',
  '\uFB05': 'ft',
  '\uFB06': 'st',
  '\u0132': 'IJ',
  '\u0133': 'ij',
  '\u0152': 'OE',
  '\u0153': 'oe',
  '\u00C6': 'AE',
  '\u00E6': 'ae',
};

const ROMAN_MAP = {
  I: 1,
  V: 5,
  X: 10,
  L: 50,
  C: 100,
  D: 500,
  M: 1000,
};

const WORD_NUMBER_MAP = {
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

export function romanToArabic(roman) {
  if (!roman || typeof roman !== 'string') return null;
  const str = roman.trim().toUpperCase();
  if (!/^[IVXLCDM]+$/.test(str)) return null;

  let total = 0;
  let prevValue = 0;

  for (let i = str.length - 1; i >= 0; i--) {
    const currentValue = ROMAN_MAP[str[i]] || 0;
    if (currentValue < prevValue) {
      total -= currentValue;
    } else {
      total += currentValue;
      prevValue = currentValue;
    }
  }

  return total > 0 ? total : null;
}

export function parseUnitNumber(str, defaultNum = 1) {
  if (!str) return defaultNum;
  const clean = String(str)
    .replace(/(?:unit|module|chapter|section|part|block|no\.?|number)/gi, '')
    .replace(/[:.\-–—]/g, '')
    .trim();

  const num = parseInt(clean, 10);
  if (!isNaN(num) && num > 0) return num;

  const roman = romanToArabic(clean);
  if (roman !== null) return roman;

  const wordKey = clean.toLowerCase();
  if (WORD_NUMBER_MAP[wordKey]) return WORD_NUMBER_MAP[wordKey];

  return defaultNum;
}

export function normalizeUnicode(text) {
  if (!text || typeof text !== 'string') return '';

  let res = text;

  for (const [ligature, replacement] of Object.entries(LIGATURE_MAP)) {
    res = res.replaceAll(ligature, replacement);
  }

  res = res.replace(/[\u00AD\u200B\u200C\u200D\uFEFF]/g, '');

  res = res
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015\u2212]/g, '-')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"');

  return res;
}

export function stitchBrokenHyphens(text) {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/([a-zA-Z]{2,})-\s*\n\s*([a-zA-Z]{2,})/g, '$1$2');
}

export function cleanOcrTypo(text) {
  if (!text || typeof text !== 'string') return '';

  let cleaned = normalizeUnicode(text);

  cleaned = cleaned
    .replace(/\bntroduction\b/g, 'Introduction')
    .replace(/\bnstance based\b/g, 'Instance based')
    .replace(/\bMcCulloh-Pitts\b/gi, 'McCulloch-Pitts')
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
    .replace(/\bLinear Diermimant Analysis\b/gi, 'Linear Discriminant Analysis')
    .replace(/\bPrincipal Comporent Amys\b/gi, 'Principal Component Analysis')
    .replace(/\bPrincipal Component Amayss\b/gi, 'Principal Component Analysis')
    .replace(/\bNave byes\b/gi, 'Naive Bayes')
    .replace(/\bBoyes optimal decisions\b/gi, 'Bayes optimal decisions')
    .replace(/\bGradient descentatgoritm\b/gi, 'Gradient descent algorithm')
    .replace(/\bDecisiontree\b/gi, 'Decision Tree')
    .replace(/\bSupportvector\b/gi, 'Support Vector')
    .replace(/\bNeuralnetwork\b/gi, 'Neural Network')
    .replace(/\bMultithreading-\s*/gi, 'Multithreading - ')
    .replace(/\bPolymorphism-\s*/gi, 'Polymorphism - ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned;
}

export function normalizeDocumentText(text) {
  if (!text || typeof text !== 'string') return '';
  const stitched = stitchBrokenHyphens(normalizeUnicode(text));

  return stitched
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n');
}
