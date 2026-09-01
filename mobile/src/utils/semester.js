const ROMAN_MAP = {
  i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10, xi: 11, xii: 12
};

export function parseSemesterNumber(val) {
  if (val === null || val === undefined) return 1;
  if (typeof val === 'number' && !isNaN(val) && val >= 1 && val <= 12) return Math.floor(val);

  const str = String(val).trim();
  if (!str) return 1;

  const cleaned = str.toLowerCase().replace(/semester|sem/gi, '').trim();
  if (!cleaned) return 1;

  const parsedInt = parseInt(cleaned, 10);
  if (!isNaN(parsedInt) && parsedInt >= 1 && parsedInt <= 12) {
    return parsedInt;
  }

  if (ROMAN_MAP[cleaned]) {
    return ROMAN_MAP[cleaned];
  }

  const digitMatch = str.match(/\b([1-9]|1[0-2])\b/);
  if (digitMatch) {
    return parseInt(digitMatch[1], 10);
  }

  return 1;
}

export function formatSemester(val) {
  const num = parseSemesterNumber(val);
  return `Semester ${num}`;
}
