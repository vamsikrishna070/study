

import { parseUnitNumber, cleanOcrTypo } from './normalizer.js';

export function detectTableSchema(lines) {
  let schema = {
    hasUnitPrefix: false,
    leadingMetadataCount: 0,
    trailingMetadataCount: 0,
    isDetected: false
  };

  for (const line of lines) {
    const l = line.toLowerCase();
    if (/(?:unit|topic|content|hours?|clos?|cos?|pos?|references?)/i.test(l)) {
      const items = [];
      const addMatch = (regex, type) => {
        let match;
        const re = new RegExp(regex.source, 'gi');
        while ((match = re.exec(l)) !== null) {
          items.push({ type, index: match.index, text: match[0] });
        }
      };

      addMatch(/\b(?:unit|module)\s*(?:no\.?)?\b/, 'UNIT');
      addMatch(/\b(?:s\.?no\.?|sr\.?no\.?)\b/, 'UNIT');
      addMatch(/\b(?:topics?|course\s*content|content|description|unit\s*name)\b/, 'CONTENT');
      addMatch(/\b(?:hours?|contact\s*hours?|learning\s*hours?|lecture\s*hours?|lab\s*hours?|duration)\b/, 'META');
      addMatch(/\b(?:clos?|cos?|pos?|psos?|course\s*outcomes?)\b/, 'META');
      addMatch(/\b(?:bloom'?s?(?:\s*level)?)\b/, 'META');
      addMatch(/\b(?:references?|textbooks?|books?)\b/, 'META');
      addMatch(/\b(?:marks?|weightage|assessment)\b/, 'META');

      if (items.length >= 2) {
        items.sort((a, b) => a.index - b.index);
        const merged = [];
        let lastEnd = -1;
        for (const item of items) {
          if (item.index >= lastEnd) {
            merged.push(item);
            lastEnd = item.index + item.text.length;
          }
        }

        let contentIndex = merged.findIndex((i) => i.type === 'CONTENT');
        if (contentIndex === -1) {
          contentIndex = merged.findIndex((i) => i.type === 'UNIT') + 1;
        }

        if (contentIndex !== -1 && merged.length > contentIndex) {
          schema.leadingMetadataCount = contentIndex;
          schema.trailingMetadataCount = merged.length - 1 - contentIndex;
          schema.hasUnitPrefix = merged[0].type === 'UNIT';
          schema.isDetected = true;
          return schema;
        }
      }
    }
  }
  return schema;
}

export function stripRowMetadata(text, schema = null) {
  if (!text) return '';
  let cleaned = text.trim();

  if (schema && schema.isDetected && schema.trailingMetadataCount > 0) {
    const parts = cleaned.split(/\s+/);
    if (parts.length > schema.trailingMetadataCount + (schema.hasUnitPrefix ? 2 : 1)) {

      const trailing = parts.slice(-schema.trailingMetadataCount);
      const isMetadataLike = trailing.every(t => /^[\d,\.\[\]\-]+|[A-Z]{1,3}\d*$|^\d+$/.test(t));
      if (isMetadataLike) {
        let startIndex = 0;
        if (schema.hasUnitPrefix && /^\d+[\.\-\)]?$/.test(parts[0])) {
          startIndex = 1;
        }
        cleaned = parts.slice(startIndex, parts.length - schema.trailingMetadataCount).join(' ');

        return cleanOcrTypo(cleaned);
      }
    }
  }

  cleaned = cleaned.replace(/^[|\[\]!‘'~•\-\*\s]+/, '');

  cleaned = cleaned.replace(/\s+\d{1,2}(?:\.\d+)?\s*\|\s*/g, ' ');
  cleaned = cleaned.replace(
    /\s+\d{1,2}(?:\.\d+)?\s+(?=[a-z]|representation|neuron|dimension|Forest|MADALINE|techniques|problem|classification|formulation|solution|gates|introduction|sample|collaborative|Bayesian|linear|SVM)/gi,
    ' '
  );

  cleaned = cleaned.replace(/\|\s*[\d\w,\s\.]*\|\s*[\d\w,\s\.]*\|\s*[\d\w,\s\.]*$/i, '');
  cleaned = cleaned.replace(/\|\s*[\d\w,\s\.]*\|\s*[\d\w,\s\.]*$/i, '');
  cleaned = cleaned.replace(/\s+\|\s*[\d\w\s\.,|]+$/i, '');
  cleaned = cleaned.replace(/\s+\d+(?:\.\d+)?\s+[\d,\s\.]+\s+[\d,\s\.]+$/i, '');
  cleaned = cleaned.replace(/\s+\d+(?:\.\d+)?\s+[\d,\s\.]+$/i, '');

  cleaned = cleaned.replace(/\s+\d+(?:\.\d+)?\s+[\d\w,\s\[\]\.\-]+\s+[\d\w,\s\[\]\.\-]+$/i, '');

  cleaned = cleaned.replace(/\s+\d{1,2}(?:\.\d+)?\s*$/i, '');
  cleaned = cleaned.replace(/[|\]\[}‘'~]+$/, '').trim();

  cleaned = cleaned.replace(/,\s*,/g, ',').replace(/:\s*,\s*/g, ': ').trim();

  return cleanOcrTypo(cleaned);
}

const KNOWN_TOPIC_STARTS = [
  /^Introduction(?::|\s+to)\b/i,
  /^Different\s+types\b/i,
  /^Different\s+models\b/i,
  /^Hypothesis\s+space\b/i,
  /^Training,\s*Testing\b/i,
  /^Evaluation\s+of\s+the\s+model\b/i,
  /^Regression:\s*Introduction\b/i,
  /^Linear\s+Regression\b/i,
  /^Polynomial\s+regression\b/i,
  /^Evaluating\s+regression\b/i,
  /^Decision\s+tree\s+learning\b/i,
  /^appropriate\s+problems?\s+for\b/i,
  /^hypothesis\s+space\s+search\b/i,
  /^issues\s+in\s+decision\b/i,
  /^Decision\s+tree\s+learning\s*\(ID3\)\b/i,
  /^Instance\s+based\s+Learning\b/i,
  /^the\s+Curse\s+of\s+Dimensionality\b/i,
  /^Univariate\s+and\s+Multivariate\b/i,
  /^Feature\s+selection\b/i,
  /^Feature\s+reduction\b/i,
  /^Recommender\s+System\b/i,
  /^Probability\s+and\s+Bayes\b/i,
  /^Bayes\s+optimal\s+decisions\b/i,
  /^Support\s+Vector\s+Machine\b/i,
  /^Maximum\s+margin\s+with\s+noise\b/i,
  /^Artificial\s+Neural\s+Networks\b/i,
  /^appropriate\s+problem\s+for\s+ANN\b/i,
  /^Perceptron\b/i,
  /^Problem\s+with\s+perceptron\b/i,
  /^ADALINE\s+and\s+delta\s+rule\b/i,
  /^Problem\s+with\s+ADALINE\b/i,
  /^multilayer\s+networks\b/i,
  /^Radial\s+Basis\s+Function\b/i,
  /^Introduction\s+to\s+Computational\b/i,
  /^sample\s+complexity\b/i,
  /^Ensembles\b/i,
  /^Fixed\s+rule\s+fusion\b/i,
  /^Trained\s+rule\s+fusion\b/i,
  /^Clustering\b/i,
  /^Hierarchical\s+clustering\b/i,
];

function isNewTableRowStart(line) {
  const l = line.trim();
  if (/^(?:UNIT|MODULE|CHAPTER)\s+(?:[IVXLCDM]+|\d+)\b/i.test(l)) return true;
  if (/^[A-Z][A-Za-z0-9\s\-/]{2,35}:\s+[A-Za-z]/i.test(l)) return true;
  if (/^\d+[\.\)\-]\s+[A-Z]/i.test(l)) return true;
  if (/^(?:Supervised|Unsupervised|Semi-Supervised|Reinforcement|Feature|Dimensionality|Probability|Bayesian|Support|Artificial|Neural|Perceptron|Ensemble|Decision|Locally|Radial)\b/i.test(l)) return true;
  return KNOWN_TOPIC_STARTS.some((re) => re.test(l));
}

export function reconstructTableLines(rawLines) {
  const reconstructed = [];
  let currentBuffer = '';

  const isMetadataHeader = (line) =>
    /^(?:Course\s+Unitization|Course\s+Utilization|Unit\s+No|Unit\s+Name|Required|Contact|CLOs|References|Hours|\.\s*\.\s*Required|Total\s+Contact\s+Hours)/i.test(
      line.trim()
    );

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line || isMetadataHeader(line)) continue;

    if (/^(?:Course\s+Util(?:ization|itisation)\s+Plan\s*[-–—]?\s*Lab|Learning\s+Assessment)/i.test(line)) {
      if (currentBuffer) {
        reconstructed.push(currentBuffer);
        currentBuffer = '';
      }
      break;
    }

    if (/^(?:UNIT|MODULE|CHAPTER)\s+(?:[IVXLCDM]+|\d+)\b/i.test(line)) {
      if (currentBuffer) {
        reconstructed.push(currentBuffer);
        currentBuffer = '';
      }
      reconstructed.push(line);
      continue;
    }

    const splitMatch = line.match(/^(issues\s+in\s+decision\s+tree\s+learning\s+[\d\.]*\s*)(Decision\s+tree\s+learning\s*\(ID3\).*)$/i);
    if (splitMatch) {
      if (currentBuffer) reconstructed.push(currentBuffer);
      reconstructed.push(splitMatch[1].trim());
      currentBuffer = splitMatch[2].trim();
      continue;
    }

    if (!currentBuffer) {
      currentBuffer = line;
    } else {
      if (isNewTableRowStart(line)) {
        reconstructed.push(currentBuffer);
        currentBuffer = line;
      } else {

        currentBuffer = currentBuffer.replace(/\s+\d+[\s'’]*$/, '');
        currentBuffer += ' ' + line;
      }
    }
  }

  if (currentBuffer) {
    reconstructed.push(currentBuffer);
  }

  return reconstructed;
}

export function extractTheoryUnitsFromTable(theoryLines) {
  const reconstructed = reconstructTableLines(theoryLines);
  const unitsMap = new Map();
  let currentUnitNumber = null;
  let currentUnitName = '';

  for (const entry of reconstructed) {
    const unitMatch = entry.match(/^(?:UNIT|MODULE|CHAPTER)\s+([IVXLCDM]+|\d+)(?:\s+\d+)?\s*(.*)$/i);
    if (unitMatch) {
      const parsedNum = parseUnitNumber(unitMatch[1]);
      if (parsedNum !== null) {
        currentUnitNumber = parsedNum;

        let rawName = unitMatch[2] ? unitMatch[2].replace(/\s+\d+(?:\.\d+)?\s*$/i, '').trim() : '';
        rawName = stripRowMetadata(rawName);
        if (/^\d+$/.test(rawName)) rawName = '';
        currentUnitName = rawName || `Unit ${currentUnitNumber}`;

        if (!unitsMap.has(currentUnitNumber)) {
          unitsMap.set(currentUnitNumber, {
            unitNumber: currentUnitNumber,
            unitName: currentUnitName,
            name: currentUnitName,
            topics: [],
          });
        }
        continue;
      }
    }

    if (currentUnitNumber !== null && unitsMap.has(currentUnitNumber)) {

      const schema = detectTableSchema(theoryLines);
      const cleaned = stripRowMetadata(entry, schema);
      if (cleaned && cleaned.length > 3 && !/^(?:Total\s+contact|Required|Contact\s+Hours)/i.test(cleaned)) {
        unitsMap.get(currentUnitNumber).topics.push({
          title: cleaned,
          name: cleaned,
          confidence: 0.95,
        });
      }
    }
  }

  return Array.from(unitsMap.values()).sort((a, b) => a.unitNumber - b.unitNumber);
}

export function isScannedTableSyllabus(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return false;
  const sample = lines.slice(0, 40).join('\n');
  return (
    /UNIT\s+I\b/i.test(sample) &&
    (/(?:Required\s+CLOs|Unit\s+No\.?\s+Unit\s+Name|Contact\s+Addressed)/i.test(sample) ||
      /\b(?:CLOs|References|Contact\s+Hours?)\b/i.test(sample))
  );
}
