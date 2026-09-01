import { Router } from 'express';
import {
  connectPortal,
  getStatus,
  syncPortal,
  getCalendar,
  disconnectPortal,
  getTodayAttendance,
  markAttendance,
  getTimetableData,
} from '../controllers/portal/portalController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireSrmApEligible } from '../middleware/srmApMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(protect);
router.use(requireSrmApEligible);

router.post('/connect', asyncHandler(connectPortal));
router.get('/status', asyncHandler(getStatus));
router.post('/sync', asyncHandler(syncPortal));
router.get('/calendar', asyncHandler(getCalendar));
router.delete('/disconnect', asyncHandler(disconnectPortal));

router.get('/attendance/today', asyncHandler(getTodayAttendance));
router.post('/attendance/mark', asyncHandler(markAttendance));
router.get('/timetable', asyncHandler(getTimetableData));

export default router;
