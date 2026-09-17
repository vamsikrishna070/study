import { Router } from 'express';
import {
  connectPortal,
  getStatus,
  verifyPortal,
  syncPortal,
  getCalendar,
  disconnectPortal,
  getTodayAttendance,
  markAttendance,
  getTimetableData,
  getAttendancePlanner,
} from '../controllers/portal/portalController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requireSrmApEligible } from '../middleware/srmApMiddleware.js';
import { portalLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.use(protect);
router.use(requireSrmApEligible);

router.post('/connect', portalLimiter, asyncHandler(connectPortal));
router.get('/status', asyncHandler(getStatus));
router.get('/verify', asyncHandler(verifyPortal));
router.post('/sync', portalLimiter, asyncHandler(syncPortal));
router.get('/calendar', asyncHandler(getCalendar));
router.delete('/disconnect', asyncHandler(disconnectPortal));

router.get('/attendance/today', asyncHandler(getTodayAttendance));
router.post('/attendance/mark', portalLimiter, asyncHandler(markAttendance));
router.get('/attendance/planner', asyncHandler(getAttendancePlanner));
router.get('/timetable', asyncHandler(getTimetableData));

export default router;
