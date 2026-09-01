import { isSrmApStudent } from '../utils/srmApHelper.js';
import SrmPortalAccount from '../models/SrmPortalAccount.js';

export async function requireSrmApEligible(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (req.path === '/status' || req.path === '/connect') {
    return next();
  }

  if (isSrmApStudent(req.user)) {
    return next();
  }

  const hasPortalAccount = await SrmPortalAccount.exists({ userId: req.user._id });
  if (hasPortalAccount) {
    try {
      req.user.university = 'SRM University-AP';
      await req.user.save();
    } catch {

    }
    return next();
  }

  console.warn(`[srmApMiddleware] Access denied (403) for university: "${req.user.university}"`);

  return res.status(403).json({
    success: false,
    message: 'The SRM Portal feature is only available to SRM University–AP students.',
  });
}
