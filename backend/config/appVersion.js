const appVersionConfig = {
  latestVersion: '1.0.7',
  latestVersionCode: 8,
  minimumSupportedVersionCode: 1,

  downloadUrl:
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/vamsikrishna070/study/releases/download/v1.0.7/studyarena-1.0.7.apk',

  releaseNotes: [
    'Added EAS Update (OTA) support for JavaScript and React Native updates without rebuilding the APK.',
    'Added Expo Updates native runtime and OTA update infrastructure.',
    'Added user-controlled biometric authentication with secure persistent device storage.',
    'Biometric authentication is disabled by default for new and existing users.',
    'Users can enable Biometric Unlock from Privacy settings.',
    'PIN authentication remains available as the primary and fallback authentication method.',
    'Improved App Lock behavior with configurable automatic lock timeout options.',
    'Added SRM AP Student Portal integration with secure portal synchronization.',
    'Added automatic synchronization of student profile, academic details, subjects, attendance, timetable, CGPA and official marks from the SRM portal.',
    'Added automatic subject creation from synchronized SRM portal subjects while preserving user-edited subject data.',
    'Improved portal session handling and synchronization reliability.',
    'Improved attendance and timetable experience.',
    'Improved Web and Mobile synchronization for academic information and Settings.',
    'Improved professional error handling across the application.',
    'Fixed multiple Mobile UI, authentication and stability issues.',
    'Preserved existing Tasks, Reminders, Resources, Syllabus, Study Log and other StudyArena functionality.',
  ],

  forceUpdate: false,
};

export { appVersionConfig };
export default appVersionConfig;