import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import client from '../api/client';

/**
 * Get current application version and numeric build code dynamically
 */
export function getAppVersionInfo() {
  const versionName = Application.nativeApplicationVersion || '1.0.0';
  const rawBuildVersion = Application.nativeBuildVersion || '1';
  const versionCode = parseInt(rawBuildVersion, 10) || 1;
  const applicationId = Application.applicationId || 'com.studyarena.mobile';

  return {
    versionName,
    versionCode,
    applicationId,
    displayString: `v${versionName} (Build ${versionCode})`,
  };
}

/**
 * Check backend for latest direct-APK release information
 * @returns {Promise<{
 *   isUpdateAvailable: boolean,
 *   isForced: boolean,
 *   latestVersion: string,
 *   latestVersionCode: number,
 *   minimumSupportedVersionCode: number,
 *   installedVersion: string,
 *   installedVersionCode: number,
 *   downloadUrl: string,
 *   releaseNotes: string[],
 * }>}
 */
export async function checkForAppUpdate() {
  const installed = getAppVersionInfo();

  try {
    const response = await client.get('/app/version');
    const data = response.data || {};

    const latestVersion = data.latestVersion || '1.0.0';
    const latestVersionCode = Number(data.latestVersionCode) || installed.versionCode;
    const minimumSupportedVersionCode = Number(data.minimumSupportedVersionCode) || 1;
    const downloadUrl = data.downloadUrl || '';
    const releaseNotes = Array.isArray(data.releaseNotes) ? data.releaseNotes : [];
    const serverForceUpdate = Boolean(data.forceUpdate);

    // Numeric comparison of versionCode (never alphabetical strings)
    const isUpdateAvailable = latestVersionCode > installed.versionCode;
    const isForced = isUpdateAvailable && (installed.versionCode < minimumSupportedVersionCode || serverForceUpdate);

    return {
      success: true,
      isUpdateAvailable,
      isForced,
      latestVersion,
      latestVersionCode,
      minimumSupportedVersionCode,
      installedVersion: installed.versionName,
      installedVersionCode: installed.versionCode,
      downloadUrl,
      releaseNotes,
    };
  } catch (error) {
    if (__DEV__) {
      console.log('[AppUpdateService] Check update error (ignored silently):', error?.message || error);
    }
    return {
      success: false,
      isUpdateAvailable: false,
      isForced: false,
      installedVersion: installed.versionName,
      installedVersionCode: installed.versionCode,
      error: error?.message || 'Unable to fetch update information',
    };
  }
}

/**
 * Open direct APK download URL securely in Android browser / download manager
 * @param {string} downloadUrl
 */
export async function openApkDownloadUrl(downloadUrl) {
  if (!downloadUrl || typeof downloadUrl !== 'string') {
    throw new Error('Download URL is not available.');
  }

  const trimmedUrl = downloadUrl.trim();

  // Security: only allow HTTPS URLs
  if (!trimmedUrl.startsWith('https://')) {
    throw new Error('Insecure download URL. Updates must use HTTPS.');
  }

  const supported = await Linking.canOpenURL(trimmedUrl);
  if (supported) {
    await Linking.openURL(trimmedUrl);
  } else {
    throw new Error('Unable to open APK download in browser.');
  }
}
