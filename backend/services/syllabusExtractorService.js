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

let mammothModule;
try {
  mammothModule = require('mammoth');
} catch (error) {
  console.error('[SyllabusExtractor] Failed to load mammoth module:', error.message);
}

/**
 * Normalizes raw extracted text from PDF, handling font ligatures, line-break hyphenation, form-feeds, and whitespace
 */
export function normalizePdfText(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    // 1. Unicode Ligatures
    .replace(/\uFB00/g, 'ff')
    .replace(/\uFB01/g, 'fi')
    .replace(/\uFB02/g, 'fl')
    .replace(/\uFB03/g, 'ffi')
    .replace(/\uFB04/g, 'ffl')
    .replace(/\uFB05/g, 'ft')
    .replace(/\uFB06/g, 'st')
    // 2. Line breaks and whitespace
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/\u00A0/g, ' ')
    .replace(/\u202F/g, ' ')
    .replace(/\u2009/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\uFEFF/g, '')
    .replace(/\u0000/g, '')
    .replace(/\u00AD/g, '') // Soft hyphen
    // 3. De-hyphenate words broken across line breaks (e.g. "Synchroniza-\ntion" -> "Synchronization")
    .replace(/([a-zA-Z]{2,})-\s*\n\s*([a-zA-Z]{2,})/g, '$1$2')
    // 4. Quotes & dashes normalization
    .replace(/[\u2018\u2019\u201B\u2032]/g, "'")
    .replace(/[\u201C\u201D\u201F\u2033]/g, '"')
    .trim();
}

/**
 * Parses raw text from PDF buffer using the appropriate pdf-parse instance
 */
export async function parsePdfBufferToText(buffer) {
  let rawText = '';
  if (typeof pdfParseLegacy === 'function') {
    const parsed = await pdfParseLegacy(buffer);
    rawText = parsed?.text || '';
  } else if (typeof PDFParseClass === 'function') {
    const parser = new PDFParseClass({ data: buffer });
    try {
      const parsed = await parser.getText();
      rawText = parsed?.text || '';
    } finally {
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
    }
  } else {
    throw new Error('No compatible PDF parser available.');
  }

  return normalizePdfText(rawText);
}

/**
 * Parses raw text from plain text (.txt) buffer, handling UTF-8/UTF-16 BOMs and CRLF normalization
 */
export function parseTxtBufferToText(buffer) {
  if (!buffer) return '';
  let str = '';
  if (Buffer.isBuffer(buffer)) {
    // UTF-8 BOM: 0xEF, 0xBB, 0xBF
    if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
      str = buffer.subarray(3).toString('utf8');
    } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
      // UTF-16 BE BOM
      str = buffer.subarray(2).toString('utf16be');
    } else if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
      // UTF-16 LE BOM
      str = buffer.subarray(2).toString('utf16le');
    } else {
      str = buffer.toString('utf8');
    }
  } else if (typeof buffer === 'string') {
    str = buffer;
  }

  // Strip BOM char if still present
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }

  // Normalize Windows CRLF and Mac CR to LF, tabs to spaces, remove null bytes
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\u0000/g, '')
    .trim();
}

const TABLE_HEADER_REGEX_DOCX = /^(?:Unit\s*No\.?|Unit\s*Number|Unit\s*Name|Module\s*No\.?|Chapter\s*No\.?|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?)$/i;
const UNIT_START_REGEX_DOCX = /^(?:UNIT|MODULE|CHAPTER|SECTION|PART|BLOCK)\s*[:.\-–—]?\s*(?:[0-9IVXLCDM]+|[A-Za-z]+)/i;

/**
 * Parses structured text from Word (.docx) buffer using mammoth, preserving headings, lists, and tables
 */
export async function parseDocxBufferToText(buffer) {
  if (!mammothModule) {
    throw new Error('Mammoth DOCX parser is not installed.');
  }

  const htmlResult = await mammothModule.convertToHtml({ buffer });
  const html = htmlResult?.value || '';

  if (!html) return '';

  // 1. Clean paragraphs and headers inside table cells so each cell is a single line
  let cleaned = html.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, (match, cellContent) => {
    const textOnly = cellContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return '<td>' + textOnly + '</td>';
  });

  // 2. Format table rows into structured syllabus lines
  cleaned = cleaned.replace(/<tr>([\s\S]*?)<\/tr>/gi, (match, rowContent) => {
    const cells = [...rowContent.matchAll(/<td>([\s\S]*?)<\/td>/gi)].map(m => m[1].trim()).filter(Boolean);
    if (cells.length === 0) return '';

    // Check if entire row is a table header row (e.g. Unit No, Unit Title, Topics...)
    if (TABLE_HEADER_REGEX_DOCX.test(cells[0])) {
      return '';
    }

    // If first cell has UNIT header, structure as "UNIT X: Title\n- Topic1\n- Topic2"
    if (UNIT_START_REGEX_DOCX.test(cells[0])) {
      const unitPart = cells[0];
      const titlePart = cells.length > 1 ? cells[1] : '';
      const topicCells = cells.slice(2);
      let rowLines = unitPart + (titlePart ? ': ' + titlePart : '') + '\n';
      for (const tc of topicCells) {
        rowLines += '- ' + tc + '\n';
      }
      return rowLines;
    }

    return cells.map(c => '- ' + c).join('\n') + '\n';
  });

  // 3. Convert paragraphs, headings, list items
  cleaned = cleaned
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join('\n');

  return cleaned;
}

/**
 * Detects file type from buffer signature, original filename, and mimeType
 * @returns {'pdf' | 'docx' | 'txt' | 'unsupported'}
 */
export function detectDocumentType(buffer, originalName = '', mimeType = '') {
  const cleanOriginalName = (originalName || '').split('?')[0].split('#')[0];
  const ext = (cleanOriginalName.split('.').pop() || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase().trim();

  // Explicit rejections for unsupported media and archives
  const rejectedExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'tiff', 'mp3', 'wav', 'm4a', 'aac', 'ogg', 'mp4', 'mov', 'avi', 'mkv', 'zip', 'rar', '7z', 'tar', 'gz', 'exe', 'apk', 'doc'];
  if (
    rejectedExts.includes(ext) ||
    mime.startsWith('image/') ||
    mime.startsWith('audio/') ||
    mime.startsWith('video/') ||
    mime === 'application/zip' ||
    mime === 'application/x-zip-compressed' ||
    mime === 'application/msword'
  ) {
    return 'unsupported';
  }

  // 1. Buffer Magic Number Checks
  if (buffer && buffer.length >= 4) {
    // Check first 1024 bytes for %PDF magic bytes (supports offset headers & BOMs per PDF spec ISO 32000-1)
    const headerSample = buffer.subarray(0, Math.min(buffer.length, 1024));
    if (headerSample.includes(Buffer.from('%PDF'))) {
      return 'pdf';
    }

    const magic4 = buffer.subarray(0, 4);
    // Zip signature for DOCX: PK\x03\x04 (0x50, 0x4B, 0x03, 0x04)
    if (magic4[0] === 0x50 && magic4[1] === 0x4B && magic4[2] === 0x03 && magic4[3] === 0x04) {
      if (ext === 'docx' || mime.includes('wordprocessingml') || mime.includes('officedocument') || ext === '') {
        return 'docx';
      }
      return 'unsupported';
    }
    // JPEG magic numbers (FF D8 FF)
    if (magic4[0] === 0xFF && magic4[1] === 0xD8 && magic4[2] === 0xFF) return 'unsupported';
    // PNG magic numbers (89 50 4E 47)
    if (magic4[0] === 0x89 && magic4[1] === 0x50 && magic4[2] === 0x4E && magic4[3] === 0x47) return 'unsupported';
    // MP3 ID3 header (49 44 33)
    if (magic4[0] === 0x49 && magic4[1] === 0x44 && magic4[2] === 0x33) return 'unsupported';
  }

  // 2. Extension & MIME Checks
  if (ext === 'pdf' || mime === 'application/pdf') {
    return 'pdf';
  }
  if (
    ext === 'docx' ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/docx'
  ) {
    return 'docx';
  }
  if (ext === 'txt' || mime === 'text/plain' || mime.startsWith('text/')) {
    return 'txt';
  }

  // 3. Fallback: If buffer is valid printable UTF-8 text without binary null bytes and extension is .txt or empty
  if (buffer && buffer.length > 0 && buffer.length < 10 * 1024 * 1024 && (ext === 'txt' || ext === '')) {
    const sample = buffer.subarray(0, Math.min(buffer.length, 1024));
    const hasNullByte = sample.includes(0x00);
    if (!hasNullByte) {
      return 'txt';
    }
  }

  return 'unsupported';
}

/**
 * Universal document buffer to text parser supporting PDF, TXT, and DOCX
 */
export async function parseDocumentBufferToText(buffer, originalName = '', mimeType = '') {
  const docType = detectDocumentType(buffer, originalName, mimeType);

  if (docType === 'pdf') {
    return await parsePdfBufferToText(buffer);
  }

  if (docType === 'docx') {
    return await parseDocxBufferToText(buffer);
  }

  if (docType === 'txt') {
    return parseTxtBufferToText(buffer);
  }

  throw new Error('Unsupported document format. Please upload a PDF, TXT, or DOCX syllabus file.');
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
  const clean = str
    .replace(/^\[?\(?\s*(?:unit|module|chapter|section|part|block)(?:\s*(?:no\.?|number|#))?\s*[:.\-–—]?\s*/i, '')
    .replace(/[\]\)]$/, '')
    .trim();
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
  if (/^(?:Unit\s*No\.?|Unit\s*Number|Unit\s*Name|Module\s*No\.?|Chapter\s*No\.?|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?|S\.No\.?|Hours?|Lecture\s*Hours?|Period|Marks?|Credits?|L\s*T\s*P\s*C)$/i.test(trimmed)) return true;

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
 * Checks if a section header indicates the start of a Laboratory / Practical section
 */
export function isLabSectionHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  return (
    /^(?:(?:Course\s+Unitization\s+Plan|Course\s+Utilization\s+Plan)\s*[:.\-–—]?\s*(?:\(Lab\)|\(Laboratory\)|[–-]\s*Lab|[–-]\s*Laboratory|Lab|Laboratory))$/i.test(trimmed) ||
    /^(?:(?:PART|SECTION|MODULE)\s*[:.\-–—]?[A-Z0-9]*\s*[:.\-–—]?\s*(?:LABORATORY|LAB|PRACTICALS?|EXPERIMENTS?|PROGRAMS?))$/i.test(trimmed) ||
    /^(?:LIST\s+OF\s+(?:EXPERIMENTS|PROGRAMS|PRACTICALS)|LABORATORY\s+EXPERIMENTS|LAB\s+EXPERIMENTS|PRACTICAL\s+EXPERIMENTS|PRACTICALS?|LABORATORY\s+COMPONENT|LAB\s+COMPONENT|PRACTICAL\s+COMPONENT|LAB\s+WORK|PRACTICAL\s+WORK|LABORATORY\s+EXERCISES|LAB\s+EXERCISES)\s*[:-]?$/i.test(trimmed) ||
    /^(?:Laboratory|Lab|Practicals?)\s*[:-]$/i.test(trimmed) ||
    /^(?:Exp\b\.?(?:\s*No\.?)?|No\.?\s*Experiment\s*Name|Experiment\s*Name|List\s+of\s+Experiments|List\s+of\s+Programs)$/i.test(trimmed)
  );
}

/**
 * Checks if a section header indicates the start of a Theory section
 */
export function isTheorySectionHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  return (
    /^(?:(?:Course\s+Unitization\s+Plan|Course\s+Utilization\s+Plan)\s*[:.\-–—]?\s*(?:\(Theory\)|[–-]\s*Theory|Theory))$/i.test(trimmed) ||
    /^(?:(?:PART|SECTION|MODULE)\s*[:.\-–—]?[A-Z0-9]*\s*[:.\-–—]?\s*THEORY)$/i.test(trimmed) ||
    /^(?:THEORY\s+SYLLABUS|THEORY\s+COMPONENT|THEORY\s+COURSE|THEORY\s+TOPICS)\s*[:-]?$/i.test(trimmed)
  );
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
    /^(?:Course\s+Outcomes?|Program\s+Outcomes?|CO-PO\s+Mapping|Bloom’s\s+Level\s+of\s+Cognitive\s+Task|Assessment\s+Pattern|Evaluation\s+Scheme|Question\s+Paper\s+Pattern|Marks\s+Distribution)/i.test(trimmed) ||
    /^(?:Learning\s+Assessment(?:\s+\(Lab\)|\s+Theory)?|Continuous\s+Learning\s+Assessments?)/i.test(trimmed)
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
    .replace(/^(?:\d+(?:\.\d+)*[.)\]:]?|[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u27A2\u2713\-*•o–—]|\([a-zA-Z0-9]+\)|[a-zA-Z][.)\]])\s+/, '')
    .replace(/^[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u27A2\u2713\-*•o–—.)\]:\s]+/, '')
    .replace(/[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u27A2\u2713\-*•o–—,;:\s.]+$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleanOcrTypo(cleaned);
}

/**
 * Cleans a laboratory experiment title from experiment numbering and trailing contact hours / references
 */
export function cleanExperimentTitle(title) {
  if (!title || typeof title !== 'string') return '';
  let clean = title
    .replace(/^(?:Exp\b\.?\s*(?:No\.?)?\s*|Experiments?\b\s*(?:No\.?)?\s*|Programs?\b\s*(?:No\.?)?\s*|Practicals?\b\s*(?:No\.?)?\s*)?\d+[.:)]\s*/i, '')
    .replace(/^(?:Exp\b\.?\s*(?:No\.?)?\s*|Experiments?\b\s*(?:No\.?)?\s*|Programs?\b\s*(?:No\.?)?\s*|Practicals?\b\s*(?:No\.?)?\s*)?\d+\s+/i, '')
    .replace(/\bTotal\s+Contact\s+Hours.*$/i, '')
    .replace(/\s+\d{1,2}(?:\.\d+)?(?:\s+(?:\d+|Internet\s+resources|Web\s+resources)(?:\s*,\s*\d+)*)*$/i, '')
    .replace(/\s+(?:CLO|CO)\s*\d+(?:\s*,\s*\d+)*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();

  clean = cleanTopicTitle(clean);
  return clean;
}

/**
 * Splits a composite topic text (delimited by semicolons, dashes, commas, or sub-numberings) into atomic topic items
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

  // Check if text has multiple topics separated by dashes (e.g. "Topic 1 - Topic 2 - Topic 3")
  const dashParts = cleaned.split(/\s+[-–—]\s+/);
  if (dashParts.length >= 2 && cleaned.length > 25) {
    const parts = dashParts
      .map(cleanTopicTitle)
      .filter((p) => p.length > 2 && !isReferenceOrJunk(p));
    if (parts.length >= 2) {
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

const UNIT_HEADER_REGEX = /^\[?\(?\s*(?:UNIT|Unit|MODULE|Module|CHAPTER|Chapter|SECTION|Section|PART|Part|BLOCK|Block)(?:\s*(?:NO\.?|NUMBER|#))?\s*[:.\-–—]?\s*([0-9IVXLCDM]+|[A-Za-z]+)[\]\)]?(?:[\s:.\-–—]+(.*))?$/i;
const WORD_UNIT_HEADER_REGEX = /^\[?\(?\s*(FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\s+(?:UNIT|Unit|MODULE|Module|CHAPTER|Chapter)[\]\)]?\s*[:.\-–—]?(?:[\s:.\-–—]+(.*))?$/i;
const TABLE_HEADER_REGEX = /^(?:Unit\s*No\.?|Unit\s*Number|Unit\s*Name|Module\s*No\.?|Chapter\s*No\.?|Required|Contact\s*Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Experiment\s*Name|Exp\.?\s*No\.?|sl\.?\s*no\.?|s\.?\s*no\.?)$/i;
const PAGE_NUMBER_REGEX = /^--\s*\d+\s*(?:of\s*\d+)?\s*--$|^Page\s+\d+(?:\s+of\s+\d+)?$/i;
const BULLET_START_REGEX = /^[\u2022\u2023\u25E6\u2043\u2219\u25AA\u25AB\u25CF\u25CB\u27A2\u2713\-*•o–—]\s+|^\d+[.)\]]\s+|^[a-zA-Z][.)]\s+|^\(\d+\)\s+|^\([a-zA-Z]\)\s+/;

/**
 * Extracts course code and course name from the document header lines
 */
export function extractCourseMetadata(lines) {
  let courseName = '';
  let courseCode = '';

  for (let i = 0; i < Math.min(lines.length, 45); i++) {
    const line = lines[i];

    // Pattern 1: Inline Code and Title on same line, e.g. "CS401PC: DATABASE MANAGEMENT SYSTEMS", "20CS41T: OPERATING SYSTEMS", "CS8492 - DATABASE SYSTEMS"
    const inlineMatch = line.match(/^([A-Z]{2,6}\s*[-/]?\s*\d{2,5}[A-Z]{0,3}|\d{1,4}[A-Z]{2,6}\s*[-/]?\s*[0-9A-Z]{1,5}|[A-Z0-9]{4,10})\s*[:.\-–—]\s*(.+)$/i);
    if (inlineMatch && !courseCode && !courseName && !/^(?:UNIT|MODULE|CHAPTER|PART|SECTION)\b/i.test(inlineMatch[1])) {
      const codeCand = inlineMatch[1].replace(/\s+/g, ' ').trim();
      const nameCand = inlineMatch[2]
        .replace(/^(?:Course\s+Title|Course\s+Name|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course|Course|Subject)\s*[:.\-–—]\s*/i, '')
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
            .replace(/^(?:Course\s+Title|Course\s+Name|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course|Course|Subject)\s*[:.\-–—]\s*/i, '')
            .replace(/\s{2,}/g, ' ')
            .trim();
          break;
        }
      }
    }

    // Pattern 3: Direct "Course Title" / "Subject Name" matching
    const nameMatch = line.match(/(?:Course\s+Title|Course\s+Name|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course)\s*[:.\-–—]?\s*(.+)$/i);
    if (nameMatch && !courseName) {
      courseName = nameMatch[1].replace(/\s{2,}/g, ' ').trim();
    }
  }

  return { courseName, courseCode };
}

/**
 * Extracts theory units and topics from document lines
 * @param {string[]} lines
 * @param {string} courseName
 * @param {boolean} hasLab
 * @returns {Array<{ unitNumber: number, unitName: string, topics: Array<{ title: string, confidence: number }> }>}
 */
export function extractTheoryUnits(lines, courseName = '', hasLab = false) {
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
        const isBulletOrNum = BULLET_START_REGEX.test(rawLine);

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

    // Check for explicit Lab section or Non-Theory section headers -> close theory unit
    if (isLabSectionHeader(line) || isNonTheorySectionHeader(line)) {
      if (inTheory) {
        processPendingLines();
        inTheory = false;
        currentUnit = null;
      }
      continue;
    }

    if (isTheorySectionHeader(line)) {
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
            !isLabSectionHeader(candLine) &&
            !TABLE_HEADER_REGEX.test(candLine)
          ) {
            // If line is just hours/contact count (e.g. "(10 Hours)" or "9 Lectures"), skip to next line
            if (/^\(?\s*\d+\s*(?:hours?|hrs?|lectures?|periods?)?\s*\)?$/i.test(candLine)) {
              peekIdx++;
              continue;
            }
            // Do not consume a line as unit title if it is actually a bullet/numbered topic
            const isBulletLine = BULLET_START_REGEX.test(candLine);
            if (!isBulletLine && candLine.length < 90 && !/^\d+$/.test(candLine)) {
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

  let validUnits = units.filter((u) => u.topics.length > 0);

  // Fallback 1: Numbered or Roman-numeral sections (e.g. "1. Introduction", "2. Process Concepts", "I. Overview")
  // Only runs if no theory units detected from standard headers AND strictly ignores lines in lab sections
  if (validUnits.length === 0) {
    const NUMBERED_SECTION_REGEX = /^([1-9]|1[0-2]|[IVXLCDM]+)[.)]\s+([A-Za-z][A-Za-z0-9\s,&:\-–—/()]{3,90})$/i;
    let fallbackUnit = null;
    let fallbackPending = [];
    let insideLab = false;

    const processFallbackPending = () => {
      if (!fallbackUnit || fallbackPending.length === 0) {
        fallbackPending = [];
        return;
      }
      let buffer = '';
      for (const rawLine of fallbackPending) {
        if (isReferenceOrJunk(rawLine) || PAGE_NUMBER_REGEX.test(rawLine)) continue;
        const isBulletOrNum = BULLET_START_REGEX.test(rawLine);
        if (isBulletOrNum) {
          if (buffer) {
            splitCompositeTopic(buffer).forEach((t) => {
              const clean = cleanTopicTitle(t);
              if (clean.length > 2 && !isReferenceOrJunk(clean) && !fallbackUnit.topics.some((et) => et.title.toLowerCase() === clean.toLowerCase())) {
                fallbackUnit.topics.push({ title: clean, confidence: 0.9 });
              }
            });
            buffer = '';
          }
          buffer = rawLine;
        } else {
          if (buffer && /[.;:]$/.test(buffer)) {
            splitCompositeTopic(buffer).forEach((t) => {
              const clean = cleanTopicTitle(t);
              if (clean.length > 2 && !isReferenceOrJunk(clean) && !fallbackUnit.topics.some((et) => et.title.toLowerCase() === clean.toLowerCase())) {
                fallbackUnit.topics.push({ title: clean, confidence: 0.9 });
              }
            });
            buffer = rawLine;
          } else if (buffer) {
            buffer += ' ' + rawLine;
          } else {
            buffer = rawLine;
          }
        }
      }
      if (buffer) {
        splitCompositeTopic(buffer).forEach((t) => {
          const clean = cleanTopicTitle(t);
          if (clean.length > 2 && !isReferenceOrJunk(clean) && !fallbackUnit.topics.some((et) => et.title.toLowerCase() === clean.toLowerCase())) {
            fallbackUnit.topics.push({ title: clean, confidence: 0.9 });
          }
        });
      }
      fallbackPending = [];
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (isLabSectionHeader(line)) {
        insideLab = true;
        if (fallbackUnit) {
          processFallbackPending();
          fallbackUnit = null;
        }
        continue;
      }

      if (insideLab) {
        if (isNonTheorySectionHeader(line) || isTheorySectionHeader(line)) {
          insideLab = false;
        }
        continue;
      }

      if (PAGE_NUMBER_REGEX.test(line) || isNonTheorySectionHeader(line)) {
        if (fallbackUnit) {
          processFallbackPending();
        }
        continue;
      }

      const numMatch = line.match(NUMBERED_SECTION_REGEX);
      if (numMatch && !isReferenceOrJunk(numMatch[2])) {
        processFallbackPending();
        const numVal = parseUnitNumber(numMatch[1], validUnits.length + 1);
        const titleVal = cleanTopicTitle(numMatch[2]);
        fallbackUnit = {
          unitNumber: numVal,
          unitName: titleVal || `Unit ${numVal}`,
          topics: [],
        };
        validUnits.push(fallbackUnit);
        continue;
      }

      if (fallbackUnit) {
        fallbackPending.push(line);
      }
    }
    processFallbackPending();
    validUnits = validUnits.filter((u) => u.topics.length > 0);
  }

  // Fallback 2: If still no units, but document non-lab text contains 2+ clear bulleted/numbered topics, create a "Syllabus Content" unit
  // Only execute this fallback if NO laboratory experiments were found in the document
  if (validUnits.length === 0 && !hasLab) {
    const allTopics = [];
    let buffer = '';
    let inLabZone = false;

    for (const rawLine of lines) {
      if (isLabSectionHeader(rawLine)) {
        inLabZone = true;
        continue;
      }
      if (inLabZone) {
        if (isTheorySectionHeader(rawLine)) {
          inLabZone = false;
        }
        continue;
      }
      if (isReferenceOrJunk(rawLine) || isNonTheorySectionHeader(rawLine) || PAGE_NUMBER_REGEX.test(rawLine)) continue;
      if (BULLET_START_REGEX.test(rawLine)) {
        if (buffer) {
          splitCompositeTopic(buffer).forEach((t) => {
            const clean = cleanTopicTitle(t);
            if (clean.length > 2 && !isReferenceOrJunk(clean) && !allTopics.some((et) => et.title.toLowerCase() === clean.toLowerCase())) {
              allTopics.push({ title: clean, confidence: 0.85 });
            }
          });
          buffer = '';
        }
        buffer = rawLine;
      } else if (buffer) {
        buffer += ' ' + rawLine;
      }
    }
    if (buffer) {
      splitCompositeTopic(buffer).forEach((t) => {
        const clean = cleanTopicTitle(t);
        if (clean.length > 2 && !isReferenceOrJunk(clean) && !allTopics.some((et) => et.title.toLowerCase() === clean.toLowerCase())) {
          allTopics.push({ title: clean, confidence: 0.85 });
        }
      });
    }

    if (allTopics.length >= 2) {
      validUnits.push({
        unitNumber: 1,
        unitName: courseName ? `${courseName} - Core Topics` : 'Syllabus Content',
        topics: allTopics,
      });
    }
  }

  return validUnits;
}

/**
 * Extracts laboratory experiments from document lines
 * @param {string[]} lines
 * @param {string} courseName
 * @returns {Array<{ experimentNumber: number, title: string, confidence: number }>}
 */
export function extractLabExperiments(lines, courseName = '') {
  const labExperiments = [];
  let inLabSection = false;
  let labBuffer = '';

  const flushLabBuffer = () => {
    if (!labBuffer) return;
    const clean = cleanExperimentTitle(labBuffer);

    if (
      clean.length > 3 &&
      !isReferenceOrJunk(clean) &&
      !TABLE_HEADER_REGEX.test(clean) &&
      !isLabSectionHeader(clean) &&
      !/^(?:Exp\b\.?\s*(?:No\.?)?|Experiments?\b\s*(?:No\.?)?|Required|Contact|Hours|CLOs?|Addressed|References?|Used)$/i.test(clean) &&
      !labExperiments.some((e) => e.title.toLowerCase() === clean.toLowerCase())
    ) {
      labExperiments.push({
        experimentNumber: labExperiments.length + 1,
        title: clean,
        confidence: 0.95,
      });
    }
    labBuffer = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || PAGE_NUMBER_REGEX.test(line)) continue;

    // Check if line indicates start of Lab section
    if (isLabSectionHeader(line)) {
      flushLabBuffer();
      inLabSection = true;
      continue;
    }

    // Skip table column header rows BEFORE checking non-theory section headers
    if (TABLE_HEADER_REGEX.test(line)) {
      continue;
    }

    // If in lab section, check for terminating headers (Theory headers, References, Assessment)
    if (inLabSection) {
      if (
        UNIT_HEADER_REGEX.test(line) ||
        WORD_UNIT_HEADER_REGEX.test(line) ||
        isTheorySectionHeader(line) ||
        (labExperiments.length > 0 && isNonTheorySectionHeader(line)) ||
        /^Total\s+Contact\s+Hours/i.test(line)
      ) {
        flushLabBuffer();
        if (!/^Total\s+Contact\s+Hours/i.test(line)) {
          inLabSection = false;
        }
        continue;
      }
    }

    if (!inLabSection) {
      continue;
    }

    const isExpStart = /^(?:Exp\b\.?\s*(?:No\.?)?\s*|Experiments?\b\s*(?:No\.?)?\s*|Programs?\b\s*(?:No\.?)?\s*|Practicals?\b\s*(?:No\.?)?\s*)?\d+(?:[.)\]:\s]|$)/i.test(line);
    const isRowEnd = /\s+\d{1,2}(?:\.\d+)?(?:\s+(?:\d+|Internet\s+resources|Web\s+resources)(?:\s*,\s*\d+)*)*$/i.test(line);
    const isStandaloneTableCell = /^\d{1,2}(?:\.\d+)?(?:\s+\d+(?:\s*,\s*\d+)*)*$/.test(line);

    if (isExpStart) {
      flushLabBuffer();
      labBuffer = line;
      if (isRowEnd) {
        flushLabBuffer();
      }
    } else if (labBuffer) {
      if (isStandaloneTableCell) {
        flushLabBuffer();
      } else {
        labBuffer += ' ' + line;
        if (isRowEnd) {
          flushLabBuffer();
        }
      }
    }
  }

  flushLabBuffer();
  return labExperiments;
}

/**
 * Structure-aware syllabus extractor separating Theory units and Laboratory experiments
 * @param {string} rawText Raw extracted text from PDF, TXT, or DOCX
 * @returns {{
 *   courseName: string,
 *   courseCode: string,
 *   theoryUnits: Array<{ unitNumber: number, unitName: string, topics: Array<{ title: string, confidence: number }> }>,
 *   labExperiments: Array<{ experimentNumber: number, title: string, confidence: number }>,
 *   units: Array<{ unitNumber: number, unitName: string, name?: string, topics: Array<{ title: string, name?: string, confidence?: number }> }>,
 *   hasTheory: boolean,
 *   hasLab: boolean
 * }}
 */
export function extractSyllabusStructure(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      courseName: '',
      courseCode: '',
      theoryUnits: [],
      labExperiments: [],
      units: [],
      hasTheory: false,
      hasLab: false,
    };
  }

  const normalized = normalizePdfText(rawText);
  const lines = normalized
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  // 1. Extract Course Metadata
  const { courseName, courseCode } = extractCourseMetadata(lines);

  // 2. Extract Laboratory Experiments
  const labExperiments = extractLabExperiments(lines, courseName);

  // 3. Extract Theory Units (passing hasLab to prevent false fallback on lab-only documents)
  const theoryUnits = extractTheoryUnits(lines, courseName, labExperiments.length > 0);

  // 4. Construct Backward-Compatible Unified Units Array
  const combinedUnits = [];

  theoryUnits.forEach((u, i) => {
    combinedUnits.push({
      unitNumber: u.unitNumber || (i + 1),
      unitName: u.unitName,
      name: u.unitName,
      topics: u.topics.map((t) => ({
        title: t.title,
        name: t.title,
        confidence: t.confidence || 0.95,
      })),
    });
  });

  // If lab experiments exist:
  // If theory units exist: add Laboratory Experiments as an additional distinct unit (e.g. Unit 6)
  // If no theory units exist: add Laboratory Experiments as Unit 1
  if (labExperiments.length > 0) {
    const labUnitNumber = combinedUnits.length + 1;
    const labUnitTitle = 'Laboratory Experiments';
    combinedUnits.push({
      unitNumber: labUnitNumber,
      unitName: labUnitTitle,
      name: labUnitTitle,
      topics: labExperiments.map((e) => ({
        title: e.title,
        name: e.title,
        confidence: e.confidence || 0.95,
      })),
    });
  }

  return {
    courseName,
    courseCode,
    theoryUnits,
    labExperiments,
    units: combinedUnits,
    hasTheory: theoryUnits.length > 0,
    hasLab: labExperiments.length > 0,
  };
}
