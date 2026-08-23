# Syllabus Extraction Test Suite

This directory contains automated regression tests for the StudyArena universal syllabus extraction pipeline (ackend/services/syllabus/).

## Running Tests

From the ackend/ directory:

`ash
node tests/syllabusExtractor.test.js
# or via npm:
npm test
`

To run the audio upload validation suite:

`ash
node tests/audioValidation.test.js
`

The test suite runs **82 regression assertions** and **14 audio validation assertions** covering:

- Real university syllabus PDFs (ml.pdf, os.pdf, coa.pdf, cse309_obe.pdf, genai.pdf, cse209.pdf)
- Roman numeral unit parsing (UNIT I-UNIT V)
- Arabic number unit parsing (Unit 1-Unit 5)
- Module / Chapter / Section alternate heading markers
- Multi-encoding TXT files (UTF-8, UTF-8 BOM, UTF-16 LE)
- DOCX tables and headings (via Mammoth)
- Scanned/image-only PDFs via Tesseract.js OCR
- Digital text-based PDFs via pdfjs-dist
- Lab experiment isolation from theory units
- Table header / contact-hour column filtering
- Metadata extraction (course name, course code)
- Confidence scoring and validation warnings
- Audio file upload validation (MP3, WAV, M4A, AAC, OGG accepted; all others rejected)

---

## Local Binary PDF Fixtures

All binary PDFs inside ackend/tests/fixtures/ are strictly **ignored by .gitignore** to maintain repository hygiene and prevent committing bulky binary documents or copyright-sensitive courseware to Git.

To run the full real-document suite locally, place the following PDF files in ackend/tests/fixtures/syllabi/:

| File | Subject | Course Code |
|---|---|---|
| ml.pdf | Machine Learning | CSE 303 |
| os.pdf | Operating Systems | CSE 302 |
| coa.pdf | Computer Organization and Architecture | CSE 305 |
| cse309_obe.pdf | Advanced JAVA Programming | CSE 307 |
| genai.pdf | Generative AI | - |
| cse209.pdf | Database Management Systems | CSE 209 |

> All binary PDFs and image fixtures inside ackend/tests/fixtures/ are strictly ignored by .gitignore to maintain repository hygiene and prevent committing bulky binary documents or copyright-sensitive courseware to Git.

---

## Tesseract OCR Language Data

The eng.traineddata Tesseract language model file is downloaded automatically at runtime by 	esseract.js. It is **not committed** to this repository (covered by .gitignore). No manual setup is required - it will be fetched on first OCR use.
