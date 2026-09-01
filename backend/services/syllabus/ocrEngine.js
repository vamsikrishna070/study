

import Tesseract from 'tesseract.js';

let sharedWorker = null;

async function getWorker() {
  if (!sharedWorker) {
    try {
      sharedWorker = await Tesseract.createWorker('eng', 1, {
        logger: () => {},
      });
      await sharedWorker.setParameters({
        tessedit_pageseg_mode: '4',
      });
    } catch (err) {
      console.error('[OCREngine] Failed to initialize Tesseract worker:', err.message);
      sharedWorker = null;
      throw err;
    }
  }
  return sharedWorker;
}

export async function terminateOcrEngine() {
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch (err) {

    } finally {
      sharedWorker = null;
    }
  }
}

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
