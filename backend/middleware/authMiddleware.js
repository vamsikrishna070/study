import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Session from '../models/Session.js';
import { env } from '../config/env.js';

const LAST_ACTIVE_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!env.JWT_SECRET) return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured' });

    const rawToken = header.slice(7);
    let decoded;
    try {
      decoded = jwt.verify(rawToken, env.JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
    }

    req.user = await User.findById(decoded.userId).select('-password');
    if (!req.user) return res.status(401).json({ success: false, message: 'User no longer exists' });

    if (decoded.sessionId) {
      const session = await Session.findOne({
        sessionId: decoded.sessionId,
        user: req.user._id,
      });

      if (!session) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Your session no longer exists. Please log in again.',
        });
      }

      if (session.isRevoked) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_REVOKED',
          message: 'Your session has been revoked. Please log in again.',
        });
      }

      if (session.expiresAt && session.expiresAt < new Date()) {
        return res.status(401).json({
          success: false,
          code: 'SESSION_EXPIRED',
          message: 'Your session has expired. Please log in again.',
        });
      }

      req.session = session;

      const lastActive = session.lastActiveAt ? new Date(session.lastActiveAt).getTime() : 0;
      if (Date.now() - lastActive > LAST_ACTIVE_THROTTLE_MS) {
        Session.updateOne({ _id: session._id }, { lastActiveAt: new Date() }).catch((err) =>
          console.error('[AuthMiddleware] Failed to update session lastActiveAt:', err.message)
        );
      }
    }

    return next();
  } catch (error) {
    console.error('[AuthMiddleware] Protect middleware error:', error.message);
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
}