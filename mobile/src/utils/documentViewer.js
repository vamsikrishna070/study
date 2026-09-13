import { viewPdf, downloadPdf, sharePdf } from '../services/documentService';
import { extractFilenameFromUrl, resolveAttachmentFileName } from './attachmentHelper';

export const viewDocument = async (url, title = '') => {
  const filename = title || extractFilenameFromUrl(url) || 'document.pdf';
  return await viewPdf(url, filename);
};

export const downloadDocument = async (url, filename = '', onProgress) => {
  const safeFilename = filename || extractFilenameFromUrl(url) || 'document.pdf';
  const result = await downloadPdf(url, safeFilename, onProgress);
  return result?.uri || null;
};

export const shareDocument = async (url, filename = '') => {
  const safeFilename = filename || extractFilenameFromUrl(url) || 'document.pdf';
  return await sharePdf(url, safeFilename);
};

export { extractFilenameFromUrl, resolveAttachmentFileName };

