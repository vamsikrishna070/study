import { Router } from 'express';
import {
  login,
  logout,
  me,
  register,
  updateProfile,
  verifyEmail,
  forgotPassword,
  resetPassword,
  resendOtp,
  recordActivity,
  changePassword,
  getSessions,
  revokeSession,
  revokeOtherSessions,
  revokeAllSessions,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter, otpLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', authLimiter, asyncHandler(register));
router.post('/verify-email', otpLimiter, asyncHandler(verifyEmail));
router.post('/resend-otp', otpLimiter, asyncHandler(resendOtp));
router.post('/login', authLimiter, asyncHandler(login));
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));
router.post('/reset-password', authLimiter, asyncHandler(resetPassword));
router.post('/change-password', protect, authLimiter, asyncHandler(changePassword));
router.get('/me', protect, asyncHandler(me));
router.post('/activity', protect, asyncHandler(recordActivity));
router.patch('/profile', protect, asyncHandler(updateProfile));
router.post('/logout', logout);

// Active Sessions management
router.get('/sessions', protect, asyncHandler(getSessions));
router.delete('/sessions/:sessionId', protect, asyncHandler(revokeSession));
router.post('/sessions/revoke-others', protect, asyncHandler(revokeOtherSessions));
router.post('/sessions/revoke-all', protect, asyncHandler(revokeAllSessions));

export default router;