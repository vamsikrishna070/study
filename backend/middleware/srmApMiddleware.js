import { isSrmApStudent } from '../utils/srmApHelper.js';
import SrmPortalAccount from '../models/SrmPortalAccount.js';

/**
 * Express middleware: restricts portal routes to SRM AP students only.
 * Returns 403 Forbidden for users whose university does not match SRM AP
 * AND who do not have a connected SRM Portal account.
 */
export async function requireSrmApEligible(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  // 1. Check if user's university string matches SRM AP
  if (isSrmApStudent(req.user)) {
    return next();
  }

  // 2. Check if user has an existing SRM Portal Account connected
  const hasPortalAccount = await SrmPortalAccount.exists({ userId: req.user._id });
  if (hasPortalAccount) {
    // Automatically update university field on user model so future checks pass
    try {
      req.user.university = 'SRM University-AP';
      await req.user.save();
    } catch {
      // Non-fatal
    }
    return next();
  }

  console.warn(`[srmApMiddleware] Access denied (403) for user ID: ${req.user._id}, email: ${req.user.email}, university: "${req.user.university}"`);

  return res.status(403).json({
    success: false,
    message: 'The SRM Portal feature is only available to SRM University–AP students.',
  });
}
