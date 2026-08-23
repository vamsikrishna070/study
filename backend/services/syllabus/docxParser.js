/**
 * DOCX parsing module using mammoth.
 * Extracts plain text, tables (HTML), and hierarchical headings from Word (.docx) documents.
 */

import mammoth from 'mammoth';
import { normalizeDocumentText } from './normalizer.js';

/**
 * Converts mammoth HTML table and paragraph nodes into structured plain lines.
 * @param {string} html
 * @returns {string}
 */
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

/**
 * Parses a DOCX buffer to normalized text preserving tables and headings.
 * @param {Buffer} buffer
 * @returns {Promise<{ combinedText: string, totalPages: number, pages: Array<{ pageNumber: number, text: string, extractionMethod: string, ocrUsed: boolean }> }>}
 */
export async function parseDocxDocument(buffer) {
  try {
    let text = '';
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer });
      if (htmlResult?.value && htmlResult.value.includes('<table')) {
        text = convertMammothHtmlToText(htmlResult.value);
      }
    } catch (htmlErr) {
      // Fallback to raw text if HTML conversion fails
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
