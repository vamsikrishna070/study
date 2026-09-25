
export function isSrmApStudent(user) {
  if (!user) return false;
  const u = (user.university || '').toLowerCase().trim();
  const email = (user.email || '').toLowerCase().trim();
  const reg = (user.registrationNumber || user.regNo || '').toLowerCase().trim();

  const SRM_AP_PATTERNS = [
    'srm',
    'srmap',
    'srm ap',
    'srmuniversity',
    'srm university',
    'srmuniversity-ap',
    'srm university ap',
    'srm university - ap',
    'srm university andhra pradesh',
    'srm university-ap',
    'srm ap university',
    'srm inst of science and technology ap',
    'srm university, andhra pradesh',
    'srm university amaravati',
    'srm amaravati',
    'amaravati',
  ];

  if (u && SRM_AP_PATTERNS.some((pattern) => u.includes(pattern))) return true;
  if (email.endsWith('@srmap.edu.in') || email.includes('srmap.edu.in') || email.endsWith('@srmist.edu.in')) return true;
  if (reg.startsWith('ap') || reg.startsWith('ra')) return true;

  return false;
}

