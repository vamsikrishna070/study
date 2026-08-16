import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';

export async function protect(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    if (!env.JWT_SECRET) return res.status(500).json({ success: false, message: 'JWT_SECRET is not configured' });
    const decoded = jwt.verify(header.slice(7), env.JWT_SECRET);
    req.user = await User.findById(decoded.userId);
    if (!req.user) return res.status(401).json({ success: false, message: 'User no longer exists' });
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }
}