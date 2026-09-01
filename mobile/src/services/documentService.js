import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { openNativeDocument } from './AlarmModule';

const DOCUMENTS_CACHE_DIR_NAME = 'documents';
const CUSTOM_SOUNDS_DIR_NAME = 'audio';

export function getOrCreateDirectory(base = 'cache', subDir = DOCUMENTS_CACHE_DIR_NAME) {
  const baseDir = base === 'document' ? Paths.document : Paths.cache;
  const dir = new Directory(baseDir, subDir);
  if (!dir.exists) {
    try {
      dir.create({ intermediates: true });
    } catch (e) {

    }
  }
  return dir;
}

export function getSafeFilename(filename, fallback = 'document.pdf') {
  if (!filename || typeof filename !== 'string') return fallback;
  const clean = filename
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_');
  return clean || fallback;
}

export async function validatePdfFile(fileOrUri) {
  try {
    const file = typeof fileOrUri === 'string' ? new File(fileOrUri) : fileOrUri;
    if (!file.exists || file.size === 0) return false;

    const textSample = await file.text();
    return textSample.startsWith('%PDF') || textSample.includes('%PDF-');
  } catch (e) {
    try {
      const file = typeof fileOrUri === 'string' ? new File(fileOrUri) : fileOrUri;
      return file.exists && file.size > 0;
    } catch {
      return false;
    }
  }
}

export function getCachedPdfFile(remoteUrl, originalName = 'document.pdf') {
  const cacheDir = getOrCreateDirectory('cache', DOCUMENTS_CACHE_DIR_NAME);
  let hash = 0;
  for (let i = 0; i < remoteUrl.length; i++) {
    hash = (hash << 5) - hash + remoteUrl.charCodeAt(i);
    hash |= 0;
  }
  const safeName = getSafeFilename(originalName, 'document.pdf');
  const cacheFilename = `${Math.abs(hash)}_${safeName}`;
  return new File(cacheDir, cacheFilename);
}

export async function downloadPdf(remoteUrl, originalName = 'document.pdf', onProgress) {
  if (!remoteUrl || typeof remoteUrl !== 'string') {
    throw new Error('Download URL is required.');
  }

  const safeName = getSafeFilename(originalName, 'document.pdf');
  const targetFile = getCachedPdfFile(remoteUrl, safeName);

  if (targetFile.exists && targetFile.size > 0) {
    if (typeof onProgress === 'function') onProgress(100);
    return {
      uri: targetFile.uri,
      filename: safeName,
      size: targetFile.size,
      fromCache: true,
    };
  }

  try {
    const downloadedFile = await File.downloadFileAsync(remoteUrl, targetFile, {
      idempotent: true,
    });

    if (!downloadedFile.exists || downloadedFile.size === 0) {
      throw new Error('Downloaded document is empty.');
    }

    if (typeof onProgress === 'function') onProgress(100);

    return {
      uri: downloadedFile.uri,
      filename: safeName,
      size: downloadedFile.size,
      fromCache: false,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[DocumentService] Download error:', error);
    }
    throw new Error('Could not download the document. Please check your network connection.');
  }
}

export async function viewPdf(urlOrUri, originalName = 'document.pdf') {
  if (!urlOrUri) {
    throw new Error('Document URL is not available.');
  }

  const safeName = getSafeFilename(originalName, 'document.pdf');
  let localFile;

  if (urlOrUri.startsWith('http://') || urlOrUri.startsWith('https://')) {
    try {
      const res = await downloadPdf(urlOrUri, safeName);
      localFile = new File(res.uri);
    } catch (dlErr) {
      if (__DEV__) console.warn('[DocumentService] Download error, falling back to direct URL browser:', dlErr);
      try {
        await WebBrowser.openBrowserAsync(urlOrUri, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
          showTitle: true,
          enableBarCollapsing: true,
        });
        return { success: true, uri: urlOrUri };
      } catch (wbErr) {
        throw new Error('Could not open remote document.');
      }
    }
  } else {
    localFile = new File(urlOrUri);
  }

  if (!localFile || !localFile.exists || localFile.size === 0) {
    throw new Error('Could not access document file.');
  }

  if (Platform.OS === 'android') {
    try {
      const opened = await openNativeDocument(localFile.uri, 'application/pdf');
      if (opened) {
        return { success: true, uri: localFile.uri };
      }
    } catch (nativeErr) {
      if (__DEV__) console.warn('[DocumentService] Native document viewer intent failed:', nativeErr);
    }
  }

  if (urlOrUri.startsWith('http://') || urlOrUri.startsWith('https://')) {
    try {
      await WebBrowser.openBrowserAsync(urlOrUri, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        showTitle: true,
        enableBarCollapsing: true,
      });
      return { success: true, uri: urlOrUri };
    } catch (e) {
      if (__DEV__) console.warn('[DocumentService] In-app browser failed:', e);
    }
  }

  throw new Error('No application found on device to view this document.');
}

export async function sharePdf(urlOrUri, originalName = 'document.pdf') {
  if (!urlOrUri) {
    throw new Error('Document URL is not available.');
  }

  const safeName = getSafeFilename(originalName, 'document.pdf');
  let localUri = urlOrUri;

  if (urlOrUri.startsWith('http://') || urlOrUri.startsWith('https://')) {
    const res = await downloadPdf(urlOrUri, safeName);
    localUri = res.uri;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(localUri, {
    mimeType: 'application/pdf',
    dialogTitle: `Share ${safeName}`,
    UTI: 'com.adobe.pdf',
  });
}

export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.3gp', '.opus', '.oga'];

export const DISALLOWED_EXTENSIONS = [
  '.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif',
  '.webp', '.svg', '.bmp', '.zip', '.rar', '.7z', '.tar', '.gz',
  '.apk', '.exe', '.json', '.xml', '.csv', '.xlsx', '.xls', '.pptx',
  '.ppt', '.mp4', '.mkv', '.avi', '.mov', '.webm', '.html', '.htm',
];

export const AUDIO_VALIDATION_ERROR_MSG = 'Please select an audio file (MP3, WAV, M4A, AAC, or OGG).';

export async function validateAudioFile(asset) {
  if (!asset || !asset.uri) {
    return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
  }

  const rawName = (asset.name || asset.filename || '').trim();
  const mime = (asset.mimeType || '').toLowerCase().trim();

  const rejectedMimePrefixes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats',
    'text/',
    'image/',
    'video/',
    'application/zip',
    'application/x-zip',
    'application/x-rar',
  ];
  if (rejectedMimePrefixes.some((prefix) => mime.startsWith(prefix) || mime.includes(prefix))) {
    return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
  }

  const cleanName = rawName.split('?')[0].split('#')[0];
  const dotIndex = cleanName.lastIndexOf('.');
  const ext = dotIndex !== -1 ? cleanName.substring(dotIndex).toLowerCase() : '';

  if (ext) {
    if (DISALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
    }
  } else {
    if (!mime.startsWith('audio/')) {
      return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
    }
  }

  try {
    const file = new File(asset.uri);
    if (!file.exists) {
      return { valid: false, error: 'Selected audio file could not be found.' };
    }
    if (file.size === 0) {
      return { valid: false, error: 'Selected audio file is empty.' };
    }
  } catch (e) {
    if (asset.size !== undefined && asset.size === 0) {
      return { valid: false, error: 'Selected audio file is empty.' };
    }
  }

  return { valid: true };
}

export async function saveCustomAudio(asset) {
  const validation = await validateAudioFile(asset);
  if (!validation.valid) {
    throw new Error(validation.error || AUDIO_VALIDATION_ERROR_MSG);
  }

  const sourceUri = asset.uri;
  const isContentUri = sourceUri.startsWith('content://');
  const isFileUri = sourceUri.startsWith('file://');
  const rawName = asset.name || 'custom_sound';

  let ext = '';
  if (rawName && rawName.includes('.')) {
    ext = rawName.substring(rawName.lastIndexOf('.')).toLowerCase();
  } else if (asset.mimeType) {
    const mime = asset.mimeType.toLowerCase();
    if (mime.includes('wav')) ext = '.wav';
    else if (mime.includes('m4a') || mime.includes('mp4') || mime.includes('aac')) ext = '.m4a';
    else if (mime.includes('ogg') || mime.includes('opus')) ext = '.ogg';
    else if (mime.includes('flac')) ext = '.flac';
    else if (mime.includes('3gp')) ext = '.3gp';
    else if (mime.includes('mpeg') || mime.includes('mp3')) ext = '.mp3';
    else ext = '.mp3';
  } else {
    ext = '.mp3';
  }

  if (!ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
    throw new Error(AUDIO_VALIDATION_ERROR_MSG);
  }

  const baseName = rawName && rawName.includes('.') ? rawName.substring(0, rawName.lastIndexOf('.')) : (rawName || 'custom_sound');
  const cleanBase = getSafeFilename(baseName, 'custom_sound');
  const uniqueName = `audio_${Date.now()}_${cleanBase}${ext}`;

  console.log(`[AUDIO PICK DEBUG]
asset: ${JSON.stringify(asset)}
uri: ${sourceUri}
name: ${rawName}
mimeType: ${asset.mimeType || 'unknown'}
size: ${asset.size ?? -1}
fileName: ${uniqueName}
isContentUri: ${isContentUri}
isFileUri: ${isFileUri}
copyStarted: true`);

  const soundsDir = getOrCreateDirectory('document', CUSTOM_SOUNDS_DIR_NAME);
  const destinationFile = new File(soundsDir, uniqueName);

  try {
    const sourceFile = new File(sourceUri);
    let copyMethod = 'copy';
    try {
      await sourceFile.copy(destinationFile);
    } catch (copyErr) {
      copyMethod = 'arrayBuffer fallback';
      console.warn('[AUDIO PICK DEBUG] sourceFile.copy direct failed, trying arrayBuffer stream:', copyErr?.message);
      const buffer = await sourceFile.arrayBuffer();
      if (buffer && buffer.byteLength > 0) {
        await destinationFile.write(new Uint8Array(buffer));
      } else {
        throw new Error('Read 0 bytes from source audio file.');
      }
    }

    const destinationExists = destinationFile.exists;
    const destinationSize = destinationFile.size;

    console.log(`[AUDIO PICK DEBUG]
copyCompleted: true (${copyMethod})
destinationUri: ${destinationFile.uri}
destinationExists: ${destinationExists}
destinationSize: ${destinationSize}`);

    if (!destinationExists || destinationSize === 0) {
      throw new Error(`Audio file copy failed validation: exists=${destinationExists}, size=${destinationSize}`);
    }

    return {
      uri: destinationFile.uri,
      name: rawName,
      size: destinationSize,
    };
  } catch (error) {
    console.error(`[AUDIO PICK ERROR]
message: ${error?.message}
stack: ${error?.stack}
asset: ${JSON.stringify(asset)}
uri: ${sourceUri}
mimeType: ${asset.mimeType || 'unknown'}
size: ${asset.size ?? -1}
name: ${rawName}`);
    throw error;
  }
}
