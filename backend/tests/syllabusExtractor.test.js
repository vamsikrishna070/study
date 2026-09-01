import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  extractSyllabusFromBuffer,
  extractSyllabusStructure,
  parsePdfBufferToText,
  parseUnitNumber,
  romanToArabic,
  cleanOcrTypo,
  isReferenceOrJunk,
  validateDocumentBuffer,
  splitCompositeTopic,
  splitOutsideBrackets,
  segmentDocumentSections,
  terminateOcrEngine,
} from '../services/syllabusExtractorService.js';
import { stripRowMetadata, detectTableSchema } from '../services/syllabus/tableExtractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log('\n===============================================================');
  console.log('--- STARTING COMPREHENSIVE SYLLABUS EXTRACTION SUITE ---');
  console.log('===============================================================\n');

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

  console.log('\n[1. Unit Number & Roman Numeral Parsing]');
  assert(romanToArabic('I') === 1, 'Roman I -> 1');
  assert(romanToArabic('II') === 2, 'Roman II -> 2');
  assert(romanToArabic('III') === 3, 'Roman III -> 3');
  assert(romanToArabic('IV') === 4, 'Roman IV -> 4');
  assert(romanToArabic('V') === 5, 'Roman V -> 5');
  assert(romanToArabic('VIII') === 8, 'Roman VIII -> 8');
  assert(parseUnitNumber('3') === 3, 'Arabic 3 -> 3');
  assert(parseUnitNumber('Unit IV') === 4, 'Unit IV -> 4');
  assert(parseUnitNumber('MODULE 2') === 2, 'MODULE 2 -> 2');
  assert(parseUnitNumber('FIRST UNIT') === 1, 'Spelled-out "FIRST UNIT" -> 1');
  assert(parseUnitNumber('FIFTH MODULE') === 5, 'Spelled-out "FIFTH MODULE" -> 5');

  console.log('\n[2. OCR and Typo Corrections]');
  assert(
    cleanOcrTypo('Multithreading and Even Handling') === 'Multithreading and Event Handling',
    'Typo "Even Handling" corrected to "Event Handling"'
  );
  assert(
    cleanOcrTypo('FileIntputStream') === 'FileInputStream',
    'Typo "FileIntputStream" corrected to "FileInputStream"'
  );
  assert(
    cleanOcrTypo('Linear Diermimant Analysis') === 'Linear Discriminant Analysis',
    'Typo "Linear Diermimant Analysis" corrected'
  );
  assert(
    cleanOcrTypo('Principal Comporent Amys') === 'Principal Component Analysis',
    'Typo "Principal Comporent Amys" corrected'
  );

  console.log('\n[3. Delimiter & Parentheses Preservation]');
  const parts = splitOutsideBrackets('Guided media (Twisted pair, Coaxial cable, Fiber optics), Wireless transmission', ',');
  assert(parts.length === 2, 'Split by comma outside parentheses produces exactly 2 topics');
  assert(
    parts[0] === 'Guided media (Twisted pair, Coaxial cable, Fiber optics)',
    'Preserved commas inside parentheses without corrupting list'
  );

  const compositeParts = splitCompositeTopic('Process Management: Process Concepts, CPU Scheduling, Operations on Processes');
  assert(compositeParts.length === 3, 'Colon-led category split into 3 atomic topics');

  console.log('\n[4. File Validation & Magic Signatures]');
  const validPdfBuf = Buffer.from('%PDF-1.4 Mock valid PDF content for testing');
  const validDocxBuf = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00]);
  const validTxtBuf = Buffer.from('UNIT 1: Introduction\nBasic concepts of databases');
  const htmlBuf = Buffer.from('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404</h1></body></html>');

  assert(validateDocumentBuffer(validPdfBuf).valid, 'Valid PDF buffer recognized');
  assert(validateDocumentBuffer(validDocxBuf, 'test.docx').valid, 'Valid DOCX buffer recognized');
  assert(validateDocumentBuffer(validTxtBuf, 'test.txt').valid, 'Valid TXT buffer recognized');
  assert(!validateDocumentBuffer(htmlBuf).valid, 'HTML error page safely rejected');
  assert(!validateDocumentBuffer(Buffer.alloc(0)).valid, 'Empty buffer safely rejected');

  console.log('\n[5. Structural Text Extraction: Operating Systems]');
  const sampleOsText = `
SRM University AP, Andhra Pradesh
Operating Systems
Course Code CSE 302 Course Category CC L T P C 3 0 1 4
Course Unitization Plan Theory
Unit No. Unit Name Required Contact Hours CLOs Addressed References Used
UNIT 1 Introduction 6
Operating Systems Overview 1 1 1, 2
Evolution of Operating Systems 1 1 1, 2
Computer System Organization 1 1 1, 2
Operating System Structure and Operations 1 1 1, 2
System Calls and Types of System Calls 1 1 1, 2
System Boot 1 1 1, 2
UNIT 2 Process Management 6
Process Concepts and State 1 2 1, 2
Process Scheduling and Queues 1 2 1, 2
Operations on Processes 1 2 1, 2
Interprocess Communication 1 2 1, 2
Threads and Concurrency Models 1 2 1, 2
Multithreading Models 1 2 1, 2
UNIT 3 Process Synchronization and Deadlocks 8
Race Conditions and Critical Section Problem 1 3 1, 2
Peterson's Solution 1 3 1, 2
Synchronization Hardware 1 3 1, 2
Mutex Locks and Semaphores 1 3 1, 2
Classic Problems of Synchronization 1 3 1, 2
Monitors 1 3 1, 2
Deadlock Characterization and Prevention 1 3 1, 2
Deadlock Avoidance (Banker's Algorithm) and Detection 1 3 1, 2
UNIT 4 Storage Management 10
Main Memory: Swapping and Contiguous Allocation 1 4 1, 2
Paging and Structure of Page Table 1 4 1, 2
Segmentation 1 4 1, 2
Virtual Memory: Demand Paging 1 4 1, 2
Page Replacement Algorithms (FIFO, LRU, Optimal) 1 4 1, 2
Allocation of Frames and Thrashing 1 4 1, 2
Mass-Storage Structure: Disk Structure and Attachment 1 4 1, 2
Disk Scheduling Algorithms (FCFS, SSTF, SCAN, LOOK) 1 4 1, 2
Disk Management and Swap-Space Management 1 4 1, 2
RAID Structure 1 4 1, 2
UNIT 5 I/O Systems and File Management 11
File Concept and Access Methods 1 5 1, 2
Directory Structure and File System Mounting 1 5 1, 2
File Sharing and Protection 1 5 1, 2
File System Structure and Implementation 1 5 1, 2
Directory Implementation 1 5 1, 2
Allocation Methods (Contiguous, Linked, Indexed) 1 5 1, 2
Free Space Management 1 5 1, 2
I/O Hardware: Polling, Interrupts, DMA 1 5 1, 2
Application I/O Interface: Kernel I/O Subsystem 1 5 1, 2
Transforming I/O Requests to Hardware Operations 1 5 1, 2
STREAMS and Performance 1 5 1, 2
Course Unitization Plan (Lab)
Exp No. Experiment Name Required Contact Hours CLOs Addressed References Used
1 Write a program to implement CPU scheduling algorithms (FCFS, SJF). 2 2 1
2 Write a program to implement CPU scheduling algorithms (Priority, Round Robin). 2 2 1
3 Write a program to implement Banker's algorithm for Deadlock Avoidance. 2 3 1
4 Write a program to implement Page Replacement algorithms (FIFO, LRU, Optimal). 2 4 1
Learning Assessment
Assessment Pattern
Text Books
1. Abraham Silberschatz, Peter Baer Galvin, Greg Gagne, "Operating System Concepts", 9th Edition, John Wiley and Sons Inc., 2012.
`;

  const osResult = extractSyllabusStructure(sampleOsText, {
    sourceType: 'text',
    totalPages: 3,
  });

  assert(osResult.courseCode === 'CSE 302', 'Course Code "CSE 302" extracted');
  assert(osResult.courseName === 'Operating Systems', 'Course Name "Operating Systems" extracted');
  assert(osResult.theoryUnits.length === 5, `Extracted 5 Theory Units (Got: ${osResult.theoryUnits.length})`);
  assert(osResult.labExperiments.length === 4, `Extracted 4 Lab Experiments (Got: ${osResult.labExperiments.length})`);
  assert(osResult.units.length === 6, 'Unified units array contains 6 units (5 theory + 1 lab)');
  assert(osResult.metadata.confidence >= 0.9, `Confidence score is >= 0.90 (Got: ${osResult.metadata.confidence})`);

  console.log('\n[6. Structural Text Extraction: JNTU Standard Syllabus]');
  const jntuText = `
JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY HYDERABAD
B.Tech. II Year II Sem.
DATABASE MANAGEMENT SYSTEMS (CS401PC)
UNIT - I
Database System Applications: A Historical Perspective, File Systems versus a DBMS, the Data Model, Levels of Abstraction in a DBMS, Interfaces in a DBMS, Database Schema, Database Design and ER Diagrams, Beyond ER Design Entities, Attributes and Entity sets, Relationships and Relationship sets, Additional Features of the ER Model.
UNIT - II
Relational Model: Introduction to the Relational Model, Integrity Constraints over Relational Database, Enforcing Integrity Constraints, Querying Relational Data, Logical Database Design, Introduction to Views, Destroying / Altering Tables and Views.
Relational Algebra, Tuple Relational Calculus, Domain Relational Calculus.
UNIT - III
SQL: QUERIES, CONSTRAINTS, TRIGGERS: Form of Basic SQL Query, UNION, INTERSECT, and EXCEPT, Nested Queries, Aggregation Operators, NULL values, Complex Integrity Constraints in SQL, Triggers and Active Databases.
UNIT - IV
Schema Refinement: Problems Caused by Redundancy, Decompositions, Problem Related to Decomposition, Reasoning About Functional Dependencies, First, Second, Third Normal Forms, BCNF, Lossless Join Decomposition, Dependency Preserving Decomposition, Multi-valued Dependencies, FOURTH Normal Form, Join Dependencies, FIFTH Normal Form.
UNIT - V
Transaction Management: Transaction Concept, A Simple Transaction Model, Storage Structure, Transaction Atomicity and Durability, Transaction Isolation, Serializability, Transaction Isolation Levels, Implementation of Isolation Levels.
TEXT BOOKS:
1. Database Management Systems, Raghurama Krishnan, Johannes Gehrke, Tata Mc Graw Hill 3rd Edition
2. Database System Concepts, S. Sudarshan, 6th Edition, McGraw Hill.
`;

  const jntuResult = extractSyllabusStructure(jntuText, { sourceType: 'text' });
  assert(jntuResult.courseCode === 'CS401PC', `JNTU Course Code: "${jntuResult.courseCode}"`);
  assert(jntuResult.courseName === 'DATABASE MANAGEMENT SYSTEMS', `JNTU Course Name: "${jntuResult.courseName}"`);
  assert(jntuResult.theoryUnits.length === 5, `JNTU Theory Units: ${jntuResult.theoryUnits.length} (Expected: 5)`);
  assert(jntuResult.labExperiments.length === 0, 'JNTU has 0 lab experiments (Theory-only)');
  assert(
    !jntuResult.theoryUnits.some((u) => u.topics.some((t) => t.title.toLowerCase().includes('raghurama'))),
    'Textbooks filtered out from JNTU topics'
  );

  console.log('\n[7. Structural Text Extraction: Bulleted Module Syllabus]');
  const bulletedText = `
Computer Networks (CS-301)
MODULE 1
Introduction to Data Communications
- Components of Data Communication
- Data Flow and Network Topologies
- OSI 7-Layer Architecture
- TCP/IP Protocol Suite
MODULE 2
Data Link Layer and MAC
- Framing and Error Detection (CRC, Checksum)
- Flow Control (Stop-and-Wait, Sliding Window)
- Multiple Access Protocols (CSMA/CD, CSMA/CA)
- Ethernet Standards and Switches
MODULE 3
Network Layer and Routing
- IPv4 and IPv6 Addressing
- Subnetting and Classless Addressing (CIDR)
- Routing Algorithms (Distance Vector, Link State)
- OSPF, BGP, and RIP Protocols
MODULE 4
Transport and Application Layer
- UDP vs TCP: Handshake and Connection Management
- Congestion Control and Flow Control
- DNS, HTTP, HTTPS, and SMTP
- Network Security Basics: Firewalls and TLS
`;

  const bulletResult = extractSyllabusStructure(bulletedText, { sourceType: 'text' });
  assert(bulletResult.courseName === 'Computer Networks', `Bulleted Course Name: "${bulletResult.courseName}"`);
  assert(bulletResult.courseCode === 'CS-301', `Bulleted Course Code: "${bulletResult.courseCode}"`);
  assert(bulletResult.theoryUnits.length === 4, `Bulleted Modules detected: ${bulletResult.theoryUnits.length} (Expected: 4)`);
  assert(
    bulletResult.theoryUnits[0].unitName.includes('Introduction to Data Communications'),
    `Multi-line Module 1 Name captured: "${bulletResult.theoryUnits[0].unitName}"`
  );

  console.log('\n[8. Universal Roman Numeral Heading Syllabus]');
  const romanText = `
Web Technologies (IT-304)
I. Introduction to Web Technologies
HTML5 Semantic Tags, CSS3 Responsive Grid, Flexbox, JavaScript ES6 Syntax.
II. Asynchronous Programming and APIs
Promises, Async/Await, Fetch API, RESTful Web Services, JSON parsing.
III. Frontend Frameworks
React Components, State and Props, React Hooks, Virtual DOM, Client-side Routing.
IV. Backend Architecture
Node.js Runtime, Express Routing, Middleware Architecture, Authentication with JWT.
V. Database Integration
MongoDB Schema Design, Mongoose ODM, CRUD Operations, Indexing and Performance.
`;
  const romanResult = extractSyllabusStructure(romanText, { sourceType: 'text' });
  assert(romanResult.courseCode === 'IT-304', `Roman Course Code: "${romanResult.courseCode}"`);
  assert(romanResult.theoryUnits.length === 5, `Roman Numeral Units: ${romanResult.theoryUnits.length} (Expected: 5)`);
  assert(romanResult.theoryUnits[0].unitNumber === 1, 'Unit I -> unitNumber 1');
  assert(romanResult.theoryUnits[4].unitNumber === 5, 'Unit V -> unitNumber 5');

  console.log('\n[9. Real University Syllabus Binary PDF Tests]');
  const fixturesDir = path.join(__dirname, 'fixtures', 'syllabi');
  const files = ['ml.pdf', 'os.pdf', 'coa.pdf', 'cse309_obe.pdf', 'genai.pdf', 'cse209.pdf'];

  for (const name of files) {
    const filePath = path.join(fixturesDir, name);
    if (!fs.existsSync(filePath)) {
      console.warn(`[Skip] Fixture file not found: ${filePath}`);
      continue;
    }

    console.log(`\n------------------------------------------------------------`);
    console.log(`Testing binary fixture: ${name} (${(fs.statSync(filePath).size / 1024).toFixed(1)} KB)...`);
    const buffer = fs.readFileSync(filePath);

    const startTime = Date.now();
    const result = await extractSyllabusFromBuffer(buffer, {
      originalFileName: name,
      mimeType: 'application/pdf',
    });
    const elapsed = Date.now() - startTime;

    console.log(`=============================================`);
    console.log(`SYLLABUS EXTRACTION VERIFICATION: ${name}`);
    console.log(`=============================================`);
    console.log(`Course Name:           ${result.courseName}`);
    console.log(`Course Code:           ${result.courseCode}`);
    console.log(`Source Type:           ${result.metadata.sourceType}`);
    console.log(`Total Pages:           ${result.metadata.pages}`);
    console.log(
      `OCR Used:              ${
        result.metadata.ocrUsed ? `YES (Pages: ${result.metadata.ocrPages.join(', ')})` : 'NO (Direct Text Extraction)'
      }`
    );
    console.log(`Theory Units Count:    ${result.theoryUnits.length}`);
    console.log(`Lab Experiments Count: ${result.labExperiments.length}`);
    console.log(`Total Unified Units:   ${result.units.length}`);
    console.log(
      `Extraction Confidence: ${Math.round(result.metadata.confidence * 100)}% (${result.metadata.confidenceLevel.toUpperCase()})`
    );
    console.log(`Processing Time:       ${elapsed}ms`);
    console.log(`---------------------------------------------`);

    result.theoryUnits.forEach((u) => {
      console.log(`  Unit ${u.unitNumber} [${u.unitName}]: ${u.topics.length} topics`);
    });
    if (result.labExperiments.length > 0) {
      console.log(`  Laboratory: ${result.labExperiments.length} experiments`);
    }
    console.log(`=============================================`);

    if (name === 'ml.pdf') {
      assert(result.courseCode.includes('303') || result.courseCode === 'CSE 303', 'ml.pdf: Course Code CSE 303 detected');
      assert(result.courseName === 'Machine Learning', 'ml.pdf: Course Name Machine Learning detected');
      assert(result.theoryUnits.length >= 4, `ml.pdf: Extracted 4 Theory Units (Got: ${result.theoryUnits.length})`);
      assert(result.theoryUnits[0].topics.length >= 10, `ml.pdf: Unit 1 has topics (Got: ${result.theoryUnits[0].topics.length})`);
      assert(result.theoryUnits[1].topics.length >= 10, `ml.pdf: Unit 2 has topics (Got: ${result.theoryUnits[1].topics.length})`);
      assert(result.theoryUnits[2].topics.length >= 4, `ml.pdf: Unit 3 has topics (Got: ${result.theoryUnits[2].topics.length})`);
      assert(result.theoryUnits[3].topics.length >= 5, `ml.pdf: Unit 4 has topics (Got: ${result.theoryUnits[3].topics.length})`);

      assert(result.theoryUnits[0].topics.some((t) => t.title.toLowerCase().includes('introduction') || t.title.toLowerCase().includes('decision tree')), 'ml.pdf: Unit 1 contains Intro / Decision Tree');
      assert(result.theoryUnits[1].topics.some((t) => t.title.toLowerCase().includes('feature') || t.title.toLowerCase().includes('discriminant') || t.title.toLowerCase().includes('analysis')), 'ml.pdf: Unit 2 contains Feature Selection / LDA');
      assert(result.theoryUnits[2].topics.some((t) => t.title.toLowerCase().includes('bayes') || t.title.toLowerCase().includes('support vector machine') || t.title.toLowerCase().includes('svm')), 'ml.pdf: Unit 3 contains Bayes / SVM');
      assert(result.theoryUnits[3].topics.some((t) => t.title.toLowerCase().includes('neural') || t.title.toLowerCase().includes('perceptron') || t.title.toLowerCase().includes('adaline')), 'ml.pdf: Unit 4 contains ANN / Perceptron / ADALINE');

      assert(result.labExperiments.length === 15, `ml.pdf: Extracted 15 Lab Experiments (Got: ${result.labExperiments.length})`);
      assert(result.labExperiments[0].title.toLowerCase().includes('python basics'), 'ml.pdf: Lab Exp 1 is Introduction to Python basics');
      assert(result.labExperiments[14].title.toLowerCase().includes('hierarchical clustering'), 'ml.pdf: Lab Exp 15 is Implementation of hierarchical clustering');

      assert(!result.theoryUnits.some((u) => u.topics.some((t) => t.title.toLowerCase().includes('python basics'))), 'ml.pdf: Zero lab experiments inside theory units');
      assert(!result.theoryUnits[0].topics.some((t) => t.title.toLowerCase().includes('decision tree')), 'ml.pdf: Unit 1 has no Unit 2 topics');
      assert(!result.theoryUnits[1].topics.some((t) => t.title.toLowerCase().includes('support vector')), 'ml.pdf: Unit 2 has no Unit 3 topics');
    } else if (name === 'os.pdf') {
      assert(result.theoryUnits.length === 5, `os.pdf: 5 theory units extracted`);
      assert(result.labExperiments.length > 0, `os.pdf: Lab experiments detected`);
      assert(!result.metadata.ocrUsed, 'os.pdf: OCR bypassed for good text pages (0ms overhead)');
    } else if (name === 'coa.pdf') {
      assert(result.theoryUnits.length === 5, `coa.pdf: 5 theory units extracted`);
      assert(result.labExperiments.length >= 10, `coa.pdf: Lab experiments detected (Got: ${result.labExperiments.length})`);
      assert(!result.metadata.ocrUsed, 'coa.pdf: OCR bypassed for good text pages');
    } else if (name === 'cse309_obe.pdf') {
      assert(result.theoryUnits.length === 5, `cse309_obe.pdf: 5 theory units extracted`);
      assert(!result.metadata.ocrUsed, 'cse309_obe.pdf: OCR bypassed for good text pages');
    } else if (name === 'genai.pdf') {
      assert(result.theoryUnits.length === 5, `genai.pdf: 5 theory units extracted`);
      assert(!result.metadata.ocrUsed, 'genai.pdf: OCR bypassed for good text pages');
      assert(result.metadata.confidenceLevel === 'medium', 'genai.pdf: Confidence level is medium (84% score correctly mapped to medium)');
    } else if (name === 'cse209.pdf') {
      assert(result.theoryUnits.length === 5, `cse209.pdf: 5 theory units extracted`);
      assert(!result.metadata.ocrUsed, 'cse209.pdf: OCR bypassed for good text pages');
    }
  }

  console.log('\n[10. Multi-Encoding TXT & DOCX Multi-Format Tests]');
  const txtContent = `
Course Title: Artificial Intelligence
Course Code: AI-401
UNIT 1: Problem Solving and Search
State space representation, Breadth first search, Depth first search, Heuristic search, A* algorithm.
UNIT 2: Knowledge Representation
Propositional logic, First order predicate logic, Resolution, Forward and backward chaining.
UNIT 3: Planning and Reasoning
Classical planning, STRIPS, Partial order planning, Uncertainty and probabilistic reasoning.
Course Unitization Plan (Lab)
1. Implementation of BFS and DFS in Python
2. Implementation of A* Search Algorithm
`;
  const txtBuffer = Buffer.from(txtContent, 'utf8');
  const txtResult = await extractSyllabusFromBuffer(txtBuffer, { originalFileName: 'syllabus.txt' });
  assert(txtResult.courseCode === 'AI-401', `TXT: Course Code "${txtResult.courseCode}" extracted`);
  assert(txtResult.theoryUnits.length === 3, `TXT: 3 Theory Units extracted (Got: ${txtResult.theoryUnits.length})`);
  assert(txtResult.labExperiments.length === 2, `TXT: 2 Lab Experiments extracted (Got: ${txtResult.labExperiments.length})`);
  assert(txtResult.metadata.sourceType === 'txt', 'TXT: Source type identified as txt');

  const bomTxtBuf = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(txtContent, 'utf8')]);
  const bomTxtResult = await extractSyllabusFromBuffer(bomTxtBuf, { originalFileName: 'bom_syllabus.txt' });
  assert(bomTxtResult.theoryUnits.length === 3, 'TXT UTF-8 with BOM correctly decoded');

  const utf16Buf = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(txtContent, 'utf16le')]);
  const utf16Result = await extractSyllabusFromBuffer(utf16Buf, { originalFileName: 'utf16_syllabus.txt' });
  assert(utf16Result.theoryUnits.length === 3, 'TXT UTF-16 LE correctly decoded');

  console.log('\n[11. Table Metadata Semantic Stripping]');
  const mockTableLines = [
    'Unit No Unit Name Hours CLO References',
    '1 Linear Regression 2 1,3 1',
    'Introduction to Neural Networks 3 1 2 3'
  ];
  const schema3 = detectTableSchema(mockTableLines);

  assert(
    stripRowMetadata('Linear Regression 2 1,3 1', schema3) === 'Linear Regression',
    'Metadata Contamination Test: Stripped "2 1,3 1" from "Linear Regression 2 1,3 1"'
  );

  const mockSchema5 = detectTableSchema(['UNIT TOPIC HOURS CO PO PSO']);
  assert(
    stripRowMetadata('Introduction to Neural Networks 3 1 2 3', mockSchema5) === 'Introduction to Neural Networks',
    'Metadata Contamination Test: Stripped "3 1 2 3" (HOURS CO PO PSO) correctly'
  );

  const legitimateNumbers = [
    '0/1 Knapsack',
    '8-Queen\'s Problem',
    '16-Puzzle Problem',
    '3-SAT',
    '2-Phase Locking',
    '3-Tier Architecture',
    'IPv4',
    'IPv6',
    'C++17'
  ];

  let legitPassed = true;
  for (const num of legitimateNumbers) {
    if (stripRowMetadata(`${num} 2 1,3 1`, schema3) !== num) legitPassed = false;
  }
  assert(legitPassed, 'Legitimate Numbers Test: 0/1 Knapsack, 8-Queen, IPv4, C++17 remain perfectly intact when metadata is stripped');

  await terminateOcrEngine();

  console.log(`\n===============================================================`);
  console.log(`REGRESSION & INTEGRATION SUITE COMPLETE: ${passed} passed, ${failed} failed.`);
  console.log(`===============================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((e) => {
  console.error('Test execution failed with error:', e);
  process.exit(1);
});
