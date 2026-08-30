const appVersionConfig = {
  latestVersion: '1.0.7',
  latestVersionCode: 8,

  minimumSupportedVersionCode: 1,

  downloadUrl:
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/vamsikrishna070/study/releases/download/v1.0.6/studyarena-1.0.6.apk',

  releaseNotes: [
    'Added EAS Update / OTA support establishing the OTA-enabled native baseline.',
    'Added expo-updates native runtime.',
    'Future compatible JavaScript/React Native fixes can be delivered through EAS Update without rebuilding the APK.',
    'Added user-controlled biometric authentication with persistent device storage.',
    'Biometric authentication is OFF by default for all existing and new users.',
    'Users can explicitly enable Biometric Unlock under Privacy settings.',
    'PIN remains available as the primary and fallback authentication method.',
    'App Lock ON with Biometric OFF prompts for PIN authentication directly.',
    'App Lock ON with Biometric ON attempts biometric authentication first with PIN fallback.',
    'Improved App Lock privacy settings and configurable auto-lock timeout options.',
    'Preserved existing Task notification functionality and deadlines.',
    'Preserved existing Reminder and Alarm systems.',
    'Preserved Resources and universal Syllabus extraction functionality.',
    'Fixed various Mobile UI and stability issues.',
  ],

  forceUpdate: false,
};

export { appVersionConfig };
export default appVersionConfig;