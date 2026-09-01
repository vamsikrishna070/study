import { viewPdf, downloadPdf, sharePdf } from '../services/documentService';

export const viewDocument = async (url, title = 'Document') => {
  return await viewPdf(url, title);
};

export const downloadDocument = async (url, filename = 'document.pdf', onProgress) => {
  const result = await downloadPdf(url, filename, onProgress);
  return result?.uri || null;
};

export const shareDocument = async (url, filename = 'document.pdf') => {
  return await sharePdf(url, filename);
};
