import { Router } from 'express';
import { getNotifications, readNotification, readAllNotifications, deleteNotification } from '../controllers/studyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.post('/subscribe', asyncHandler(async (req, res) => {
  const { endpoint, keys } = req.body;
  if (!endpoint || !keys) return res.status(400).json({ success: false, message: 'Invalid subscription data' });
  const PushSubscription = (await import('../models/PushSubscription.js')).default;
  await PushSubscription.updateOne(
    { user: req.user._id, endpoint },
    { user: req.user._id, endpoint, keys },
    { upsert: true }
  );
  res.json({ success: true, message: 'Subscribed' });
}));
router.get('/', asyncHandler(getNotifications));
router.patch('/read', asyncHandler(readAllNotifications));
router.patch('/:id/read', asyncHandler(readNotification));
router.delete('/:id', asyncHandler(deleteNotification));
export default router;