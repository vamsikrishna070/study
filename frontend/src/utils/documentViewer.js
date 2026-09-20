function _getExtension(name) {
  if (!name || typeof name !== 'string') return '';
  const clean = name.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot !== -1 ? clean.substring(dot).toLowerCase() : '';
}

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

export function getAttachmentKind(attachment) {
  if (!attachment) return 'file';

  const rawUrl = typeof attachment === 'string'
    ? attachment
    : (attachment.url || attachment.uri || attachment.fileUrl || attachment.fileData?.url || '');
  const url = String(rawUrl || '').trim();
  const explicitType = String(attachment.type || attachment.resourceType || '').toLowerCase();
  const rawMime = String(attachment.mimeType || attachment.fileData?.mimeType || '').toLowerCase();
  const name = String(attachment.originalName || attachment.name || attachment.filename || attachment.title || '').trim();

  if (url) {
    if (/instagram\.com\/(?:reel|reels)\//i.test(url)) {
      return 'instagram_reel';
    }
    if (/instagram\.com\/(?:p|tv)\//i.test(url) || /instagram\.com/i.test(url)) {
      return 'instagram_post';
    }
    if (/linkedin\.com\/(?:posts|feed\/update|pulse)\//i.test(url) || /linkedin\.com/i.test(url)) {
      return 'linkedin_post';
    }
    if (/youtube\.com|youtu\.be/i.test(url) || explicitType === 'youtube') {
      return 'youtube';
    }
    if (/twitter\.com|x\.com/i.test(url)) {
      return 'twitter';
    }
    if (/github\.com/i.test(url)) {
      return 'github';
    }
  }

  const isHttpWebUrl = /^https?:\/\//i.test(url);
  const isCloudinary = /cloudinary\.com/i.test(url);
  const extFromUrl = _getExtension(url);
  const extFromName = _getExtension(name);
  const ext = extFromName || extFromUrl;


  
  if (explicitType === 'link' || (isHttpWebUrl && !isCloudinary && !ext && !attachment.publicId)) {
    return 'link';
  }


  if (
    explicitType === 'recording' ||
    explicitType === 'audio' ||
    rawMime.startsWith('audio/') ||
    (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus', '.3gp', '.webm'].includes(ext) && (rawMime.includes('audio') || explicitType === 'recording'))
  ) {
    return 'audio';
  }


  if (
    explicitType === 'image' ||
    rawMime.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(ext)
  ) {
    return 'image';
  }


  if (
    explicitType === 'video' ||
    rawMime.startsWith('video/') ||
    ['.mp4', '.mov', '.avi', '.mkv'].includes(ext)
  ) {
    return 'video';
  }


  if (
    rawMime.includes('presentation') ||
    rawMime.includes('powerpoint') ||
    ['.ppt', '.pptx'].includes(ext)
  ) {
    return 'presentation';
  }


  if (
    (rawMime === 'application/pdf' || rawMime.includes('/pdf') || ext === '.pdf') &&
    (!isHttpWebUrl || isCloudinary || ext === '.pdf')
  ) {
    return 'pdf';
  }


  if (
    rawMime.includes('msword') ||
    rawMime.includes('wordprocessingml') ||
    rawMime.includes('officedocument') ||
    ['.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.csv'].includes(ext)
  ) {
    return 'document';
  }


  if (isHttpWebUrl && !isCloudinary && !attachment.publicId) {
    return 'link';
  }

  return 'file';
}

export function isLinkKind(kind) {
  return ['instagram_reel', 'instagram_post', 'linkedin_post', 'youtube', 'twitter', 'github', 'link'].includes(kind);
}

export function getKindLabel(kind) {
  switch (kind) {
    case 'instagram_reel': return 'Instagram Reel';
    case 'instagram_post': return 'Instagram Post';
    case 'linkedin_post': return 'LinkedIn Post';
    case 'youtube': return 'YouTube Video';
    case 'twitter': return 'X Post';
    case 'github': return 'GitHub';
    case 'link': return 'Link';
    case 'pdf': return 'PDF';
    case 'image': return 'Image';
    case 'audio': return 'Voice Note';
    case 'video': return 'Video';
    case 'presentation': return 'Presentation';
    case 'document': return 'Document';
    case 'file': return 'File';
    default: return 'Resource';
  }
}

export function getOpenLabel(kind) {
  switch (kind) {
    case 'instagram_reel': return 'Open Reel';
    case 'instagram_post': return 'Open Instagram';
    case 'linkedin_post': return 'Open LinkedIn';
    case 'youtube': return 'Play Video';
    case 'twitter': return 'Open Post';
    case 'github': return 'Open GitHub';
    case 'link': return 'Open Link';
    case 'pdf': return 'View PDF';
    case 'image': return 'View Image';
    case 'audio': return 'Play Audio';
    case 'video': return 'Play Video';
    case 'presentation': return 'View Presentation';
    case 'document': return 'View Document';
    default: return 'View File';
  }
}

export function resolveAttachmentFileName(attachment, fallback = '') {
  if (!attachment) return fallback || 'Resource';

  const kind = getAttachmentKind(attachment);
  const defaultFallback = fallback || (kind === 'pdf' ? 'document.pdf' : isLinkKind(kind) ? getKindLabel(kind) : 'File');

  if (typeof attachment === 'string') {
    return isLinkKind(kind) ? getKindLabel(kind) : (extractFilenameFromUrl(attachment) || defaultFallback);
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
  if (url && typeof url === 'string' && !isLinkKind(kind)) {
    const extracted = extractFilenameFromUrl(url);
    if (extracted) return extracted;
  }

  if (attachment.title && typeof attachment.title === 'string') {
    const title = attachment.title.trim();
    if (kind === 'pdf') {
      return title.toLowerCase().endsWith('.pdf') ? title : `${title}.pdf`;
    }
    return title;
  }

  return defaultFallback;
}

export function getPreviewUrl(url, filename = '') {
  if (!url || typeof url !== 'string') return url;

  let previewUrl = url.trim();

  if (previewUrl.includes('cloudinary.com')) {
    const apiBase = `${import.meta.env.VITE_API_URL || ''}/api`;
    const safeFilename = filename || extractFilenameFromUrl(previewUrl) || 'document.pdf';
    return `${apiBase}/upload/preview?url=${encodeURIComponent(previewUrl)}&filename=${encodeURIComponent(safeFilename)}`;
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
  const isLink = /^(https?:\/\/)/i.test(url) && !url.includes('cloudinary.com') && !_getExtension(url);
  if (isLink) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  const resolvedName = filename || extractFilenameFromUrl(url) || 'document.pdf';
  const previewUrl = getPreviewUrl(url, resolvedName);
  window.open(previewUrl, '_blank', 'noopener,noreferrer');
}

