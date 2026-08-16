import { Router } from 'express';
import { extractSyllabus, confirmSyllabus } from '../controllers/syllabusController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.post('/extract', protect, asyncHandler(extractSyllabus));
router.post('/confirm', protect, asyncHandler(confirmSyllabus));

export default router;
