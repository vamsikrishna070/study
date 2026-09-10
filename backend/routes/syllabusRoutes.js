import { Router } from 'express';
import { extractSyllabus, confirmSyllabus, updateSyllabusStructure } from '../controllers/syllabusController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router({ mergeParams: true });

router.post('/extract', protect, asyncHandler(extractSyllabus));
router.post('/confirm', protect, asyncHandler(confirmSyllabus));
router.put('/', protect, asyncHandler(updateSyllabusStructure));
router.put('/edit', protect, asyncHandler(updateSyllabusStructure));
router.post('/save', protect, asyncHandler(updateSyllabusStructure));

export default router;

