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
  if (!attachment) return 'unknown';

  const mime = String(attachment.mimeType || '').toLowerCase();
  const type = String(attachment.type || attachment.resourceType || '').toLowerCase();
  const name = String(attachment.originalName || attachment.name || '').toLowerCase();
  const url = String(attachment.url || '').toLowerCase();

  if (type === 'link' || type === 'youtube') return 'link';

  if (mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  if (mime.includes('presentation') || mime.includes('powerpoint')) return 'presentation';
  if (mime.includes('msword') || mime.includes('wordprocessingml') || mime.includes('document')) return 'document';

  if (type === 'recording') return 'audio';
  if (type === 'image') return 'image';
  if (type === 'audio') return 'audio';
  if (type === 'video') return 'video';
  if (type === 'document') return 'document';

  const ext = _getExtension(name) || _getExtension(url);
  if (ext === '.pdf') return 'pdf';
  if (['.ppt', '.pptx'].includes(ext)) return 'presentation';
  if (['.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx'].includes(ext)) return 'document';
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.svg'].includes(ext)) return 'image';
  if (['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.opus', '.3gp'].includes(ext)) return 'audio';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video';

  return 'file';
}

export function getKindLabel(kind) {
  switch (kind) {
    case 'pdf': return 'PDF';
    case 'image': return 'Image';
    case 'audio': return 'Audio';
    case 'video': return 'Video';
    case 'presentation': return 'Presentation';
    case 'document': return 'Document';
    case 'link': return 'Link';
    case 'file': return 'File';
    default: return 'File';
  }
}

export function getOpenLabel(kind) {
  switch (kind) {
    case 'pdf': return 'View PDF';
    case 'image': return 'View Image';
    case 'video': return 'Play Video';
    case 'audio': return 'Play Audio';
    case 'presentation': return 'View Presentation';
    case 'document': return 'View Document';
    case 'link': return 'Open Link';
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

  if (kind === 'link') {
    await Linking.openURL(rawUrl);
    return { success: true, method: 'linking' };
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
  if (!name) return '';
  const clean = name.split('?')[0].split('#')[0];
  const dot = clean.lastIndexOf('.');
  return dot !== -1 ? clean.substring(dot).toLowerCase() : '';
}

