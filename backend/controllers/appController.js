import { appVersionConfig } from '../config/appVersion.js';

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
