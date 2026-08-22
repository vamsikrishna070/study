import { appVersionConfig } from '../config/appVersion.js';

/**
 * @desc Get latest app version info for direct APK updates
 * @route GET /api/app/version
 * @access Public
 */
export function getAppVersion(req, res) {
  res.json({
    success: true,
    latestVersion: appVersionConfig.latestVersion,
    latestVersionCode: appVersionConfig.latestVersionCode,
    minimumSupportedVersionCode: appVersionConfig.minimumSupportedVersionCode,
    downloadUrl: appVersionConfig.downloadUrl,
    releaseNotes: appVersionConfig.releaseNotes,
    forceUpdate: appVersionConfig.forceUpdate,
  });
}
