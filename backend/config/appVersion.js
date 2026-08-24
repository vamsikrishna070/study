export const appVersionConfig = {
  latestVersion: '1.0.5',
  latestVersionCode: 6,

  minimumSupportedVersionCode: 1,

  downloadUrl:
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/vamsikrishna070/study/releases/download/v1.0.3/studyarena-1.0.4.apk',
    
  releaseNotes: [
    'Improved Tasks with Start, Stop, and End controls.',
    'Added "Complete by" deadlines for Tasks.',
    'Added automatic 1-hour-before Task notifications.',
    'Added optional 24-hour Task reminders.',
    'Task notifications remain separate from the existing Reminder/Alarm system.',
    'Improved Resources with multiple PDF, image, and audio attachments.',
    'Added individual attachment deletion for Resources.',
    'Added Resource editing support.',
    'Improved syllabus extraction for table-based university syllabi.',
    'Added semantic table-column detection for better metadata separation.',
    'Improved Theory and Laboratory extraction.',
    'Preserved legitimate numbers in syllabus topics such as `0/1`, `IPv4`, `3-SAT`, etc.',
    'Improved OCR/table extraction handling.',
    'Fixed mobile syllabus extraction and rendering issues.',
    'Improved Web/Mobile consistency for Resources and Tasks.',
  ],

  forceUpdate: false,
};

export default appVersionConfig;