import Reminder from '../models/Reminder.js';

export async function findDueReminders(now = new Date()) {
  return Reminder.find({ enabled: true, notificationEnabled: true, remindAt: { $lte: now } });
}