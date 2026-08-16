import { Router } from 'express';
import { getUnits, createUnit, updateUnit, deleteUnit } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getUnits));
router.post('/', asyncHandler(createUnit));
router.patch('/:id', asyncHandler(updateUnit));
router.delete('/:id', asyncHandler(deleteUnit));
export default router;
