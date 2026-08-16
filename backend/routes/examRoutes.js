import { Router } from 'express';
import { createExam, getExams, updateExam, deleteExam } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getExams));
router.post('/', asyncHandler(createExam));
router.patch('/:id', asyncHandler(updateExam));
router.delete('/:id', asyncHandler(deleteExam));
export default router;