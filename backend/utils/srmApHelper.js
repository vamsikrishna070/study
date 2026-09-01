
export function isSrmApStudent(user) {
  if (!user) return false;
  const u = (user.university || '').toLowerCase().trim();
  if (!u) return true;

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

  return SRM_AP_PATTERNS.some((pattern) => u.includes(pattern));
}
