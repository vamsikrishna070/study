const appVersionConfig = {
  latestVersion: '1.0.5',
  latestVersionCode: 6,

  minimumSupportedVersionCode: 1,

  downloadUrl:
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/vamsikrishna070/study/releases/download/v1.0.5/studyarena-1.0.5.apk',

  releaseNotes: [
    'Added Start, Stop, and End controls for Tasks.',
    'Added Complete by deadlines for Tasks.',
    'Added automatic 1-hour-before deadline notifications.',
    'Added optional 24-hour recurring Task reminders.',
    'Kept Task notifications separate from the existing Reminder and Alarm systems.',
    'Added multiple PDF, image, and audio attachments to Resources.',
    'Added individual attachment deletion.',
    'Added Resource editing.',
    'Added proper link handling for web URLs such as Instagram, YouTube, and GitHub.',
    'Improved PDF, image, and audio attachment opening based on file type.',
    'Improved universal syllabus extraction for table-based university syllabi.',
    'Added semantic table-column detection to separate syllabus content from metadata.',
    'Improved Theory and Laboratory syllabus extraction.',
    'Preserved legitimate numbers in syllabus topics such as 0/1, IPv4, and 3-SAT.',
    'Improved OCR and hybrid/scanned PDF handling.',
    'Fixed mobile syllabus extraction and rendering issues.',
    'Added whole-app App Lock with biometric authentication and PIN fallback.',
    'Added configurable App Lock timeout options.',
    'Improved Web and Mobile consistency for Tasks and Resources.',
    'Fixed various Mobile UI and stability issues.',
  ],

  forceUpdate: false,
};

export default appVersionConfig;