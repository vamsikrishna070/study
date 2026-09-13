export function getPreviewUrl(url, filename = '') {
  if (!url || typeof url !== 'string') return url;

  let previewUrl = url.trim();

  if (previewUrl.includes('cloudinary.com')) {
    // Remove any forced download transformation flag
    previewUrl = previewUrl.replace(/\/fl_attachment[^/]*\//, '/');

    // Cloudinary raw uploads send Content-Disposition: attachment headers by default.
    // Route legacy raw uploads through our preview streaming proxy to ensure Content-Disposition: inline.
    if (previewUrl.includes('/raw/upload/')) {
      const apiBase = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
      const safeFilename = filename || previewUrl.split('/').pop() || 'document.pdf';
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
  const previewUrl = getPreviewUrl(url, filename);
  window.open(previewUrl, '_blank', 'noopener,noreferrer');
}
