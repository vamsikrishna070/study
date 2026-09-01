

import { normalizeDocumentText } from './normalizer.js';

function decodeTextBuffer(buffer) {
  if (!buffer || buffer.length === 0) return '';

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString('utf8');
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString('utf16le');
  }

  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.alloc(buffer.length - 2);
    for (let i = 2; i < buffer.length - 1; i += 2) {
      swapped[i - 2] = buffer[i + 1];
      swapped[i - 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }

  return buffer.toString('utf8');
}

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
