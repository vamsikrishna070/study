import { Router } from 'express';
import { getRecordings, createRecording, updateRecording, deleteRecording } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getRecordings));
router.post('/', asyncHandler(createRecording));
router.patch('/:id', asyncHandler(updateRecording));
router.delete('/:id', asyncHandler(deleteRecording));
export default router;