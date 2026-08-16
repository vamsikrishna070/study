import { Router } from 'express';
import { createTask, deleteTask, getTasks, updateTask } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getTasks));
router.post('/', asyncHandler(createTask));
router.patch('/:id', asyncHandler(updateTask));
router.delete('/:id', asyncHandler(deleteTask));
export default router;