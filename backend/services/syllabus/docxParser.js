

import mammoth from 'mammoth';
import { normalizeDocumentText } from './normalizer.js';

function convertMammothHtmlToText(html) {
  if (!html || typeof html !== 'string') return '';

  return html
    .replace(/<tr>\s*<td>/gi, '\n')
    .replace(/<\/td>\s*<td>/gi, ' | ')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<h[1-6][^>]*>(.*?)<\/h[1-6]>/gi, '\n\n$1\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '\n- $1')
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export async function parseDocxDocument(buffer) {
  try {
    let text = '';
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer });
      if (htmlResult?.value && htmlResult.value.includes('<table')) {
        text = convertMammothHtmlToText(htmlResult.value);
      }
    } catch (htmlErr) {

    }

    if (!text || text.trim().length < 20) {
      const rawResult = await mammoth.extractRawText({ buffer });
      text = rawResult?.value || '';
    }

    const normalized = normalizeDocumentText(text);

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
          extractionMethod: 'docx-mammoth',
          ocrUsed: false,
          confidence: 0.95,
        },
      ],
    };
  } catch (error) {
    console.error('[DocxParser] Failed to extract DOCX text:', error.message);
    throw new Error(`Failed to parse DOCX syllabus document: ${error.message}`);
  }
}
