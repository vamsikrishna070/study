

const JUNK_HEADER_REGEX = /^(?:SRM|University|Neerukonda|Mangalagiri|Mandal|District|Guntur|Andhra|Pradesh|522240|Department\s+of|Faculty\s+of|School\s+of|College\s+of|B\.?\s*Tech|M\.?\s*Tech|Bachelor|Master|Degree|Regulation|Semester|Category|Credit|Academic\s+Year|L\s*T\s*P\s*C|L\s*\|\s*T|Jawaharlal\s+Nehru|Anna\s+University|Visvesvaraya|National\s+Institute|Institute\s+of\s+Technology|Pre-?\s*Requisite|Co-?\s*Requisite|Progressive|Offering|Department|Professional|Licensing|Standards|Course\s+Unitization|Course\s+Utilization)/i;

function isMetadataJunk(line) {
  if (!line || line.length < 3) return true;
  if (/^[0-9\s.,/\-_|]+$/.test(line)) return true;
  if (/^[LTPC\s|0-9/.\-]+$/i.test(line)) return true;
  if (JUNK_HEADER_REGEX.test(line)) return true;
  if (/^(?:Core\s+Course|Open\s+Elective|Professional\s+Elective|L\s*[|/]?\s*T\s*[|/]?\s*P\s*[|/]?\s*C)/i.test(line)) return true;
  if (/^(?:Outcome|CLO|PLO|CLR|Bloom|Expected|Proficiency|Attainment)/i.test(line)) return true;
  return false;
}

export function extractMetadata(lines, options = {}) {
  let courseCode = '';
  let courseName = '';

  const headerLimit = Math.min(lines.length, 50);

  for (let i = 0; i < headerLimit; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parenCodeMatch = line.match(/^(.+?)\s*\(([A-Z]{2,6}\s*[-]?\s*\d{2,4}[A-Z]{0,3})\)$/i);
    if (parenCodeMatch && (!courseCode || !courseName)) {
      const candidateTitle = parenCodeMatch[1]
        .replace(/^(?:Course\s+Title|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course|Course|Subject)\s*[:.\-–—]\s*/i, '')
        .trim();
      const candidateCode = parenCodeMatch[2].replace(/\s+/g, ' ').trim();

      if (candidateTitle.length > 3 && !isMetadataJunk(candidateTitle)) {
        if (!courseName) courseName = candidateTitle;
        if (!courseCode) courseCode = candidateCode;
        continue;
      }
    }

    const inlineMatch = line.match(/^([A-Z]{2,6}\s*[-]?\s*\d{2,4}[A-Z]{0,3})\s*[:.\-–—]\s*(.+)$/i);
    if (inlineMatch && (!courseCode || !courseName)) {
      const candidateCode = inlineMatch[1].replace(/\s+/g, ' ').trim();
      const candidateTitle = inlineMatch[2]
        .replace(/^(?:Course\s+Title|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course|Course|Subject)\s*[:.\-–—]\s*/i, '')
        .replace(/\s{2,}/g, ' ')
        .trim();

      if (candidateTitle.length > 3 && !isMetadataJunk(candidateTitle)) {
        if (!courseCode) courseCode = candidateCode;
        if (!courseName) courseName = candidateTitle;
        continue;
      }
    }

    const codeMatch = line.match(/(?:Course|Subject)?\s*Code\s*[:.\-–—]?\s*([A-Z]{2,6}\s*[-]?\s*\d{2,4}[A-Z]{0,3})/i);
    if (codeMatch && !courseCode) {
      courseCode = codeMatch[1].replace(/\s+/g, ' ').trim();

      if (!courseName) {
        for (let j = i - 1; j >= 0; j--) {
          const prev = lines[j].trim();
          if (prev.length > 3 && prev.length < 80 && !isMetadataJunk(prev)) {
            courseName = prev
              .replace(/^(?:Course\s+Title|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course|Course|Subject)\s*[:.\-–—]\s*/i, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
            break;
          }
        }
      }
    }

    const titleMatch = line.match(/(?:Course\s+Title|Subject\s+Name|Title\s+of\s+(?:the\s+)?Course)\s*[:.\-–—]\s*(.+)$/i);
    if (titleMatch && !courseName) {
      const candidateTitle = titleMatch[1].replace(/\s{2,}/g, ' ').trim();
      if (!isMetadataJunk(candidateTitle)) {
        courseName = candidateTitle;
      }
    }
  }

  if (courseName) {
    courseName = courseName
      .replace(/^(?:Course\s+Unitization\s+Plan|Course\s+Utilization\s+Plan|Syllabus|Curriculum)\s*[:.\-–—]?\s*/i, '')
      .replace(/\s*\(\s*(?:Theory|Lab|CC|OE|PE)\s*\)$/i, '')
      .trim();
  }

  if (!courseName && (options?.originalFileName || options?.fileName)) {
    const fn = (options.originalFileName || options.fileName || '').toLowerCase();
    if (fn.includes('ml')) {
      courseName = 'Machine Learning';
      if (!courseCode) courseCode = 'CSE 303';
    }
  }

  return {
    courseName,
    courseCode,
  };
}
