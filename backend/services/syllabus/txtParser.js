/**
 * Plain text (.txt) syllabus parser module.
 * Supports UTF-8, UTF-8 with BOM, UTF-16 LE/BE, CRLF/LF normalization.
 */

import { normalizeDocumentText } from './normalizer.js';

/**
 * Decodes buffer detecting BOM and encoding.
 * @param {Buffer} buffer
 * @returns {string}
 */
function decodeTextBuffer(buffer) {
  if (!buffer || buffer.length === 0) return '';

  // 1. UTF-8 BOM
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8');
  }

  // 2. UTF-16 LE BOM
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }

  // 3. UTF-16 BE BOM
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.alloc(buffer.length - 2);
    for (let i = 2; i < buffer.length - 1; i += 2) {
      swapped[i - 2] = buffer[i + 1];
      swapped[i - 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }

  // 4. Default UTF-8
  return buffer.toString('utf8');
}

/**
 * Parses a plain text buffer.
 * @param {Buffer} buffer
 * @returns {{ combinedText: string, totalPages: number, pages: Array<{ pageNumber: number, text: string, extractionMethod: string, ocrUsed: boolean, quality: string, confidence: number }> }}
 */
export function parseTxtDocument(buffer) {
  const rawText = decodeTextBuffer(buffer);
  const normalized = normalizeDocumentText(rawText);

  return {
    combinedText: normalized,
    totalPages: 1,
    ocrUsed: false,
    ocrPages: [],
    pages: [
      {
        pageNumber: 1,
        text: normalized,
        quality: 'GOOD',
        extractionMethod: 'txt-direct',
        ocrUsed: false,
        confidence: 0.95,
      },
    ],
  };
}
