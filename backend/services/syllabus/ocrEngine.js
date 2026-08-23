/**
 * OCR Engine module using Tesseract.js.
 * Handles single-page and multi-page OCR execution with worker management,
 * spatial bounding boxes (words, lines, blocks), and PSM configuration.
 */

import Tesseract from 'tesseract.js';

let sharedWorker = null;

/**
 * Gets or initializes a shared Tesseract.js worker
 */
async function getWorker() {
  if (!sharedWorker) {
    try {
      sharedWorker = await Tesseract.createWorker('eng', 1, {
        logger: () => {}, // suppress verbose progress logs
      });
      await sharedWorker.setParameters({
        tessedit_pageseg_mode: '4', // PSM 4: assume single column of text of variable sizes (ideal for tables & lists)
      });
    } catch (err) {
      console.error('[OCREngine] Failed to initialize Tesseract worker:', err.message);
      sharedWorker = null;
      throw err;
    }
  }
  return sharedWorker;
}

/**
 * Terminates the shared Tesseract worker if active
 */
export async function terminateOcrEngine() {
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch (err) {
      // ignore
    } finally {
      sharedWorker = null;
    }
  }
}

/**
 * Performs OCR on an image buffer, extracting text and spatial bounding boxes.
 * @param {Buffer | Uint8Array} imageBuffer Raster image data
 * @param {object} [options]
 * @param {string} [options.psm='4'] Page segmentation mode
 * @returns {Promise<{ text: string, confidence: number, engine: string, lines: Array<{ text: string, bbox: { x0: number, y0: number, x1: number, y1: number }, confidence: number }>, words: Array<{ text: string, bbox: { x0: number, y0: number, x1: number, y1: number }, confidence: number }> }>}
 */
export async function performOcr(imageBuffer, options = {}) {
  if (!imageBuffer || imageBuffer.length === 0) {
    return {
      text: '',
      confidence: 0,
      engine: 'tesseract.js',
      lines: [],
      words: [],
    };
  }

  const worker = await getWorker();
  try {
    if (options.psm) {
      await worker.setParameters({ tessedit_pageseg_mode: String(options.psm) });
    }

    const buffer = Buffer.isBuffer(imageBuffer) ? imageBuffer : Buffer.from(imageBuffer);
    const result = await worker.recognize(buffer, {}, { blocks: true });
    const text = result?.data?.text || '';
    const confidence = (result?.data?.confidence || 0) / 100;

    const extractedLines = [];
    const extractedWords = [];

    (result?.data?.blocks || []).forEach((b) => {
      (b.paragraphs || []).forEach((p) => {
        (p.lines || []).forEach((l) => {
          if (l.text && l.text.trim().length > 0) {
            extractedLines.push({
              text: l.text.trim(),
              bbox: l.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
              confidence: (l.confidence || 0) / 100,
            });
          }
          (l.words || []).forEach((w) => {
            if (w.text && w.text.trim().length > 0) {
              extractedWords.push({
                text: w.text.trim(),
                bbox: w.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 },
                confidence: (w.confidence || 0) / 100,
              });
            }
          });
        });
      });
    });

    return {
      text: text.trim(),
      confidence: Math.round(confidence * 100) / 100,
      engine: 'tesseract.js',
      lines: extractedLines,
      words: extractedWords,
    };
  } catch (error) {
    console.error('[OCREngine] OCR recognition failed:', error.message);
    return {
      text: '',
      confidence: 0,
      engine: 'tesseract.js',
      lines: [],
      words: [],
      error: error.message,
    };
  }
}
