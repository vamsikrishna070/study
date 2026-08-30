import { Router } from 'express';
import {
  connectPortal,
  getStatus,
  syncPortal,
  getCalendar,
  disconnectPortal,
} from '../controllers/portal/portalController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireSrmApEligible } from '../middleware/srmApMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

// All portal routes require authentication + SRM AP eligibility
router.use(protect);
router.use(requireSrmApEligible);

router.post('/connect', asyncHandler(connectPortal));
router.get('/status', asyncHandler(getStatus));
router.post('/sync', asyncHandler(syncPortal));
router.get('/calendar', asyncHandler(getCalendar));
router.delete('/disconnect', asyncHandler(disconnectPortal));

export default router;
