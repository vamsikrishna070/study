import { Router } from 'express';
import { getProgress } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/', protect, asyncHandler(getProgress));
export default router;