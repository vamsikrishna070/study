

export const SECTION_TYPES = {
  METADATA: 'METADATA',
  THEORY: 'THEORY',
  LAB: 'LAB',
  OUTCOMES: 'OUTCOMES',
  REFERENCES: 'REFERENCES',
  EVALUATION: 'EVALUATION',
};

const THEORY_SECTION_HEADERS = [
  /^Course\s+Unitization\s+Plan\s*\(?Theory\)?/i,
  /^Course\s+Utilization\s+Plan\s*[–\-—]?\s*Theory/i,
  /^(?:SYLLABUS|COURSE\s+CONTENT|THEORY\s+COMPONENT|THEORY\s+SYLLABUS|COURSE\s+STRUCTURE|DETAILED\s+SYLLABUS)$/i,
];

const LAB_SECTION_HEADERS = [
  /^Course\s+Unitization\s+Plan\s*\(?Lab(?:oratory)?\)?/i,
  /^Course\s+Utilization\s+Plan\s*[–\-—]?\s*Lab(?:oratory)?/i,
  /^(?:LIST\s+OF\s+EXPERIMENTS|LABORATORY\s+EXPERIMENTS|LAB\s+EXPERIMENTS|LABORATORY|PRACTICALS?|LAB\s+COMPONENT|PART\s*\d*:\s*ASM|PRACTICAL\s+SESSIONS|PRACTICAL\s+EXERCISES)/i,
  /^Experiments?\s*[:-]?$/i,
  /^Exp\.?\s*$/i,
  /^Exp\.?\s*No\.?/i,
  /^Experiment\s*Name/i,
];

const OUTCOMES_SECTION_HEADERS = [
  /^(?:Course\s+Outcomes?|Program\s+Outcomes?|CO-PO\s+Mapping|Course\s+Objectives?|Program\s+Learning\s+Outcomes?|Course\s+Articulation\s+Matrix)\s*[:-]?/i,
  /^Course\s+Outcomes\s*\/\s*Course\s+Learning\s+Outcomes/i,
  /^Course\s+Objectives\s*\/\s*Course\s+Learning\s+Rationales/i,
  /^Bloom['’]?s\s+Level\s+of\s+Cognitive\s+Task/i,
  /^Bloom['’]?s\s+Level/i,
];

const REFERENCES_SECTION_HEADERS = [
  /^(?:Text\s*Books?|Reference\s*Books?|Suggested\s*Readings?|Prescribed\s*Books?|Web\s*Resources?|Online\s*Resources?)\s*[:-]?/i,
  /^References\s*[:-]/i,
  /^Recommended\s+Resources/i,
  /^Other\s+Resources/i,
];

const EVALUATION_SECTION_HEADERS = [
  /^(?:Internal\s+Continuous\s+Assessment|Evaluation\s+Scheme|Assessment\s+Pattern|Learning\s+Assessment|Grading\s+Policy|Synchronous\s+Learning\s+Assessments)\s*[:-]?/i,
  /^Total\s+(?:Theory\s+|Lab\s+)?Contact\s+Hours?/i,
  /^End\s+Semester\s+Exam/i,
];

const TABLE_HEADER_WORDS = /^(?:Unit\s*No\.?|Unit\s*Name|Required|Contact|Hours?|CLOs?|Addressed|References?|Used|Referen\s*cesUsed|Exp\.?|No\.?|Experiment\s*Name|SL\.?\s*No\.?)$/i;

const UNIT_MARKER_REGEX = /^(?:UNIT|Unit|MODULE|Module|CHAPTER|Chapter|SECTION|Section|BLOCK|Block|PART|Part)\s*[:.\-–—]?\s*(?:[0-9IVXLCDM]+|FIRST|SECOND|THIRD|FOURTH|FIFTH|SIXTH|SEVENTH|EIGHTH|NINTH|TENTH)\b|^(?:[IVXLCDM]+)\.\s+[A-Z]/i;

export function isTheorySectionHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  return THEORY_SECTION_HEADERS.some((regex) => regex.test(trimmed));
}

export function isLabSectionHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  return LAB_SECTION_HEADERS.some((regex) => regex.test(trimmed));
}

export function isClosingSectionHeader(line) {
  if (!line || typeof line !== 'string') return false;
  const trimmed = line.trim();
  if (TABLE_HEADER_WORDS.test(trimmed)) return false;

  return (
    OUTCOMES_SECTION_HEADERS.some((regex) => regex.test(trimmed)) ||
    REFERENCES_SECTION_HEADERS.some((regex) => regex.test(trimmed)) ||
    EVALUATION_SECTION_HEADERS.some((regex) => regex.test(trimmed))
  );
}

export function segmentDocumentSections(lines) {
  const metadataLines = [];
  const theoryLines = [];
  const labLines = [];

  let currentSection = SECTION_TYPES.METADATA;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (isLabSectionHeader(line)) {
      currentSection = SECTION_TYPES.LAB;
      continue;
    }

    if (isTheorySectionHeader(line)) {
      currentSection = SECTION_TYPES.THEORY;
      continue;
    }

    if (currentSection === SECTION_TYPES.LAB) {
      if (isClosingSectionHeader(line)) {
        currentSection = SECTION_TYPES.REFERENCES;
        continue;
      }
      labLines.push(line);
      continue;
    }

    if (currentSection !== SECTION_TYPES.LAB) {
      if (UNIT_MARKER_REGEX.test(line)) {
        currentSection = SECTION_TYPES.THEORY;
        theoryLines.push(line);
        continue;
      }
      if (
        currentSection === SECTION_TYPES.REFERENCES &&
        /^(?:Advanced\s+NLP|Natural\s+Language|Machine\s+Learning|Deep\s+Learning|Neural\s+Network|Data\s+Science|Computer\s+Vision|Database|Operating\s+Systems|Software\s+Engineering)\b/i.test(
          line
        ) &&
        !isClosingSectionHeader(line)
      ) {
        currentSection = SECTION_TYPES.THEORY;
        theoryLines.push(line);
        continue;
      }
    }

    if (isClosingSectionHeader(line)) {
      if (REFERENCES_SECTION_HEADERS.some((r) => r.test(line))) {
        currentSection = SECTION_TYPES.REFERENCES;
      } else if (OUTCOMES_SECTION_HEADERS.some((r) => r.test(line))) {
        currentSection = SECTION_TYPES.OUTCOMES;
      } else {
        currentSection = SECTION_TYPES.EVALUATION;
      }
      continue;
    }

    switch (currentSection) {
      case SECTION_TYPES.THEORY:
        theoryLines.push(line);
        break;
      case SECTION_TYPES.LAB:
        labLines.push(line);
        break;
      case SECTION_TYPES.METADATA:
        metadataLines.push(line);
        break;
      default:

        break;
    }
  }

  return {
    metadataLines,
    theoryLines,
    labLines,
    hasTheory: theoryLines.length > 0,
    hasLab: labLines.length > 0,
  };
}
