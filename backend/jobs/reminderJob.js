import Reminder from '../models/Reminder.js';
import Notification from '../models/Notification.js';

export async function processDueReminders() {
  const now = new Date();
  const reminders = await Reminder.find({
    status: 'pending',
    $or: [
      { lastFiredAt: { $exists: false } },
      { lastFiredAt: { $lt: new Date(now.getTime() - 86400000) } } // Only fire once a day
    ]
  });

  for (const reminder of reminders) {
    const reminderDate = new Date(reminder.date);
    if (reminderDate.getTime() <= now.getTime() || (reminderDate.getTime() - now.getTime() <= 86400000)) { // Due or within 24h
      await Notification.create({
        user: reminder.user,
        title: `Reminder: ${reminder.title}`,
        detail: `Due on ${reminderDate.toDateString()}`,
        type: 'reminder'
      });
      reminder.lastFiredAt = now;
      if (reminderDate.getTime() <= now.getTime()) {
        reminder.status = 'completed';
      }
      await reminder.save();
    }
  }
  return reminders.length;
}