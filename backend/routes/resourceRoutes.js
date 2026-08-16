import { Router } from 'express';
import { createResource, getResources, updateResource, deleteResource } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getResources));
router.post('/', asyncHandler(createResource));
router.patch('/:id', asyncHandler(updateResource));
router.delete('/:id', asyncHandler(deleteResource));
export default router;