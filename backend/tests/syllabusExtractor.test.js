import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parsePdfBufferToText,
  extractSyllabusStructure,
  parseUnitNumber,
  romanToArabic,
  cleanOcrTypo,
  isReferenceOrJunk,
} from '../services/syllabusExtractorService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('--- STARTING SYLLABUS EXTRACTION REGRESSION SUITE ---');
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

  // 1. Number and Roman Numeral Parsing Tests
  assert(romanToArabic('I') === 1, 'Roman I -> 1');
  assert(romanToArabic('II') === 2, 'Roman II -> 2');
  assert(romanToArabic('III') === 3, 'Roman III -> 3');
  assert(romanToArabic('IV') === 4, 'Roman IV -> 4');
  assert(romanToArabic('V') === 5, 'Roman V -> 5');
  assert(parseUnitNumber('3') === 3, 'Arabic 3 -> 3');
  assert(parseUnitNumber('Unit IV') === 4, 'Unit IV -> 4');

  // 2. OCR and Typo Correction Tests
  assert(
    cleanOcrTypo('Multithreading and Even Handling') === 'Multithreading and Event Handling',
    'Contextual OCR typo "Even Handling" corrected to "Event Handling"'
  );
  assert(
    cleanOcrTypo('Byte Streams, FileIntputStream') === 'Byte Streams, FileInputStream',
    'Typo "FileIntputStream" corrected to "FileInputStream"'
  );

  // 3. Junk & Reference Filter Tests
  assert(isReferenceOrJunk('Course Unitization Plan (Lab)'), 'Lab header detected as non-theory');
  assert(isReferenceOrJunk('Total Contact Hours 45'), 'Total hours line detected as metadata');
  assert(
    isReferenceOrJunk('1. Herbert Schildt (2021). Java: The complete reference, 12th edition, McGraw Hill Education.'),
    'Textbook reference detected and filtered'
  );
  assert(
    isReferenceOrJunk('https://docs.oracle.com/javase/tutorial/jdbc/basics/connecting.html'),
    'URL link detected and filtered'
  );

  // 4. Structural Text Extraction Regression (Operating Systems)
  const sampleOsText = `
SRM University AP, Andhra Pradesh
Operating Systems
Course Code CSE 302 Course Category CC L T P C
Course Unitization Plan Theory
Unit No. Unit Name Required Contact Hours CLOs Addressed References Used
UNIT 1 Introduction 6
Operating system overview-objectives and functions 1 1 1,2
Evolution of Operating System 1 1 1,2
Computer System Organization 1 1 1,2
Operating System Structure and Operations 1 1 1,2
System Programs 1 1 1,2
Generation and System Boot 1 1 1,2
UNIT 2 Process Management 9
Process Concepts 1 3 1,2
Various types of scheduling 1 3 1,2
Operations on Processes 1 3 1,2
Inter process Communication 2 3 1,2
CPU Scheduling Algorithms 3 3 1,2
OS – examples 1 3 1,2
UNIT 3 Process Synchronization and Deadlocks 9
Threads- Overview. 1 4 1,3
Multithreading Models. 1 4 1,3
Process Synchronization: Critical section problem and mutual
exclusion. 1 4 1,3
Mutex Locks. 1 4 1,3
Semaphores. 1 4 1,3
Monitors 1 4 1,3
Deadlocks 2 4 1,3
OS examples. 1 4 1,3
UNIT 4 Storage Management 10
Main Memory Management. 1 5 1,2
Contiguous Memory Allocation. 1 5 1,2
Segmentation 1 5 1,2
Virtual Memory 1 5 1,2
Paging 1 5 1,2
Demand Paging. 1 5 1,2
Page Replacement Algorithms. 1 5 1,2
Frame Allocation Techniques 1 5 1,2
Thrashing 1 5 1,2
OS examples. 1 5 1,3
UNIT 5 I/O Systems and File Management 11
Mass Storage Structure- Overview. 1 6 1,3
Disk Scheduling and Management. 1 6 1,3
File System Storage. 1 6 1,3
File Concepts. 1 6 1,3
Directory and Disk Structure. 1 6 1,3
Sharing and Protection. 1 6 1,3
File System Implementation. 1 6 1,3
File System Structure, Directory Structure. 1 6 1,3
Allocation Methods. 1 6 1,3
Free Space Management. 1 6 1,3
OS examples. 1 6 1,3
Total Contact Hours 45
Course Utilization Plan – Lab
1 Shell Programming exercises 4 1, 2 5
`;
  const osResult = extractSyllabusStructure(sampleOsText);
  assert(osResult.courseName === 'Operating Systems', `OS Course Name extracted: "${osResult.courseName}"`);
  assert(osResult.courseCode === 'CSE 302', `OS Course Code extracted: "${osResult.courseCode}"`);
  assert(osResult.units.length === 5, `OS Units detected: ${osResult.units.length} (Expected: 5)`);
  assert(
    osResult.units[2].topics.some((t) => t.title.includes('mutual exclusion')),
    'OS multiline topic correctly joined'
  );
  assert(
    !osResult.units.some((u) => u.topics.some((t) => t.title.toLowerCase().includes('shell programming'))),
    'OS Lab experiments excluded from theory units'
  );

  // 5. Structural Text Extraction Regression (Advanced Java from CSE309_OBE content)
  const sampleJavaText = `
SRM University AP, Andhra Pradesh
Advanced JAVA Programming
Course Code CSE 307 Course Category Core Course (CC)
Course Unitization Plan Theory
Unit 1 Overview of Java and Inheritance 9
An Overview of Java - Data types, Variables and
Arrays, operators,expressions, Control statements
2 1 1
Classes, Objects, Constructor, Methods, this reference, static
keyword, and final keyword Inheritance - Concept, Member access
3 1 1
Abstract Class, Interface Creating Multilevel hierarchy- super uses,
using final with inheritance
2 1 1
Packages-access specifier 2 1 1
Unit 2 Polymorphism and Exception handling 9
Polymorphism - Compile time Polymorphism, Method overloading,
Constructor overloading.
2 1 1
Runtime polymorphism, Method overriding, Dynamic method
dispatch.
Exception Handling - Fundamentals of exception handling, Uncaught
exceptions, using try and catch, multiple catch blocks.
Exception types - Introduction to Object class, Exception class
hierarchy, Built-in exceptions, User defined exceptions, Nested try
statements, Throw, Throws, and Finally.
2 1 1
Unit 3 Multithreading and Even Handling 9
Multithreading- Java thread model, Thread life cycle, Creating threads
– Thread class, Runnable interface,
2 2 1
Thread priorities, Synchronizing threads, Inter-thread communication. 2 2 1
Input/Output - Stream classes, Byte Streams, InputStream,
OutputStream, FileIntputStream
2 2 1
Event Handling - Delegation Event Model, Event
classes,KeyEvent class,
2 3 1
Event Listener Interfaces Using Delegation Event model using
AWT, Adapter Classes.
2 3 1
Unit 4 JDBC and Collections 09
JDBC connectivity - Working with SQLite Database,Creation of
the Database.
2 4 3
Connecting to Database, Creation of Tables, Performing various
operations(Create,Update,Delete and Retrieve) on tables.
2 4 3
Collections Overview, Collection Interfaces - List, Set, Map,
Collection Classes - ArrayList, Linked List.
2 4 1
Vector, Set - HashSet, TreeSet Map - HashTable, HashMap,
Accessing a collection via an Iterator
3 2 2
Recommended Resources
1. Herbert Schildt (2021). Java: The complete reference, 12th edition.
Unit 5 Generic Classes and Advanced GUI Programming with JavaFX
Introduction to Generic Class,Generic Class with Two types
of parameter,General Form of a Generic Class,
2 2 1
UsingWildcardArguments,CreatingGenericMethod,Generic
Interface,GenericClassHierarchies.
2 2 1
JavaFxBasicConcept-AJavaFXApplicationSkeleton-Simple
javaFXControl-ExploringJavaFXControls-RadioButton-
2 2 1
ListView-Combobox-TextField-TreeView-Effectsand
Transforms-IntroductiontoJavaFXMenusAnOverviewof
MenuBar,MenuandMenuItem-AddImagetoMenuItem-Creating
MenuandToolbar
3 2 1
Bloom’s Level of Cognitive Task
`;
  const javaResult = extractSyllabusStructure(sampleJavaText);
  assert(javaResult.courseName === 'Advanced JAVA Programming', `Java Course Name extracted: "${javaResult.courseName}"`);
  assert(javaResult.courseCode === 'CSE 307', `Java Course Code extracted: "${javaResult.courseCode}"`);
  assert(javaResult.units.length === 5, `Java Units detected: ${javaResult.units.length} (Expected: 5)`);
  assert(
    javaResult.units[2].unitName === 'Multithreading and Event Handling',
    `Unit 3 OCR Typo fixed in Unit Name: "${javaResult.units[2].unitName}"`
  );

  // 6. Check Local PDFs if present in local developer environment
  const fixturesDir = path.join(__dirname, 'fixtures', 'syllabi');
  const fixturePdfNames = ['os.pdf', 'coa.pdf', 'cse309_obe.pdf', 'ml.pdf'];
  const presentPdfs = fixturePdfNames.filter((name) => fs.existsSync(path.join(fixturesDir, name)));

  if (presentPdfs.length > 0) {
    console.log(`\nTesting local binary PDFs (${presentPdfs.join(', ')})...`);
    for (const name of presentPdfs) {
      const pdfPath = path.join(fixturesDir, name);
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfText = await parsePdfBufferToText(pdfBuffer);
      const syllabus = extractSyllabusStructure(pdfText);
      if (name === 'os.pdf') {
        assert(syllabus.units.length === 5, 'Local binary os.pdf: 5 theory units extracted');
      } else if (name === 'coa.pdf') {
        assert(syllabus.units.length === 5, 'Local binary coa.pdf: 5 theory units extracted');
      } else if (name === 'cse309_obe.pdf') {
        assert(syllabus.units.length === 5, 'Local binary cse309_obe.pdf: 5 theory units extracted');
      } else if (name === 'ml.pdf') {
        assert(syllabus.units.length === 0, 'Local binary ml.pdf: 0 theory units extracted (lab excluded)');
      }
    }
  } else {
    console.log('\n[INFO] Real test fixture PDFs are not present in backend/tests/fixtures/syllabi/ (Ignored in Git for hygiene).');
    console.log('       To test with real binary PDFs locally, see backend/tests/README.md.');
  }

  console.log(`\n==================================================`);
  console.log(`REGRESSION TEST COMPLETE: ${passed} passed, ${failed} failed.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed:', e);
  process.exit(1);
});
