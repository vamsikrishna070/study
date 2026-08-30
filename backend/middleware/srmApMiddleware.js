import { isSrmApStudent } from '../utils/srmApHelper.js';

/**
 * Express middleware: restricts portal routes to SRM AP students only.
 * Returns 403 Forbidden for users whose university does not match SRM AP.
 */
export function requireSrmApEligible(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (!isSrmApStudent(req.user)) {
    return res.status(403).json({
      success: false,
      message: 'The SRM Portal feature is only available to SRM University–AP students.',
    });
  }
  return next();
}
