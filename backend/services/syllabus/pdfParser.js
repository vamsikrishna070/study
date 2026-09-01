import { PDFParse } from 'pdf-parse';
import { assessPageQuality, QUALITY_LEVELS } from './qualityAssessor.js';
import { performOcr } from './ocrEngine.js';
import { normalizeDocumentText } from './normalizer.js';

function mergeHybridPageText(ocrText, rawText) {
  if (!rawText || rawText.trim().length < 50) return ocrText;
  if (!ocrText || ocrText.trim().length < 50) return rawText;

  const ocrLabIdx = ocrText.search(/(?:Course\s+Util(?:ization|itisation)\s+Plan\s*[-–—]?\s*Lab|Exp\.?\s*No\.?|Exp\.?\s*$)/im);
  const rawLabIdx = rawText.search(/(?:Course\s+Util(?:ization|itisation)\s+Plan\s*[-–—]?\s*Lab|Exp\.?\s*No\.?|Exp\.?\s*$)/im);

  if (ocrLabIdx !== -1 && rawLabIdx !== -1) {
    const ocrTheoryPortion = ocrText.slice(0, ocrLabIdx).trim();
    const rawLabPortion = rawText.slice(rawLabIdx).trim();
    return `${ocrTheoryPortion}\n\n${rawLabPortion}`;
  }

  if (ocrText.length > rawText.length * 1.3) {
    return ocrText;
  }

  return ocrText;
}

export async function parsePdfDocument(buffer, options = {}) {
  const parser = new PDFParse({ data: buffer });
  const resultPages = [];
  const ocrPages = [];

  try {
    const textResult = await parser.getText();
    const rawPages = textResult?.pages || [];
    const totalPages = rawPages.length || 1;

    const assessments = rawPages.map((p, idx) => {
      const pageNum = p.pageNumber || (idx + 1);
      const text = p.text || '';
      return {
        pageNumber: pageNum,
        rawText: text,
        assessment: assessPageQuality(text, pageNum),
      };
    });

    const hasScannedPages = assessments.some((a) => a.assessment.needsOcr);

    for (let i = 0; i < assessments.length; i++) {
      const { pageNumber, rawText, assessment } = assessments[i];
      const shouldOcr = !options.disableOcr && (assessment.needsOcr || hasScannedPages);

      if (shouldOcr) {
        console.info(`[PDFParser] Page ${pageNumber} quality is ${assessment.quality} (scanned/hybrid: ${hasScannedPages}). Triggering OCR...`);
        try {
          const screenshots = await parser.getScreenshot({
            imageBuffer: true,
            scale: 3.0,
            partial: [pageNumber],
          });

          const pageScreenshot = screenshots?.pages?.find((s) => s.pageNumber === pageNumber) || screenshots?.pages?.[0];
          if (pageScreenshot && pageScreenshot.data) {
            const ocrRes = await performOcr(pageScreenshot.data);
            const ocrCleanText = normalizeDocumentText(ocrRes.text);

            if (ocrCleanText.length > 20) {
              ocrPages.push(pageNumber);
              const finalText = mergeHybridPageText(ocrCleanText, normalizeDocumentText(rawText));

              resultPages.push({
                pageNumber,
                text: finalText,
                quality: QUALITY_LEVELS.GOOD,
                extractionMethod: 'ocr',
                ocrUsed: true,
                confidence: ocrRes.confidence || 0.85,
                rawTextLength: rawText.length,
                ocrTextLength: ocrCleanText.length,
              });
              continue;
            }
          }
        } catch (ocrErr) {
          console.warn(`[PDFParser] OCR attempt failed for page ${pageNumber}:`, ocrErr.message);
        }
      }

      resultPages.push({
        pageNumber,
        text: normalizeDocumentText(rawText),
        quality: assessment.quality,
        extractionMethod: 'pdf-text',
        ocrUsed: false,
        confidence: assessment.score,
        rawTextLength: rawText.length,
        ocrTextLength: 0,
      });
    }

    const combinedText = resultPages.map((p) => p.text).filter(Boolean).join('\n\n');

    return {
      pages: resultPages,
      combinedText,
      ocrPages,
      totalPages,
      ocrUsed: ocrPages.length > 0,
    };
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
}
