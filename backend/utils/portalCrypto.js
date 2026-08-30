import crypto from 'node:crypto';
import { env } from '../config/env.js';

const getMasterKey = () => {
  const secret = process.env.PORTAL_ENCRYPTION_KEY || env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      '[PortalCrypto] No encryption key configured. ' +
      'Set PORTAL_ENCRYPTION_KEY (or JWT_SECRET) in your environment variables.'
    );
  }
  return crypto.pbkdf2Sync(secret, 'studyarena_salt', 100000, 32, 'sha256');
};

export function encryptPortalSecret(plainText) {
  if (!plainText) return '';
  const key = getMasterKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const combined = Buffer.concat([iv, encrypted]);
  return combined.toString('base64');
}

export function decryptPortalSecret(encryptedBase64) {
  if (!encryptedBase64) return '';
  try {
    const key = getMasterKey();
    const data = Buffer.from(encryptedBase64, 'base64');
    if (data.length < 17) return '';
    const iv = data.subarray(0, 16);
    const encryptedText = data.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([decipher.update(encryptedText), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (error) {
    console.error('[PortalCrypto] Decryption error:', error.message);
    return '';
  }
}
