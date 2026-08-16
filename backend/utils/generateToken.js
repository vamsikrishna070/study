import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function generateToken(userId) {
  if (!env.JWT_SECRET) throw new Error('JWT_SECRET is required for authentication.');
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
}