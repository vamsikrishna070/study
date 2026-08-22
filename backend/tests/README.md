# Syllabus Extraction Test Suite

This directory contains automated regression tests for the StudyArena structure-aware syllabus extraction engine (`backend/services/syllabusExtractorService.js`).

## Running Tests

From the backend or repository root:

```bash
node backend/tests/syllabusExtractor.test.js
```

The test runner runs 22 regression assertions covering:
- Roman and Arabic unit numeral parsing (`I` ➔ `1`, `IV` ➔ `4`, `Unit V` ➔ `5`)
- Contextual OCR typo correction (`Even Handling` ➔ `Event Handling`, `FileIntputStream` ➔ `FileInputStream`)
- Multiline table row reconstruction and boundary detection
- Textbook reference, assessment rubric, and grading scale filtering
- Automatic laboratory experiment exclusion

---

## Local Binary PDF Verification

To test with real university syllabus PDF documents locally, place the following PDF files in `backend/tests/fixtures/syllabi/`:

1. `os.pdf` — *Operating Systems (`CSE 302`)*
2. `coa.pdf` — *Computer Organization and Architecture (`CSE 305`)*
3. `cse309_obe.pdf` — *Advanced JAVA Programming (`CSE 307`)*
4. `ml.pdf` — *Machine Learning (`CSE 303`)*

> [!NOTE]
> All binary PDFs and image fixtures inside `backend/tests/fixtures/` are strictly ignored by `.gitignore` to maintain repository hygiene and prevent committing bulky binary documents or copyright-sensitive courseware to Git.
