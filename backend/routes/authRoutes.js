import { Router } from 'express';
import { login, logout, me, register, updateProfile, verifyEmail, forgotPassword, resetPassword, resendOtp, recordActivity } from '../controllers/authController.js';
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
router.get('/me', protect, asyncHandler(me));
router.post('/activity', protect, asyncHandler(recordActivity));
router.patch('/profile', protect, asyncHandler(updateProfile));
router.post('/logout', logout);
export default router;