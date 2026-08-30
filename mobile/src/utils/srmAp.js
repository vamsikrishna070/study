/**
 * Determines if a StudyArena user is associated with SRM University–AP.
 * Checks user.university (free-text string) case-insensitively against known SRM AP identifiers.
 *
 * @param {object|null} user - The authenticated StudyArena user object
 * @returns {boolean}
 */
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
