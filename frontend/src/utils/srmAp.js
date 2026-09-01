
export function isSrmApStudent(user) {
  if (!user) return false;
  const u = (user.university || '').toLowerCase().trim();
  if (!u) return false;

  const SRM_AP_PATTERNS = [
    'srm ap',
    'srmap',
    'srmuniversity-ap',
    'srm university ap',
    'srm university - ap',
    'srm university andhra pradesh',
    'srm university-ap',
    'srm ap university',
    'srm university, andhra pradesh',
    'srm university amaravati',
    'srm amaravati',
    'amaravati',
  ];

  return SRM_AP_PATTERNS.some((pattern) => u.includes(pattern));
}
