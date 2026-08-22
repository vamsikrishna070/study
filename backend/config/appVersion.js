export const appVersionConfig = {
  latestVersion: '1.0.1',
  latestVersionCode: 2,

  minimumSupportedVersionCode: 1,

  downloadUrl:
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/vamsikrishna070/study/releases/download/v1.0.1/studyarena-1.0.1.apk',
    
  releaseNotes: [
    'Improved reminders and notification accuracy',
    'Enhanced study sessions and focus timer',
    'Mobile UI and navigation improvements',
    'Bug fixes and performance enhancements'
  ],

  forceUpdate: false,
};

export default appVersionConfig;