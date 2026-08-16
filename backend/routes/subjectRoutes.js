import { Router } from 'express';
import { createSubject, deleteSubject, getSubjects, updateSubject } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getSubjects));
router.post('/', asyncHandler(createSubject));
router.patch('/:id', asyncHandler(updateSubject));
router.delete('/:id', asyncHandler(deleteSubject));
export default router;