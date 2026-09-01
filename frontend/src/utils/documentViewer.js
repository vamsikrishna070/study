export function getPreviewUrl(url) {
  if (!url || typeof url !== 'string') return url;

  let previewUrl = url;

  if (previewUrl.includes('cloudinary.com')) {
    previewUrl = previewUrl.replace(/\/fl_attachment[^/]*\//, '/');
    
    if (previewUrl.includes('/raw/upload/') && previewUrl.toLowerCase().endsWith('.pdf')) {
      previewUrl = previewUrl.replace('/raw/upload/', '/image/upload/');
    }
  }

  return previewUrl;
}

export function getDownloadUrl(url) {
  if (!url || typeof url !== 'string') return url;

  let downloadUrl = url;

  if (downloadUrl.includes('cloudinary.com') && !downloadUrl.includes('fl_attachment')) {
    downloadUrl = downloadUrl.replace('/upload/', '/upload/fl_attachment/');
  }

  return downloadUrl;
}

export function viewDocument(url) {
  const previewUrl = getPreviewUrl(url);
  window.open(previewUrl, '_blank', 'noopener,noreferrer');
}
