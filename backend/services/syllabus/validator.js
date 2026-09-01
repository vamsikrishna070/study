

export function validateExtraction({
  theoryUnits = [],
  labExperiments = [],
  courseName = '',
  courseCode = '',
  parseMetadata = {},
  sourceText = '',
}) {
  const warnings = [];
  let score = 0;

  const unitCount = theoryUnits.length;
  const expCount = labExperiments.length;
  const totalTopics = theoryUnits.reduce((sum, u) => sum + (u.topics?.length || 0), 0);

  const pageScore = parseMetadata.confidence || (parseMetadata.ocrUsed ? 0.9 : 0.95);
  score += 0.2 * Math.min(1, Math.max(0, pageScore));

  if (unitCount >= 3 && unitCount <= 8) {
    score += 0.2;
  } else if (unitCount >= 1 && unitCount <= 12) {
    score += 0.12;
    if (unitCount === 1) warnings.push('Only 1 unit was detected. Check if the document has multiple units.');
    if (unitCount > 8) warnings.push(`Unusually high unit count (${unitCount} units).`);
  } else if (unitCount === 0 && expCount > 0) {

    score += 0.18;
    warnings.push('No theory units detected; only laboratory experiments found.');
  } else {
    warnings.push('No syllabus units or experiments detected in document.');
  }

  if (unitCount > 0) {
    const avgTopics = totalTopics / unitCount;
    if (avgTopics >= 3 && avgTopics <= 30) {
      score += 0.2;
    } else if (avgTopics >= 1) {
      score += 0.12;
      if (avgTopics < 3) warnings.push('Very few topics detected per unit.');
      if (avgTopics > 30) warnings.push('Very high topic density detected. Some topics may need splitting.');
    }
  } else if (expCount >= 5) {
    score += 0.2;
  }

  if (courseName && courseCode) {
    score += 0.15;
  } else if (courseName || courseCode) {
    score += 0.08;
    if (!courseCode) warnings.push('Course code could not be automatically detected.');
    if (!courseName) warnings.push('Course title could not be automatically detected.');
  } else {
    warnings.push('Neither course title nor course code could be detected.');
  }

  let coverageRatio = 1.0;
  if (sourceText && sourceText.length > 200) {
    const extractedChars =
      theoryUnits.reduce(
        (sum, u) => sum + u.unitName.length + (u.topics || []).reduce((tSum, t) => tSum + t.title.length, 0),
        0
      ) + labExperiments.reduce((sum, e) => sum + e.title.length, 0);

    coverageRatio = Math.min(1.0, extractedChars / Math.max(1, sourceText.length * 0.35));
    if (coverageRatio < 0.4) {
      warnings.push('Lower source text coverage detected. Some sections may have been omitted.');
      score += 0.05;
    } else {
      score += 0.15;
    }
  } else {
    score += 0.15;
  }

  let contaminationFound = false;
  for (const unit of theoryUnits) {
    for (const topic of unit.topics || []) {
      const lower = topic.title.toLowerCase();
      if (
        (lower.includes('experiment 1') || lower.includes('exp. no') || lower.includes('program 1')) &&
        expCount === 0
      ) {
        contaminationFound = true;
        warnings.push('Possible laboratory experiments detected inside theory units.');
        break;
      }
    }
    if (contaminationFound) break;
  }

  if (!contaminationFound) {
    score += 0.1;
  }

  const finalScore = Math.round(Math.min(1, Math.max(0.1, score)) * 100) / 100;

  let confidenceLevel = 'high';
  if (finalScore < 0.75) {
    confidenceLevel = 'low';
  } else if (finalScore < 0.9) {
    confidenceLevel = 'medium';
  }

  const isValid = unitCount > 0 || expCount > 0;

  return {
    confidence: finalScore,
    confidenceLevel,
    warnings,
    valid: isValid,
    coverageRatio: Math.round(coverageRatio * 100) / 100,
  };
}
