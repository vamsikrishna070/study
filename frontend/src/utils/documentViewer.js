export function extractFilenameFromUrl(url) {
  if (!url || typeof url !== 'string') return '';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    let basename = cleanUrl.split('/').pop() || '';
    basename = decodeURIComponent(basename);

    if (/^\d{10,13}[-_]/.test(basename)) {
      basename = basename.replace(/^\d{10,13}[-_]/, '');
    }

    if (basename.toLowerCase().endsWith('_pdf')) {
      basename = basename.slice(0, -4) + '.pdf';
    }

    return basename;
  } catch {
    return '';
  }
}

export function resolveAttachmentFileName(attachment, fallback = 'document.pdf') {
  if (!attachment) return fallback;

  if (typeof attachment === 'string') {
    return extractFilenameFromUrl(attachment) || fallback;
  }

  if (attachment.originalName && typeof attachment.originalName === 'string') {
    return attachment.originalName.trim();
  }

  if (attachment.name && typeof attachment.name === 'string') {
    return attachment.name.trim();
  }

  if (attachment.filename && typeof attachment.filename === 'string') {
    return attachment.filename.trim();
  }

  const url = attachment.url || attachment.uri || attachment.fileUrl || '';
  if (url && typeof url === 'string') {
    const extracted = extractFilenameFromUrl(url);
    if (extracted) return extracted;
  }

  if (attachment.title && typeof attachment.title === 'string') {
    const title = attachment.title.trim();
    if (attachment.mimeType?.includes('pdf') || attachment.type === 'document') {
      return title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
    }
    return title;
  }

  return fallback;
}

export function getPreviewUrl(url, filename = '') {
  if (!url || typeof url !== 'string') return url;

  let previewUrl = url.trim();

  if (previewUrl.includes('cloudinary.com')) {
    previewUrl = previewUrl.replace(/\/fl_attachment[^/]*\//, '/');
    if (previewUrl.includes('/raw/upload/')) {
      const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
      const safeFilename = filename || extractFilenameFromUrl(previewUrl) || 'document.pdf';
      return `${apiBase}/upload/preview?url=${encodeURIComponent(previewUrl)}&filename=${encodeURIComponent(safeFilename)}`;
    }
  }

  return previewUrl;
}

export function getDownloadUrl(url) {
  if (!url || typeof url !== 'string') return url;

  let downloadUrl = url.trim();

  if (downloadUrl.includes('cloudinary.com') && !downloadUrl.includes('fl_attachment')) {
    downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
  }

  return downloadUrl;
}

export function viewDocument(url, filename = '') {
  if (!url) return;
  const resolvedName = filename || extractFilenameFromUrl(url) || 'document.pdf';
  const previewUrl = getPreviewUrl(url, resolvedName);
  window.open(previewUrl, '_blank', 'noopener,noreferrer');
}
