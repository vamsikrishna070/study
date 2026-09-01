import { Router } from 'express';
import Reminder from '../models/Reminder.js';
import { protect } from '../middleware/authMiddleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();
router.use(protect);
router.get('/', asyncHandler(async (req, res) => {
  const reminders = await Reminder.find({ user: req.user._id }).sort({ remindAt: 1 });
  res.json({ success: true, data: reminders });
}));
router.post('/', asyncHandler(async (req, res) => {
  const { remindAt, scheduleType } = req.body;
  if ((!scheduleType || scheduleType === 'one-time') && remindAt) {
    const remindTime = new Date(remindAt).getTime();

    if (isNaN(remindTime) || remindTime <= (Date.now() - 5000)) {
      return res.status(400).json({
        success: false,
        message: 'Reminder date and time must be in the future.',
      });
    }
  }
  const reminder = await Reminder.create({ ...req.body, user: req.user._id });
  res.status(201).json({ success: true, data: reminder });
}));

router.patch('/:id', asyncHandler(async (req, res) => {
  const { remindAt, scheduleType } = req.body;
  if (remindAt) {
    const targetType = scheduleType || 'one-time';
    if (targetType === 'one-time') {
      const remindTime = new Date(remindAt).getTime();
      if (isNaN(remindTime) || remindTime <= (Date.now() - 5000)) {
        return res.status(400).json({
          success: false,
          message: 'Reminder date and time must be in the future.',
        });
      }
    }
  }
  const reminder = await Reminder.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, req.body, { new: true, runValidators: true });
  if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
  res.json({ success: true, data: reminder });
}));
router.delete('/:id', asyncHandler(async (req, res) => {
  const reminder = await Reminder.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found' });
  res.status(204).end();
}));
export default router;