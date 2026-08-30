import { Router } from 'express';
import { login, logout, me, register, updateProfile, verifyEmail, forgotPassword, resetPassword, resendOtp, recordActivity } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/verify-email', asyncHandler(verifyEmail));
router.post('/resend-otp', asyncHandler(resendOtp));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.post('/reset-password', asyncHandler(resetPassword));
router.get('/me', protect, asyncHandler(me));
router.post('/activity', protect, asyncHandler(recordActivity));
router.patch('/profile', protect, asyncHandler(updateProfile));
router.post('/logout', logout);
export default router;