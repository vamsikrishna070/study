/**
 * Gets a URL suitable for inline viewing/previewing of a document.
 * Strips Cloudinary attachment flags that force downloading.
 */
export function getPreviewUrl(url) {
  if (!url || typeof url !== 'string') return url;

  let previewUrl = url;

  if (previewUrl.includes('cloudinary.com')) {
    // Remove fl_attachment flag if present (which forces download)
    previewUrl = previewUrl.replace(/\/fl_attachment[^/]*\//, '/');
    
    // Cloudinary raw files force Content-Disposition: attachment.
    // Changing raw to image for PDFs allows inline viewing if PDF delivery is enabled.
    if (previewUrl.includes('/raw/upload/') && previewUrl.toLowerCase().endsWith('.pdf')) {
      previewUrl = previewUrl.replace('/raw/upload/', '/image/upload/');
    }
  }

  return previewUrl;
}

/**
 * Gets a URL suitable for downloading a document.
 * Ensures Cloudinary URLs have the fl_attachment flag.
 */
export function getDownloadUrl(url) {
  if (!url || typeof url !== 'string') return url;

  let downloadUrl = url;

  if (downloadUrl.includes('cloudinary.com') && !downloadUrl.includes('fl_attachment')) {
    // Add fl_attachment flag if missing
    downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
  }

  return downloadUrl;
}

/**
 * Safely opens a document preview in a new tab/window without triggering a download.
 */
export function viewDocument(url) {
  const previewUrl = getPreviewUrl(url);
  window.open(previewUrl, '_blank', 'noopener,noreferrer');
}
