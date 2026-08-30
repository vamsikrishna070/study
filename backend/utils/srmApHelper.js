/**
 * Utility: Determines if a StudyArena user is associated with SRM University–AP.
 *
 * Checks the user's `university` field (free-text string set during registration/profile)
 * against known SRM AP identifiers. Case-insensitive.
 *
 * @param {object} user - The StudyArena user object (from DB or JWT)
 * @returns {boolean}
 */
export function isSrmApStudent(user) {
  if (!user) return false;
  const u = (user.university || '').toLowerCase().trim();
  if (!u) return false;

  // Match against known SRM AP university name variants
  const SRM_AP_PATTERNS = [
    'srm ap',
    'srmap',
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
