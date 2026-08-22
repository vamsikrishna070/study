import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  parsePdfBufferToText,
  parseTxtBufferToText,
  parseDocxBufferToText,
  detectDocumentType,
  parseDocumentBufferToText,
  extractSyllabusStructure,
  parseUnitNumber,
  romanToArabic,
  wordToNumber,
  cleanOcrTypo,
  isReferenceOrJunk,
  splitRespectingParentheses,
  splitCompositeTopic,
  cleanTopicTitle,
} from '../services/syllabusExtractorService.js';
import { buildSyntheticDocx } from './test_docx_builder.js';

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

  // 1. Number, Roman Numeral, and Word Parsing Tests
  assert(romanToArabic('I') === 1, 'Roman I -> 1');
  assert(romanToArabic('II') === 2, 'Roman II -> 2');
  assert(romanToArabic('III') === 3, 'Roman III -> 3');
  assert(romanToArabic('IV') === 4, 'Roman IV -> 4');
  assert(romanToArabic('V') === 5, 'Roman V -> 5');
  assert(parseUnitNumber('3') === 3, 'Arabic 3 -> 3');
  assert(parseUnitNumber('Unit IV') === 4, 'Unit IV -> 4');
  assert(parseUnitNumber('UNIT 01') === 1, 'Zero-padded UNIT 01 -> 1');
  assert(parseUnitNumber('MODULE 05') === 5, 'Zero-padded MODULE 05 -> 5');
  assert(wordToNumber('First') === 1, 'Word First -> 1');
  assert(wordToNumber('Second') === 2, 'Word Second -> 2');
  assert(wordToNumber('Third') === 3, 'Word Third -> 3');
  assert(wordToNumber('Fourth') === 4, 'Word Fourth -> 4');
  assert(wordToNumber('Fifth') === 5, 'Word Fifth -> 5');

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
  assert(isReferenceOrJunk('NPTEL Courses / MOOCs on Database Systems'), 'MOOCs/NPTEL detected as non-theory');
  assert(isReferenceOrJunk('Continuous Internal Assessment (CIA) - 50 Marks'), 'CIA evaluation pattern detected as non-theory');

  // 4. Parentheses-Aware Delimiter Splitting Tests
  const parenTestStr = 'Contiguous Memory Allocation (Single partition, Multiple partition), Segmentation, Paging (Demand Paging, Page Faults)';
  const parenParts = splitRespectingParentheses(parenTestStr, ',');
  assert(parenParts.length === 3, `Parentheses-aware comma split: 3 parts extracted (got ${parenParts.length})`);
  assert(parenParts[0].includes('Single partition, Multiple partition'), 'First part preserved internal comma within parentheses');
  assert(parenParts[2].includes('Demand Paging, Page Faults'), 'Third part preserved internal comma within parentheses');

  // 5. Topic Title Punctuation and Bullet Cleanup Tests
  assert(cleanTopicTitle('• Introduction to Operating Systems.') === 'Introduction to Operating Systems', 'Cleaned bullet and trailing dot');
  assert(cleanTopicTitle('1. Process Scheduling Algorithms;') === 'Process Scheduling Algorithms', 'Cleaned numbered bullet and trailing semicolon');
  assert(cleanTopicTitle('1.1.2 Advanced Memory Management -') === 'Advanced Memory Management', 'Cleaned hierarchical sub-numbering and trailing dash');
  assert(cleanTopicTitle('(a) Deadlock Prevention.') === 'Deadlock Prevention', 'Cleaned lettered bullet and trailing dot');

  // 6. In-Paragraph Multi-Subtopic Splitting Tests
  const inParagraphNumbered = '1.1 Process Concepts 1.2 Process Scheduling 1.3 Operations on Processes 1.4 Inter-process Communication';
  const subNumTopics = splitCompositeTopic(inParagraphNumbered);
  assert(subNumTopics.length === 4, `In-paragraph numbered subtopics: 4 atomic topics extracted (got ${subNumTopics.length})`);
  assert(subNumTopics[0] === 'Process Concepts', `Subtopic 1: "${subNumTopics[0]}"`);
  assert(subNumTopics[3] === 'Inter-process Communication', `Subtopic 4: "${subNumTopics[3]}"`);

  // 7. Document Format Detection Tests
  const pdfHeaderBuf = Buffer.from('%PDF-1.4\n%...\n', 'utf8');
  assert(detectDocumentType(pdfHeaderBuf, 'syllabus.pdf', 'application/pdf') === 'pdf', 'Format detector: PDF detected via magic bytes & extension');

  const txtBuf = Buffer.from('UNIT 1\nIntroduction to Operating Systems\n', 'utf8');
  assert(detectDocumentType(txtBuf, 'syllabus.txt', 'text/plain') === 'txt', 'Format detector: TXT detected via extension & UTF-8 buffer');

  const docxFakeZipBuf = Buffer.from([0x50, 0x4B, 0x03, 0x04, 0x14, 0x00]);
  assert(detectDocumentType(docxFakeZipBuf, 'syllabus.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') === 'docx', 'Format detector: DOCX detected via PK zip magic bytes');

  const imageBuf = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
  assert(detectDocumentType(imageBuf, 'photo.jpg', 'image/jpeg') === 'unsupported', 'Format detector: Rejected image/jpeg file');

  const mp3Buf = Buffer.from([0x49, 0x44, 0x33]);
  assert(detectDocumentType(mp3Buf, 'audio.mp3', 'audio/mpeg') === 'unsupported', 'Format detector: Rejected audio/mp3 file');

  // 8. Plain Text (.txt) Parser Tests (BOM handling, CRLF normalization)
  const txtWithUtf8Bom = Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('Course Code: CS-101\r\nUNIT 1\r\nTopic A\r\n', 'utf8')]);
  const parsedBomText = parseTxtBufferToText(txtWithUtf8Bom);
  assert(!parsedBomText.startsWith('\uFEFF'), 'TXT parser: UTF-8 BOM cleanly stripped');
  assert(!parsedBomText.includes('\r'), 'TXT parser: Windows CRLF normalized to Unix LF');

  const sampleTxtSyllabus = `
Course Title: Computer Organization and Architecture
Subject Code: CS-201

UNIT I: DIGITAL LOGIC AND REGISTER TRANSFER
- Digital Logic Circuits: Logic gates, Boolean algebra, Map simplification
- Combinational Circuits: Adders, Subtractors, Multiplexers, Decoders
- Register Transfer Language: Register transfer, Bus and memory transfers
- Arithmetic Microoperations: Binary adder, Binary subtractor

UNIT II: BASIC COMPUTER ORGANIZATION
1. Instruction Codes: Computer registers, Computer instructions, Timing and control
2. Instruction Cycle: Memory reference instructions, Input-Output and interrupt
3. Complete Computer Description and Design of basic computer

UNIT III: CENTRAL PROCESSING UNIT
- General Register Organization: Stack organization, Instruction formats
- Addressing Modes: Data transfer and manipulation, Program control
- RISC and CISC Architecture characteristics

UNIT IV: PIPELINE AND VECTOR PROCESSING
- Parallel Processing: Pipelining, Arithmetic pipeline, Instruction pipeline
- Vector Processing: Array processors

UNIT V: MEMORY AND INPUT-OUTPUT ORGANIZATION
- Memory Hierarchy: Main memory, Auxiliary memory, Associative memory
- Cache Memory: Mapping functions, Virtual memory, Memory management hardware
- Input-Output Interface: Asynchronous data transfer, Modes of transfer, DMA

Text Books:
1. M. Morris Mano, Computer System Architecture, 3rd Edition, Pearson.
`;

  const txtExtractionResult = extractSyllabusStructure(sampleTxtSyllabus);
  assert(txtExtractionResult.courseName === 'Computer Organization and Architecture', `TXT Course Name: "${txtExtractionResult.courseName}"`);
  assert(txtExtractionResult.courseCode === 'CS-201', `TXT Course Code: "${txtExtractionResult.courseCode}"`);
  assert(txtExtractionResult.units.length === 5, `TXT Units extracted: ${txtExtractionResult.units.length} (Expected: 5)`);
  assert(txtExtractionResult.units[0].topics.some(t => t.title.includes('Boolean algebra')), 'TXT Unit 1 extracted bulleted subtopic');
  assert(txtExtractionResult.units[1].topics.some(t => t.title.includes('Instruction Cycle')), 'TXT Unit 2 extracted numbered subtopic');

  // 9. Word (.docx) Parser Tests (Headings, Paragraphs, and Tables)
  const syntheticDocxBuffer = buildSyntheticDocx([
    'Course Title: Operating Systems',
    'Subject Code: CSE 302',
    {
      table: [
        ['Unit No.', 'Unit Title', 'Topic 1', 'Topic 2'],
        ['UNIT 1', 'Introduction', 'Overview of OS', 'System Calls'],
        ['UNIT 2', 'Process Management', 'Process Scheduling', 'Inter-process Communication'],
        ['UNIT 3', 'Process Synchronization', 'Critical Section', 'Semaphores'],
        ['UNIT 4', 'Storage Management', 'Virtual Memory', 'Paging'],
        ['UNIT 5', 'File Systems', 'Directory Structure', 'Disk Allocation']
      ]
    },
    'Text Books:',
    '1. Silberschatz, Galvin, Operating System Concepts, 9th Edition.'
  ]);

  const docxParsedText = await parseDocxBufferToText(syntheticDocxBuffer);
  assert(docxParsedText.length > 50, 'DOCX parser: Extracted text from Word document');
  const docxExtractionResult = extractSyllabusStructure(docxParsedText);
  assert(docxExtractionResult.courseName === 'Operating Systems', `DOCX Course Name: "${docxExtractionResult.courseName}"`);
  assert(docxExtractionResult.courseCode === 'CSE 302', `DOCX Course Code: "${docxExtractionResult.courseCode}"`);
  assert(docxExtractionResult.units.length === 5, `DOCX Units extracted: ${docxExtractionResult.units.length} (Expected: 5)`);
  assert(docxExtractionResult.units[0].unitName === 'Introduction', `DOCX Unit 1 Name: "${docxExtractionResult.units[0].unitName}"`);
  assert(docxExtractionResult.units[0].topics.some(t => t.title === 'Overview of OS'), 'DOCX Unit 1 extracted table topic "Overview of OS"');
  assert(docxExtractionResult.units[1].topics.some(t => t.title === 'Inter-process Communication'), 'DOCX Unit 2 extracted table topic "Inter-process Communication"');

  // 10. Structural Text Extraction Regression: Alphanumeric Course Codes (VTU style)
  const vtuSyllabusText = `
VISVESVARAYA TECHNOLOGICAL UNIVERSITY, BELAGAVI
Course Code : 20CS41T
Course Title : OPERATING SYSTEMS

MODULE - 01
Introduction to Operating Systems
- Abstract view of OS, Goals of OS, Operation of OS
- Resource Allocator, System calls, Dual-mode operation

MODULE - 02 (10 Hours)
Process Management
- Process state, PCB, Context Switch, Process Scheduling
- Inter-process Communication, Shared Memory, Message Passing

MODULE - 03
Deadlocks & Synchronization
(12 Hours)
- Critical Section Problem, Peterson's Solution, Semaphores
- Deadlock characterization, Deadlock prevention, Banker's Algorithm

MODULE - 04
Memory Management
- Address binding, Logical vs Physical address space
- Contiguous Memory Allocation (Fixed partition, Variable partition), Paging

MODULE - 05
Secondary Storage and File Systems
- Disk structure, Disk scheduling (FCFS, SSTF, SCAN, LOOK)
- File system interface, Access methods, Directory structure

Text Books:
1. Abraham Silberschatz, Peter Baer Galvin, Greg Gagne, Operating System Concepts, 9th Edition, Wiley.
`;
  const vtuResult = extractSyllabusStructure(vtuSyllabusText);
  assert(vtuResult.courseCode === '20CS41T', `VTU Alphanumeric Course Code: "${vtuResult.courseCode}"`);
  assert(vtuResult.courseName === 'OPERATING SYSTEMS', `VTU Course Name: "${vtuResult.courseName}"`);
  assert(vtuResult.units.length === 5, `VTU Modules detected: ${vtuResult.units.length} (Expected: 5)`);
  assert(vtuResult.units[1].unitName === 'Process Management', `Module 2 Name cleaned hours: "${vtuResult.units[1].unitName}"`);
  assert(vtuResult.units[2].unitName === 'Deadlocks & Synchronization', `Module 3 Name captured across hours line: "${vtuResult.units[2].unitName}"`);
  assert(
    vtuResult.units[3].topics.some((t) => t.title.includes('Fixed partition, Variable partition')),
    'Module 4 preserved parenthesized comma in Contiguous Memory Allocation'
  );

  // 11. Word-Based Unit Headers Test (Anna University style)
  const wordHeaderSyllabus = `
ANNA UNIVERSITY, CHENNAI
CS8492 - DATABASE MANAGEMENT SYSTEMS

FIRST UNIT: INTRODUCTION TO RELATIONAL DATABASES
Purpose of Database System - Views of data - Data Models - Database System Architecture - Entity Relationship model - ER Diagrams

SECOND UNIT: SQL AND QUERY OPTIMIZATION
Relational Algebra - SQL queries - Nested queries - Aggregation - Views - Integrity Constraints

THIRD UNIT: TRANSACTIONS AND CONCURRENCY
Transaction Concepts - ACID Properties - Serializability - Concurrency Control - Lock based protocols

FOURTH UNIT: TRENDS IN DATABASE TECHNOLOGY
RAID - Storage Systems - Query Processing - B+ Trees - Hashing

FIFTH UNIT: ADVANCED TOPICS
Distributed Databases - Object Oriented Databases - XML Databases - NoSQL

REFERENCES:
1. Silberschatz, Korth, Database Systems, McGraw Hill.
`;
  const annaResult = extractSyllabusStructure(wordHeaderSyllabus);
  assert(annaResult.courseCode === 'CS8492', `Anna University Course Code: "${annaResult.courseCode}"`);
  assert(annaResult.courseName === 'DATABASE MANAGEMENT SYSTEMS', `Anna University Course Name: "${annaResult.courseName}"`);
  assert(annaResult.units.length === 5, `Word-based Units detected: ${annaResult.units.length} (Expected: 5)`);
  assert(annaResult.units[0].unitNumber === 1, 'FIRST UNIT mapped to unitNumber 1');
  assert(annaResult.units[4].unitNumber === 5, 'FIFTH UNIT mapped to unitNumber 5');

  // 12. Structural Text Extraction Regression (Operating Systems)
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

  // 13. Structural Text Extraction Regression (Advanced Java from CSE309_OBE content)
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

  // 14. Structural Text Extraction Regression: Standard University Paragraph & Semicolon Syllabus (JNTU)
  const standardJntuSyllabus = `
JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY HYDERABAD
B.Tech. in COMPUTER SCIENCE AND ENGINEERING
CS401PC: DATABASE MANAGEMENT SYSTEMS
Course Objectives:
- To understand the basic concepts and the applications of database systems.
- To master the basics of SQL and construct queries using SQL.

UNIT - I
Database System Applications: Purpose of Database Systems, View of Data, Database Languages - DDL, DML.
Relational Databases: Database design, ER Diagrams, Relational Model, Keys, Integrity Constraints.
Storage Management: Storage structure, File Organization, Indexing and Hashing.

UNIT - II
Relational Query Languages: Relational Algebra, Relational Calculus, Tuple Relational Calculus, Domain Relational Calculus.
SQL: Data Definition, Basic Query Structure, Set Operations, Aggregate Functions, Null Values, Nested Subqueries, Complex Queries, Views.

UNIT - III
Schema Refinement: Problems Caused by Redundancy, Decompositions, Problem Related to Decomposition, Functional Dependencies, Reasoning about FDs.
Normal Forms: FIRST, SECOND, THIRD Normal forms, BCNF, Lossless join Decomposition, Dependency Preserving Decomposition, Multi-valued Dependencies, FOURTH Normal Form.

UNIT - IV
Transaction Management: Transaction Concept, Transaction State, Implementation of Atomicity and Durability, Concurrent Executions, Serializability, Recoverability.
Concurrency Control: Lock-Based Protocols, Timestamp-Based Protocols, Validation-Based Protocols, Multiple Granularity, Deadlock Handling.

UNIT - V
Recovery System: Failure Classification, Storage Structure, Recovery and Atomicity, Log-Based Recovery, Recovery with Concurrent Transactions, Buffer Management.

TEXT BOOKS:
1. Database System Concepts, Silberschatz, Korth, Sudarshan, 6th Edition, McGraw Hill.
2. Database Management Systems, Raghu Ramakrishnan, Johannes Gehrke, 3rd Edition, McGraw Hill.

REFERENCES:
1. Database Systems, 6th edition, R. Elmasri and S. B. Navathe, Pearson Education.
`;
  const jntuResult = extractSyllabusStructure(standardJntuSyllabus);
  assert(jntuResult.courseCode === 'CS401PC', `JNTU Course Code extracted: "${jntuResult.courseCode}"`);
  assert(jntuResult.courseName === 'DATABASE MANAGEMENT SYSTEMS', `JNTU Course Name extracted: "${jntuResult.courseName}"`);
  assert(jntuResult.units.length === 5, `JNTU Units detected: ${jntuResult.units.length} (Expected: 5)`);
  assert(
    jntuResult.units[0].topics.some((t) => t.title.includes('ER Diagrams')),
    'JNTU Unit 1 extracted atomic comma-delimited topic "ER Diagrams"'
  );
  assert(
    jntuResult.units[1].topics.some((t) => t.title.includes('Nested Subqueries')),
    'JNTU Unit 2 extracted atomic comma-delimited topic "Nested Subqueries"'
  );
  assert(
    !jntuResult.units.some((u) => u.topics.some((t) => t.title.toLowerCase().includes('silberschatz'))),
    'JNTU Textbooks excluded from topics'
  );

  // 15. Structural Text Extraction Regression: Bulleted & Numbered Module Syllabus with Multi-line Headers
  const bulletedSyllabus = `
NATIONAL INSTITUTE OF TECHNOLOGY
DEPARTMENT OF COMPUTER SCIENCE
Course Title: Computer Networks
Subject Code: CS-301

MODULE 1
Introduction to Data Communications
- Physical Layer: Overview of data communication and networking
- Network Topologies: Star, Ring, Mesh, Tree, Bus
- Transmission Media: Guided media (Twisted pair, Coaxial cable, Fiber optics)
- Wireless Transmission: Radio waves, Microwaves, Infrared

MODULE 2: Data Link Layer
1. Error Detection and Correction: Parity, Checksum, CRC, Hamming codes
2. Data Link Protocols: Stop and Wait, Go-Back-N ARQ, Selective Repeat ARQ
3. Medium Access Control: ALOHA, CSMA, CSMA/CD, CSMA/CA

MODULE 3: Network Layer
- IP Addressing: IPv4 addressing, Subnetting, Supernetting, CIDR, IPv6 addressing
- Routing Protocols: Distance Vector Routing, Link State Routing, OSPF, BGP
- Congestion Control Algorithms: Leaky Bucket, Token Bucket

MODULE 4: Transport and Application Layer
- Transport Layer: Process-to-process delivery, UDP, TCP, Congestion Control
- Application Layer Protocols: DNS, HTTP, HTTPS, FTP, SMTP, DHCP

Course Outcomes:
CO1: Understand physical and data link layers.
CO2: Design subnets and analyze routing.
`;
  const bulletResult = extractSyllabusStructure(bulletedSyllabus);
  assert(bulletResult.courseName === 'Computer Networks', `Bulleted Course Name: "${bulletResult.courseName}"`);
  assert(bulletResult.courseCode === 'CS-301', `Bulleted Course Code: "${bulletResult.courseCode}"`);
  assert(bulletResult.units.length === 4, `Bulleted Modules detected: ${bulletResult.units.length} (Expected: 4)`);
  assert(
    bulletResult.units[0].unitName === 'Introduction to Data Communications',
    `Multi-line Module 1 Name captured: "${bulletResult.units[0].unitName}"`
  );
  assert(
    bulletResult.units[0].topics.some((t) => t.title.includes('Twisted pair')),
    'Bulleted Module 1 extracted bulleted topics'
  );
  assert(
    bulletResult.units[1].topics.some((t) => t.title.includes('Selective Repeat ARQ')),
    'Numbered Module 2 extracted numbered topics'
  );
  assert(
    !bulletResult.units.some((u) => u.topics.some((t) => t.title.startsWith('CO1'))),
    'Course outcomes excluded from topics'
  );

  // 16. Unit-Topic Association & Strict Isolation Test
  const isolationTestText = `
UNIT I: Foundations
Topic A1
Topic A2

UNIT II: Intermediate Concepts
Topic B1
Topic B2

UNIT III: Advanced Topics
Topic C1
Topic C2
`;
  const isoResult = extractSyllabusStructure(isolationTestText);
  assert(isoResult.units.length === 3, 'Isolation Test: 3 units detected');
  assert(
    isoResult.units[0].topics.every((t) => t.title.startsWith('Topic A')),
    'Unit 1 contains strictly Topic A items'
  );
  assert(
    isoResult.units[1].topics.every((t) => t.title.startsWith('Topic B')),
    'Unit 2 contains strictly Topic B items'
  );
  assert(
    isoResult.units[2].topics.every((t) => t.title.startsWith('Topic C')),
    'Unit 3 contains strictly Topic C items'
  );

  // 17. Check Local PDFs if present
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
