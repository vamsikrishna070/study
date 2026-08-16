import { Router } from 'express';
import { login, logout, me, register, updateProfile } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.post('/register', asyncHandler(register));
router.post('/login', asyncHandler(login));
router.get('/me', protect, asyncHandler(me));
router.patch('/profile', protect, asyncHandler(updateProfile));
router.post('/logout', logout);
export default router;