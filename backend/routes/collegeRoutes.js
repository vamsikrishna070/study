import { Router } from 'express';
import { getStates, getColleges, getCollegeById } from '../controllers/collegeController.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/states', asyncHandler(getStates));
router.get('/', asyncHandler(getColleges));
router.get('/:id', asyncHandler(getCollegeById));

export default router;
