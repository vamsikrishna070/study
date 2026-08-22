export const appVersionConfig = {
  latestVersion: process.env.LATEST_APP_VERSION || '1.0.1',
  latestVersionCode: Number(process.env.LATEST_APP_VERSION_CODE || 2),
  minimumSupportedVersionCode: Number(process.env.MINIMUM_SUPPORTED_VERSION_CODE || 1),
  downloadUrl: process.env.APP_DOWNLOAD_URL || 'https://study-o20l.onrender.com/downloads/studyarena.apk',
  releaseNotes: [
    'StudyArena Direct APK Release',
    'Offline & live study session tracking',
    'Smart reminders with persistent audio previews',
    'Syllabus & topic extraction workspace',
    'Direct APK update notifications & downloads'
  ],
  forceUpdate: false,
};
