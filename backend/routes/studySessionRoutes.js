import { Router } from 'express';
import { getStudySessions, createStudySession, deleteStudySession } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getStudySessions));
router.post('/', asyncHandler(createStudySession));
router.delete('/:id', asyncHandler(deleteStudySession));
export default router;