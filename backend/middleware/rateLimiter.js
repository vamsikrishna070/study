import rateLimit from 'express-rate-limit';

const createLimiter = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    statusCode: 429,
    message: {
      success: false,
      message,
    },
    skip: () => process.env.NODE_ENV === 'test',
  });

/**
 * Strict rate limiting for authentication attempts (Login, Registration, Password Reset)
 * 15 requests per 15-minute window per IP.
 */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please try again later.',
});

/**
 * Very strict rate limiting for OTP verification and resend to prevent brute-forcing
 * 10 requests per 15-minute window per IP.
 */
export const otpLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many OTP verification attempts. Please wait before trying again.',
});

/**
 * Rate limiting for heavy SRM portal automation operations (connect, sync, mark attendance)
 * 30 requests per 15-minute window per IP.
 */
export const portalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Portal request limit reached. Please wait a few moments before trying again.',
});

/**
 * Global baseline API rate limiter to prevent denial-of-service
 * 300 requests per 15-minute window per IP.
 */
export const globalApiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: 'Too many requests. Please slow down.',
});
