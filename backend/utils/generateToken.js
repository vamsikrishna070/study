import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function generateToken(userId, sessionId = null) {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is required for authentication.');
  const payload = { userId };
  if (sessionId) {
    payload.sessionId = String(sessionId);
  }
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });
}