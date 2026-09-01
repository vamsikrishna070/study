import { Linking } from 'react-native';
import * as Application from 'expo-application';
import client from '../api/client';

export const UPDATE_STATUS = {
  UP_TO_DATE: 'UP_TO_DATE',
  UPDATE_AVAILABLE: 'UPDATE_AVAILABLE',
  FORCE_UPDATE: 'FORCE_UPDATE',
  UNKNOWN: 'UNKNOWN',
};

export function getAppVersionInfo() {
  const versionName = Application.nativeApplicationVersion || '1.0.2';
  const rawBuildVersion = Application.nativeBuildVersion || '3';
  const versionCode = Number(rawBuildVersion) || 3;
  const applicationId = Application.applicationId || 'com.studyarena.mobile';

  return {
    versionName,
    versionCode,
    applicationId,
    displayString: `v${versionName} (Build ${versionCode})`,
  };
}

export function evaluateUpdateState({
  installedVersionCode,
  latestVersionCode,
  minimumSupportedVersionCode = 1,
  serverForceUpdate = false,
}) {
  const installed = Number(installedVersionCode);
  const latest = Number(latestVersionCode);
  const minSupported = Number(minimumSupportedVersionCode);

  if (isNaN(installed) || isNaN(latest) || installed <= 0 || latest <= 0) {
    return {
      status: UPDATE_STATUS.UNKNOWN,
      updateAvailable: false,
      forceUpdate: false,
    };
  }

  if (installed < minSupported || (serverForceUpdate && latest > installed)) {
    return {
      status: UPDATE_STATUS.FORCE_UPDATE,
      updateAvailable: true,
      forceUpdate: true,
    };
  }

  if (latest > installed) {
    return {
      status: UPDATE_STATUS.UPDATE_AVAILABLE,
      updateAvailable: true,
      forceUpdate: false,
    };
  }

  return {
    status: UPDATE_STATUS.UP_TO_DATE,
    updateAvailable: false,
    forceUpdate: false,
  };
}

export async function checkForAppUpdate() {
  const installed = getAppVersionInfo();

  try {
    const response = await client.get('/app/version');
    const data = response.data || {};

    const latestVersion = String(data.latestVersion || '');
    const latestVersionCode = Number(data.latestVersionCode);
    const minimumSupportedVersionCode = Number(data.minimumSupportedVersionCode) || 1;
    const downloadUrl = String(data.downloadUrl || '');
    const releaseNotes = Array.isArray(data.releaseNotes) ? data.releaseNotes : [];
    const serverForceUpdate = Boolean(data.forceUpdate);

    const evaluation = evaluateUpdateState({
      installedVersionCode: installed.versionCode,
      latestVersionCode,
      minimumSupportedVersionCode,
      serverForceUpdate,
    });

    console.log(
      `[APP UPDATE CHECK]\ninstalledVersionName: ${installed.versionName}\ninstalledVersionCode: ${installed.versionCode}\nlatestVersion: ${latestVersion}\nlatestVersionCode: ${latestVersionCode}\nminimumSupportedVersionCode: ${minimumSupportedVersionCode}\nupdateAvailable: ${evaluation.updateAvailable}\nforceUpdate: ${evaluation.forceUpdate}\nstatus: ${evaluation.status}`
    );

    return {
      success: true,
      status: evaluation.status,
      isUpdateAvailable: evaluation.updateAvailable,
      isForced: evaluation.forceUpdate,
      latestVersion,
      latestVersionCode,
      minimumSupportedVersionCode,
      installedVersion: installed.versionName,
      installedVersionCode: installed.versionCode,
      downloadUrl,
      releaseNotes,
    };
  } catch (error) {
    console.log(
      `[APP UPDATE CHECK]\ninstalledVersionName: ${installed.versionName}\ninstalledVersionCode: ${installed.versionCode}\nlatestVersion: UNKNOWN\nlatestVersionCode: UNKNOWN\nminimumSupportedVersionCode: 1\nupdateAvailable: false\nforceUpdate: false\nstatus: UNKNOWN\nerror: ${error?.message || error}`
    );
    return {
      success: false,
      status: UPDATE_STATUS.UNKNOWN,
      isUpdateAvailable: false,
      isForced: false,
      installedVersion: installed.versionName,
      installedVersionCode: installed.versionCode,
      error: error?.message || 'Unable to fetch update information',
    };
  }
}

export async function openApkDownloadUrl(downloadUrl) {
  if (!downloadUrl || typeof downloadUrl !== 'string') {
    throw new Error('Download URL is not available.');
  }

  const trimmedUrl = downloadUrl.trim();

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
