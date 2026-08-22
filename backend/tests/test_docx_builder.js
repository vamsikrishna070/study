import mammoth from 'mammoth';
import { extractSyllabusStructure } from '../services/syllabusExtractorService.js';

// Minimal zip builder helper
function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (~crc) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = ((c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1));
  }
  crcTable[i] = c >>> 0;
}

export function createZip(files) {
  const fileEntries = [];
  let offset = 0;

  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const contentBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc32(contentBuf), 14);
    localHeader.writeUInt32LE(contentBuf.length, 18);
    localHeader.writeUInt32LE(contentBuf.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const headerOffset = offset;
    offset += localHeader.length + nameBuf.length + contentBuf.length;

    fileEntries.push({
      nameBuf,
      contentBuf,
      localHeader,
      headerOffset,
      crc: crc32(contentBuf),
      size: contentBuf.length
    });
  }

  const centralEntries = [];
  let centralOffset = offset;

  for (const entry of fileEntries) {
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(0, 12);
    cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(entry.crc, 16);
    cd.writeUInt32LE(entry.size, 20);
    cd.writeUInt32LE(entry.size, 24);
    cd.writeUInt16LE(entry.nameBuf.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(entry.headerOffset, 42);

    centralEntries.push(cd);
    centralEntries.push(entry.nameBuf);
  }

  const centralSize = centralEntries.reduce((sum, b) => sum + b.length, 0);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileEntries.length, 8);
  eocd.writeUInt16LE(fileEntries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(centralOffset, 16);
  eocd.writeUInt16LE(0, 20);

  const chunks = [];
  for (const entry of fileEntries) {
    chunks.push(entry.localHeader, entry.nameBuf, entry.contentBuf);
  }
  chunks.push(...centralEntries, eocd);

  return Buffer.concat(chunks);
}

export function buildSyntheticDocx(paragraphsAndTables) {
  let bodyXml = '';

  for (const item of paragraphsAndTables) {
    if (typeof item === 'string') {
      bodyXml += `<w:p><w:r><w:t>${item}</w:t></w:r></w:p>`;
    } else if (item.heading) {
      bodyXml += `<w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>${item.heading}</w:t></w:r></w:p>`;
    } else if (item.table) {
      bodyXml += '<w:tbl>';
      for (const row of item.table) {
        bodyXml += '<w:tr>';
        for (const cell of row) {
          bodyXml += `<w:tc><w:p><w:r><w:t>${cell}</w:t></w:r></w:p></w:tc>`;
        }
        bodyXml += '</w:tr>';
      }
      bodyXml += '</w:tbl>';
    }
  }

  const docxFiles = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
    'word/document.xml': `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${bodyXml}</w:body></w:document>`
  };

  return createZip(docxFiles);
}

const UNIT_START_REGEX = /^(?:UNIT|MODULE|CHAPTER|SECTION|PART|BLOCK)\s*[:.\-–—]?\s*(?:[0-9IVXLCDM]+|[A-Za-z]+)/i;

export function parseDocxHtmlToText(html) {
  if (!html || typeof html !== 'string') return '';

  // 1. Clean paragraphs and headers inside table cells so each cell is single-line
  let cleaned = html.replace(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi, (match, cellContent) => {
    const textOnly = cellContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return '<td>' + textOnly + '</td>';
  });

  // 2. Format table rows into structured syllabus lines
  cleaned = cleaned.replace(/<tr>([\s\S]*?)<\/tr>/gi, (match, rowContent) => {
    const cells = [...rowContent.matchAll(/<td>([\s\S]*?)<\/td>/gi)].map(m => m[1].trim()).filter(Boolean);
    if (cells.length === 0) return '';
    
    // Check if first cell has UNIT header
    if (UNIT_START_REGEX.test(cells[0])) {
      const unitPart = cells[0];
      const titlePart = cells.length > 1 ? cells[1] : '';
      const topicCells = cells.slice(2);
      let rowLines = `${unitPart}${titlePart ? ': ' + titlePart : ''}\n`;
      for (const tc of topicCells) {
        rowLines += `- ${tc}\n`;
      }
      return rowLines;
    }

    return cells.map(c => `- ${c}`).join('\n') + '\n';
  });

  // 3. Convert paragraphs, headings, list items
  cleaned = cleaned
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<li[^>]*>/gi, '- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .join('\n');

  return cleaned;
}
