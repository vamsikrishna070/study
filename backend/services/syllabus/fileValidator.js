/**
 * File validation and signature detection module.
 * Inspects magic bytes, MIME types, BOMs, and file size to ensure valid syllabus documents.
 */

export const SUPPORTED_TYPES = {
  PDF: 'pdf',
  DOCX: 'docx',
  TXT: 'txt',
};

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF
const DOCX_ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // PK\x03\x04
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

/**
 * Strips URL query parameters and hashes
 */
export function sanitizeDocumentUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

/**
 * Validates document buffer integrity, file type, and size.
 * @param {Buffer} buffer
 * @param {string} [originalFileName='']
 * @param {string} [mimeType='']
 * @returns {{ valid: boolean, fileType: string, error?: string }}
 */
export function validateDocumentBuffer(buffer, originalFileName = '', mimeType = '') {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      valid: false,
      fileType: 'unknown',
      error: 'Empty document buffer. The uploaded file contains no data.',
    };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      fileType: 'unknown',
      error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB.`,
    };
  }

  // 1. Detect UTF-8 BOM, UTF-16 LE/BE BOM for TXT
  if (
    (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) ||
    (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) ||
    (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff)
  ) {
    return {
      valid: true,
      fileType: SUPPORTED_TYPES.TXT,
    };
  }

  // 2. Check if content is HTML error page (e.g. 404, 500, Cloudinary error)
  const headerSample = buffer.subarray(0, Math.min(buffer.length, 1024)).toString('utf8').trim();
  if (
    /^<!DOCTYPE\s+html/i.test(headerSample) ||
    /^<html/i.test(headerSample) ||
    /<head>/i.test(headerSample) ||
    /<h1>(?:404|403|500|502|Error)/i.test(headerSample)
  ) {
    return {
      valid: false,
      fileType: 'html',
      error: 'Downloaded document appears to be an HTML web page or error response rather than a syllabus file.',
    };
  }

  // 3. Detect PDF by magic bytes (%PDF-) anywhere in first 1024 bytes (some PDFs have leading BOM/whitespace)
  const pdfIndex = buffer.indexOf(PDF_MAGIC);
  if (pdfIndex !== -1 && pdfIndex < 1024) {
    return {
      valid: true,
      fileType: SUPPORTED_TYPES.PDF,
    };
  }

  // 4. Detect DOCX by ZIP header (PK\x03\x04)
  if (buffer.subarray(0, 4).equals(DOCX_ZIP_MAGIC)) {
    const isDocxName = /\.docx$/i.test(originalFileName || '');
    const isDocxMime = /wordprocessingml|officedocument/i.test(mimeType || '');
    if (isDocxName || isDocxMime || buffer.includes('word/document.xml') || buffer.includes('[Content_Types].xml')) {
      return {
        valid: true,
        fileType: SUPPORTED_TYPES.DOCX,
      };
    }
    return {
      valid: false,
      fileType: 'zip',
      error: 'Generic ZIP archives are not supported. Please upload a PDF, DOCX, or TXT file.',
    };
  }

  // 5. Detect TXT: check if buffer is valid UTF-8/ASCII
  let isText = true;
  let nonAscii = 0;
  const sampleLen = Math.min(buffer.length, 4096);
  for (let i = 0; i < sampleLen; i++) {
    const byte = buffer[i];
    if (byte === 0x00) {
      isText = false;
      break;
    }
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) {
      isText = false;
      break;
    }
    if (byte > 127) nonAscii++;
  }

  if (isText && nonAscii / sampleLen < 0.3) {
    return {
      valid: true,
      fileType: SUPPORTED_TYPES.TXT,
    };
  }

  return {
    valid: false,
    fileType: 'unknown',
    error: 'Unsupported or corrupted document format. Please upload a valid PDF, DOCX, or TXT document.',
  };
}
