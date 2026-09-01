import { Platform, Linking } from 'react-native';
import { openNativeDocument } from '../services/AlarmModule';
import { downloadPdf, getSafeFilename } from '../services/documentService';
import * as WebBrowser from 'expo-web-browser';

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

  if (type === 'recording') return 'audio';
  if (type === 'image') return 'image';
  if (type === 'audio') return 'audio';
  if (type === 'video') return 'video';

  const ext = _getExtension(name) || _getExtension(url);
  if (ext === '.pdf') return 'pdf';
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
    case 'link': return 'Link';
    case 'file': return 'File';
    default: return 'File';
  }
}

export function getOpenLabel(kind) {
  switch (kind) {
    case 'audio': return 'Play';
    case 'link': return 'Open Link';
    default: return 'Open';
  }
}

function _getMimeForKind(kind, attachment) {
  const mime = String(attachment?.mimeType || '').toLowerCase();
  if (mime && mime !== 'application/octet-stream') return mime;
  switch (kind) {
    case 'pdf':   return 'application/pdf';
    case 'image': return 'image/*';
    case 'audio': return 'audio/*';
    case 'video': return 'video/*';
    default:      return '*/*';
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
  const fileName = String(attachment.originalName || attachment.name || 'file');

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {

    try {
      const safeName = getSafeFilename(fileName, 'file');
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
