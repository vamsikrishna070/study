export const appVersionConfig = {
  latestVersion: '1.0.3',
  latestVersionCode: 4,

  minimumSupportedVersionCode: 1,

  downloadUrl:
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/vamsikrishna070/study/releases/download/v1.0.3/studyarena-1.0.3.apk',
    
  releaseNotes: [
    'Complete voice notes & audio playback in Notes & Resources',
    'Dedicated native PDF viewer without triggering system share sheet',
    'Password visibility toggle alignment & state fixes',
    'Responsive update dialog & authoritative version comparison',
    'Bug fixes and performance improvements'
  ],

  forceUpdate: false,
};

export default appVersionConfig;