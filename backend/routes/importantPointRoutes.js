import { Router } from 'express';
import { getImportantPoints, createImportantPoint, updateImportantPoint, deleteImportantPoint } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(getImportantPoints));
router.post('/', asyncHandler(createImportantPoint));
router.patch('/:id', asyncHandler(updateImportantPoint));
router.delete('/:id', asyncHandler(deleteImportantPoint));
export default router;
