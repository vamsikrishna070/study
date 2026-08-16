import { Router } from 'express';
import { getTopics, createTopic, updateTopic, deleteTopic } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getTopics));
router.post('/', asyncHandler(createTopic));
router.patch('/:id', asyncHandler(updateTopic));
router.delete('/:id', asyncHandler(deleteTopic));
export default router;