import { Router } from 'express';
import { 
  getStudySessions, 
  createStudySession, 
  updateStudySession, 
  deleteStudySession,
  getStudyStats 
} from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);

router.get('/stats', asyncHandler(getStudyStats));
router.get('/', asyncHandler(getStudySessions));
router.post('/', asyncHandler(createStudySession));
router.patch('/:id', asyncHandler(updateStudySession));
router.delete('/:id', asyncHandler(deleteStudySession));

export default router;