import { Platform, Linking } from 'react-native';
import { openNativeDocument } from '../services/AlarmModule';
import { downloadPdf, getSafeFilename } from '../services/documentService';
import * as WebBrowser from 'expo-web-browser';

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

export function getAttachmentKind(attachment) {
  if (!attachment) return 'file';

  const rawUrl = typeof attachment === 'string'
    ? attachment
    : (attachment.url || attachment.uri || attachment.fileUrl || attachment.fileData?.url || '');
  const url = String(rawUrl || '').trim();
  const explicitType = String(attachment.type || attachment.resourceType || '').toLowerCase();
  const rawMime = String(attachment.mimeType || attachment.fileData?.mimeType || '').toLowerCase();
  const name = String(attachment.originalName || attachment.name || attachment.filename || attachment.title || '').trim();

  // 1. External Social / Video Provider URLs take highest precedence
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

  // 2. Explicit link type, or external web link with no file extension & no Cloudinary storage
  if (explicitType === 'link' || (isHttpWebUrl && !isCloudinary && !ext && !attachment.publicId)) {
    return 'link';
  }

  // 3. Audio / Recording
  if (
    explicitType === 'recording' ||
    explicitType === 'audio' ||
    rawMime.startsWith('audio/') ||
    (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus', '.3gp', '.webm'].includes(ext) && (rawMime.includes('audio') || explicitType === 'recording'))
  ) {
    return 'audio';
  }

  // 4. Image
  if (
    explicitType === 'image' ||
    rawMime.startsWith('image/') ||
    ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(ext)
  ) {
    return 'image';
  }

  // 5. Video
  if (
    explicitType === 'video' ||
    rawMime.startsWith('video/') ||
    ['.mp4', '.mov', '.avi', '.mkv'].includes(ext)
  ) {
    return 'video';
  }

  // 6. Presentation
  if (
    rawMime.includes('presentation') ||
    rawMime.includes('powerpoint') ||
    ['.ppt', '.pptx'].includes(ext)
  ) {
    return 'presentation';
  }

  // 7. PDF (ensure it is genuinely a PDF, avoiding legacy false MIME on external links)
  if (
    (rawMime === 'application/pdf' || rawMime.includes('/pdf') || ext === '.pdf') &&
    (!isHttpWebUrl || isCloudinary || ext === '.pdf')
  ) {
    return 'pdf';
  }

  // 8. Document
  if (
    rawMime.includes('msword') ||
    rawMime.includes('wordprocessingml') ||
    rawMime.includes('officedocument') ||
    ['.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.csv'].includes(ext)
  ) {
    return 'document';
  }

  // 9. If it's a web URL without recognized file characteristics, default to link
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

function _getMimeForKind(kind, attachment) {
  const mime = String(attachment?.mimeType || '').toLowerCase();
  if (mime && mime !== 'application/octet-stream') return mime;
  switch (kind) {
    case 'pdf':          return 'application/pdf';
    case 'image':        return 'image/*';
    case 'audio':        return 'audio/*';
    case 'video':        return 'video/*';
    case 'presentation': return 'application/vnd.ms-powerpoint';
    case 'document':     return 'application/msword';
    default:             return '*/*';
  }
}

export async function openAttachment(attachment) {
  if (!attachment) throw new Error('No attachment provided.');

  const kind = getAttachmentKind(attachment);
  const rawUrl = String(attachment.url || attachment.uri || '');

  if (!rawUrl) throw new Error('No URL available for this attachment.');

  if (isLinkKind(kind)) {
    try {
      const supported = await Linking.canOpenURL(rawUrl);
      if (supported) {
        await Linking.openURL(rawUrl);
        return { success: true, method: 'linking' };
      }
    } catch {
      // Ignore and fallback to WebBrowser
    }

    try {
      await WebBrowser.openBrowserAsync(rawUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
        enableBarCollapsing: true,
      });
      return { success: true, method: 'browser', uri: rawUrl };
    } catch (e) {
      throw new Error('Could not open link.');
    }
  }

  const mime = _getMimeForKind(kind, attachment);
  const fileName = resolveAttachmentFileName(
    attachment,
    kind === 'pdf' ? 'document.pdf' : kind === 'image' ? 'image.png' : 'file'
  );

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    try {
      const safeName = getSafeFilename(fileName, 'document.pdf');
      const res = await downloadPdf(rawUrl, safeName);

      if (res && res.uri && res.size > 0 && Platform.OS === 'android') {
        const opened = await openNativeDocument(res.uri, mime);
        if (opened) return { success: true, method: 'native', uri: res.uri };
      }
    } catch (dlErr) {
      if (__DEV__) console.warn('[openAttachment] Download/native open failed:', dlErr);
    }

    try {
      await WebBrowser.openBrowserAsync(rawUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
        enableBarCollapsing: true,
      });
      return { success: true, method: 'browser', uri: rawUrl };
    } catch (e) {
      throw new Error('Could not open this file.');
    }
  }

  if (Platform.OS === 'android') {
    const opened = await openNativeDocument(rawUrl, mime);
    if (opened) return { success: true, method: 'native', uri: rawUrl };
  }

  throw new Error('No application found to open this file.');
}

function _getExtension(name) {
  if (!name || typeof name !== 'string') return '';
  const clean = name.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot !== -1 ? clean.substring(dot).toLowerCase() : '';
}

