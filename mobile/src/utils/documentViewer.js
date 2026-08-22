import { viewPdf, downloadPdf, sharePdf } from '../services/documentService';

/**
 * View document locally / with native viewer
 */
export const viewDocument = async (url, title = 'Document') => {
  return await viewPdf(url, title);
};

/**
 * Download document to device cache / storage
 */
export const downloadDocument = async (url, filename = 'document.pdf', onProgress) => {
  const result = await downloadPdf(url, filename, onProgress);
  return result?.uri || null;
};

/**
 * Share document with external apps (WhatsApp, Drive, Email, etc.)
 */
export const shareDocument = async (url, filename = 'document.pdf') => {
  return await sharePdf(url, filename);
};
