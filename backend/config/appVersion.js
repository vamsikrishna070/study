export const appVersionConfig = {
  latestVersion: '1.0.4',
  latestVersionCode: 5,

  minimumSupportedVersionCode: 1,

  downloadUrl:
    process.env.APP_DOWNLOAD_URL ||
    'https://github.com/vamsikrishna070/study/releases/download/v1.0.3/studyarena-1.0.4.apk',
    
  releaseNotes: [
    'Improved universal syllabus extraction (PDF, TXT, DOCX)',
    'Improved OCR handling for scanned/hybrid PDFs',
    'Improved theory and laboratory syllabus separation',
    'Improved document preview and PDF viewing',
    'Improved custom audio file validation',
    'Bug fixes and performance improvements'
  ],

  forceUpdate: false,
};

export default appVersionConfig;