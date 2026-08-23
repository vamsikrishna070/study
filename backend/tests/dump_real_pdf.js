import dotenv from 'dotenv';
import { default as m } from 'mongoose';
import { PDFParse } from 'pdf-parse';
import { parsePdfBufferToText } from '../services/syllabusExtractorService.js';
dotenv.config();

async function debugPdf() {
  await m.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const subjects = await m.connection.db.collection('subjects').find({ 'syllabusFile.url': { $exists: true } }).toArray();
  console.log(`Found ${subjects.length} subjects with syllabusFile.`);

  for (const s of subjects) {
    if (!s.syllabusFile?.url) continue;
    console.log(`\n================================================================================`);
    console.log(`SUBJECT: "${s.name}" | ORIGINAL NAME: "${s.syllabusFile.originalName}"`);
    console.log(`URL: ${s.syllabusFile.url}`);
    console.log(`================================================================================`);

    const resp = await fetch(s.syllabusFile.url);
    if (!resp.ok) {
      console.log(`Fetch failed with status ${resp.status}`);
      continue;
    }
    const buffer = Buffer.from(await resp.arrayBuffer());
    console.log(`Downloaded bytes: ${buffer.length}`);

    // Parse with PDFParse instance to get page info and metadata
    try {
      const fullText = await parsePdfBufferToText(buffer);
      console.log(`[parsePdfBufferToText] Full Text Length: ${fullText.length}`);
      
      console.log('\n--- RAW TEXT DUMP (FIRST 3000 CHARS) ---');
      console.log(fullText.slice(0, 3000));
      console.log('\n--- RAW TEXT DUMP (CHAR 3000-6000) ---');
      console.log(fullText.slice(3000, 6000));
      console.log('\n--- RAW TEXT DUMP (CHAR 6000+) ---');
      console.log(fullText.slice(6000));

      // Let's check for keywords in raw text:
      console.log('\n--- KEYWORD SEARCH IN RAW TEXT ---');
      const keywords = ['UNIT', 'Unit', 'MODULE', 'Module', 'Theory', 'THEORY', 'Lab', 'LAB', 'Experiment', 'EXPERIMENT', 'Course Unitization', 'Course Utilization'];
      for (const kw of keywords) {
        const count = (fullText.match(new RegExp(kw, 'g')) || []).length;
        console.log(`Keyword "${kw}": ${count} occurrences`);
      }
    } catch (e) {
      console.error('PDFParse error:', e);
    }
  }

  await m.disconnect();
}

debugPdf().catch(e => {
  console.error('Debug script error:', e);
  process.exit(1);
});
