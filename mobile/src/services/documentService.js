import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

// ─── Directory Helpers ─────────────────────────────────────────────────────────

const DOCUMENTS_CACHE_DIR_NAME = 'documents';
const CUSTOM_SOUNDS_DIR_NAME = 'custom_sounds';

/**
 * Ensures the target sub-directory exists in cache or documents path
 * @param {'cache' | 'document'} base
 * @param {string} subDir
 * @returns {Directory}
 */
export function getOrCreateDirectory(base = 'cache', subDir = DOCUMENTS_CACHE_DIR_NAME) {
  const baseDir = base === 'document' ? Paths.document : Paths.cache;
  const dir = new Directory(baseDir, subDir);
  if (!dir.exists) {
    try {
      dir.create({ intermediates: true });
    } catch (e) {
      // Fallback: directory might already exist
    }
  }
  return dir;
}

/**
 * Sanitizes a filename to prevent path traversal and illegal characters
 * @param {string} filename
 * @param {string} fallback
 * @returns {string}
 */
export function getSafeFilename(filename, fallback = 'document.pdf') {
  if (!filename || typeof filename !== 'string') return fallback;
  const clean = filename
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_{2,}/g, '_');
  return clean || fallback;
}

/**
 * Validates whether a local file exists, is non-zero, and has %PDF magic bytes
 * @param {string | File} fileOrUri
 * @returns {Promise<boolean>}
 */
export async function validatePdfFile(fileOrUri) {
  try {
    const file = typeof fileOrUri === 'string' ? new File(fileOrUri) : fileOrUri;
    if (!file.exists || file.size === 0) return false;

    // Check first 16 bytes for %PDF- signature
    const textSample = await file.text();
    return textSample.startsWith('%PDF') || textSample.includes('%PDF-');
  } catch (e) {
    // If text read fails on large binary, fallback to existence & size check
    try {
      const file = typeof fileOrUri === 'string' ? new File(fileOrUri) : fileOrUri;
      return file.exists && file.size > 0;
    } catch {
      return false;
    }
  }
}

// ─── PDF Download & Cache ─────────────────────────────────────────────────────

/**
 * Generates a deterministic cache file for a remote URL
 * @param {string} remoteUrl
 * @param {string} originalName
 * @returns {File}
 */
export function getCachedPdfFile(remoteUrl, originalName = 'document.pdf') {
  const cacheDir = getOrCreateDirectory('cache', DOCUMENTS_CACHE_DIR_NAME);
  // Generate deterministic name using hash-like key and sanitized original name
  let hash = 0;
  for (let i = 0; i < remoteUrl.length; i++) {
    hash = (hash << 5) - hash + remoteUrl.charCodeAt(i);
    hash |= 0;
  }
  const safeName = getSafeFilename(originalName, 'document.pdf');
  const cacheFilename = `${Math.abs(hash)}_${safeName}`;
  return new File(cacheDir, cacheFilename);
}

/**
 * Downloads a remote PDF silently and caches it locally
 * @param {string} remoteUrl
 * @param {string} originalName
 * @param {Function} [onProgress]
 * @returns {Promise<{ uri: string, filename: string, size: number, fromCache: boolean }>}
 */
export async function downloadPdf(remoteUrl, originalName = 'document.pdf', onProgress) {
  if (!remoteUrl || typeof remoteUrl !== 'string') {
    throw new Error('Download URL is required.');
  }

  const safeName = getSafeFilename(originalName, 'document.pdf');
  const targetFile = getCachedPdfFile(remoteUrl, safeName);

  // Return from cache if already exists with valid non-zero size
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

// ─── PDF Viewing & Sharing ────────────────────────────────────────────────────

/**
 * Prepares and opens a local or remote PDF with the native PDF viewer experience
 * @param {string} urlOrUri Remote URL or local file URI
 * @param {string} originalName
 * @returns {Promise<{ success: boolean, uri: string }>}
 */
export async function viewPdf(urlOrUri, originalName = 'document.pdf') {
  if (!urlOrUri) {
    throw new Error('Document URL is not available.');
  }

  const safeName = getSafeFilename(originalName, 'document.pdf');
  let localUri = urlOrUri;

  // If remote URL, silently download to cache first
  if (urlOrUri.startsWith('http://') || urlOrUri.startsWith('https://')) {
    const res = await downloadPdf(urlOrUri, safeName);
    localUri = res.uri;
  }

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(localUri, {
      mimeType: 'application/pdf',
      dialogTitle: `View ${safeName}`,
      UTI: 'com.adobe.pdf',
    });
    return { success: true, uri: localUri };
  } else {
    throw new Error('Document viewing is not supported on this device.');
  }
}

/**
 * Shares a PDF with external apps (WhatsApp, Drive, Email, etc.)
 * @param {string} urlOrUri
 * @param {string} originalName
 * @returns {Promise<void>}
 */
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

// ─── Custom Audio Persistent Storage ──────────────────────────────────────────

/**
 * Copies a selected audio file (content:// or file://) to persistent app storage
 * @param {{ uri: string, name?: string, mimeType?: string, size?: number }} asset
 * @returns {Promise<{ uri: string, name: string, size: number }>}
 */
export async function saveCustomAudio(asset) {
  if (!asset || !asset.uri) {
    throw new Error('No audio file selected.');
  }

  const sourceUri = asset.uri;
  const rawName = asset.name || 'custom_sound.mp3';
  const cleanName = getSafeFilename(rawName, 'custom_sound.mp3');
  const uniqueName = `${Date.now()}_${cleanName}`;

  const soundsDir = getOrCreateDirectory('document', CUSTOM_SOUNDS_DIR_NAME);
  const destinationFile = new File(soundsDir, uniqueName);

  try {
    const sourceFile = new File(sourceUri);
    if (sourceFile.exists) {
      sourceFile.copy(destinationFile);
    } else {
      // If content:// uri or virtual uri, download/stream to destination
      await File.downloadFileAsync(sourceUri, destinationFile, { idempotent: true });
    }

    if (!destinationFile.exists || destinationFile.size === 0) {
      throw new Error('Audio file could not be saved to internal storage.');
    }

    return {
      uri: destinationFile.uri,
      name: rawName,
      size: destinationFile.size,
    };
  } catch (error) {
    if (__DEV__) {
      console.warn('[DocumentService] Save custom audio error:', error);
    }
    throw new Error('Could not process selected audio file. Please choose another file.');
  }
}
