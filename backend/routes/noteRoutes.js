import { Router } from 'express';
import { createNote, deleteNote, getNotes, updateNote } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getNotes));
router.post('/', asyncHandler(createNote));
router.patch('/:id', asyncHandler(updateNote));
router.delete('/:id', asyncHandler(deleteNote));
export default router;