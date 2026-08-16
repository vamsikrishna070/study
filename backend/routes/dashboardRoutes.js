import { Router } from 'express';
import { getDashboard } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.get('/', protect, asyncHandler(getDashboard));
export default router;