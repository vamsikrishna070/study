export const ALLOWED_AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.3gp', '.opus', '.oga'];

export const DISALLOWED_EXTENSIONS = [
  '.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.gif',
  '.webp', '.svg', '.bmp', '.zip', '.rar', '.7z', '.tar', '.gz',
  '.apk', '.exe', '.json', '.xml', '.csv', '.xlsx', '.xls', '.pptx',
  '.ppt', '.mp4', '.mkv', '.avi', '.mov', '.webm', '.html', '.htm',
];

export const AUDIO_VALIDATION_ERROR_MSG = 'Please select an audio file (MP3, WAV, M4A, AAC, or OGG).';

function validateAudioFileLocal(asset) {
  if (!asset || !asset.uri) {
    return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
  }

  const rawName = (asset.name || asset.filename || '').trim();
  const mime = (asset.mimeType || '').toLowerCase().trim();

  // 1. Check MIME type where available
  const rejectedMimePrefixes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats',
    'text/',
    'image/',
    'video/',
    'application/zip',
    'application/x-zip',
    'application/x-rar',
  ];
  if (rejectedMimePrefixes.some((prefix) => mime.startsWith(prefix) || mime.includes(prefix))) {
    return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
  }

  // Extract file extension
  const cleanName = rawName.split('?')[0].split('#')[0];
  const dotIndex = cleanName.lastIndexOf('.');
  const ext = dotIndex !== -1 ? cleanName.substring(dotIndex).toLowerCase() : '';

  // 2. Check extension
  if (ext) {
    if (DISALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_AUDIO_EXTENSIONS.includes(ext)) {
      return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
    }
  } else {
    // If no extension in filename, MIME type MUST be audio/
    if (!mime.startsWith('audio/')) {
      return { valid: false, error: AUDIO_VALIDATION_ERROR_MSG };
    }
  }

  // 3. Check size > 0
  if (asset.size !== undefined && asset.size <= 0) {
    return { valid: false, error: 'Selected audio file is empty.' };
  }

  return { valid: true };
}

function runAudioValidationTests() {
  console.log('--- STARTING AUDIO VALIDATION TEST SUITE ---');
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  // Test Cases: Disallowed Files
  const pdfAsset = { uri: 'file:///path/to/studyarena.pdf', name: 'studyarena.pdf', mimeType: 'application/pdf', size: 1024 };
  const pdfRes = validateAudioFileLocal(pdfAsset);
  assert(!pdfRes.valid && pdfRes.error === AUDIO_VALIDATION_ERROR_MSG, 'PDF (application/pdf, studyarena.pdf) -> REJECT');

  const txtAsset = { uri: 'file:///path/to/notes.txt', name: 'notes.txt', mimeType: 'text/plain', size: 500 };
  const txtRes = validateAudioFileLocal(txtAsset);
  assert(!txtRes.valid && txtRes.error === AUDIO_VALIDATION_ERROR_MSG, 'TXT (text/plain, notes.txt) -> REJECT');

  const docxAsset = { uri: 'file:///path/to/syllabus.docx', name: 'syllabus.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 2048 };
  const docxRes = validateAudioFileLocal(docxAsset);
  assert(!docxRes.valid && docxRes.error === AUDIO_VALIDATION_ERROR_MSG, 'DOCX (syllabus.docx) -> REJECT');

  const jpgAsset = { uri: 'file:///path/to/photo.jpg', name: 'photo.jpg', mimeType: 'image/jpeg', size: 5000 };
  const jpgRes = validateAudioFileLocal(jpgAsset);
  assert(!jpgRes.valid && jpgRes.error === AUDIO_VALIDATION_ERROR_MSG, 'JPG (image/jpeg, photo.jpg) -> REJECT');

  const pngAsset = { uri: 'file:///path/to/diagram.png', name: 'diagram.png', mimeType: 'image/png', size: 6000 };
  const pngRes = validateAudioFileLocal(pngAsset);
  assert(!pngRes.valid && pngRes.error === AUDIO_VALIDATION_ERROR_MSG, 'PNG (image/png, diagram.png) -> REJECT');

  const zipAsset = { uri: 'file:///path/to/archive.zip', name: 'archive.zip', mimeType: 'application/zip', size: 10000 };
  const zipRes = validateAudioFileLocal(zipAsset);
  assert(!zipRes.valid && zipRes.error === AUDIO_VALIDATION_ERROR_MSG, 'ZIP (application/zip, archive.zip) -> REJECT');

  // Test Disguised MIME (e.g. PDF named with generic octet-stream)
  const disguisedPdf = { uri: 'content://provider/doc.pdf', name: 'assignment.pdf', mimeType: 'application/octet-stream', size: 4000 };
  const disguisedPdfRes = validateAudioFileLocal(disguisedPdf);
  assert(!disguisedPdfRes.valid, 'Disguised PDF with octet-stream MIME -> REJECT');

  // Test Disguised Extension (e.g. PDF named .mp3 but returned with application/pdf MIME)
  const disguisedMime = { uri: 'content://provider/fake.mp3', name: 'fake.mp3', mimeType: 'application/pdf', size: 4000 };
  const disguisedMimeRes = validateAudioFileLocal(disguisedMime);
  assert(!disguisedMimeRes.valid, 'Fake MP3 extension with application/pdf MIME -> REJECT');

  // Test Empty Audio File
  const emptyMp3 = { uri: 'file:///path/to/empty.mp3', name: 'empty.mp3', mimeType: 'audio/mpeg', size: 0 };
  const emptyMp3Res = validateAudioFileLocal(emptyMp3);
  assert(!emptyMp3Res.valid && emptyMp3Res.error.includes('empty'), 'Empty MP3 file (size: 0) -> REJECT');

  // Test Allowed Audio Files
  const mp3Asset = { uri: 'file:///path/to/bell.mp3', name: 'bell.mp3', mimeType: 'audio/mpeg', size: 15000 };
  assert(validateAudioFileLocal(mp3Asset).valid, 'MP3 (audio/mpeg, bell.mp3) -> ACCEPT');

  const wavAsset = { uri: 'file:///path/to/alarm.wav', name: 'alarm.wav', mimeType: 'audio/wav', size: 45000 };
  assert(validateAudioFileLocal(wavAsset).valid, 'WAV (audio/wav, alarm.wav) -> ACCEPT');

  const m4aAsset = { uri: 'file:///path/to/chime.m4a', name: 'chime.m4a', mimeType: 'audio/m4a', size: 20000 };
  assert(validateAudioFileLocal(m4aAsset).valid, 'M4A (audio/m4a, chime.m4a) -> ACCEPT');

  const aacAsset = { uri: 'file:///path/to/tone.aac', name: 'tone.aac', mimeType: 'audio/aac', size: 18000 };
  assert(validateAudioFileLocal(aacAsset).valid, 'AAC (audio/aac, tone.aac) -> ACCEPT');

  const oggAsset = { uri: 'file:///path/to/alert.ogg', name: 'alert.ogg', mimeType: 'audio/ogg', size: 25000 };
  assert(validateAudioFileLocal(oggAsset).valid, 'OGG (audio/ogg, alert.ogg) -> ACCEPT');

  console.log(`\n==================================================`);
  console.log(`AUDIO VALIDATION TEST COMPLETE: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runAudioValidationTests();
