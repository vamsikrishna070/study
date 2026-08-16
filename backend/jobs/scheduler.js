import webpush from 'web-push';
import Reminder from '../models/Reminder.js';
import PushSubscription from '../models/PushSubscription.js';
import Notification from '../models/Notification.js';
import { env } from '../config/env.js';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

export function startScheduler() {
  console.log('Push Notification Scheduler started');
  
  // Run every minute
  setInterval(async () => {
    try {
      const now = new Date();
      // Find one-time reminders that are due and haven't fired
      const dueReminders = await Reminder.find({
        enabled: true,
        remindAt: { $lte: now },
        $or: [
          { lastFiredAt: null },
          { scheduleType: { $in: ['daily', 'weekly'] } }
        ]
      });

      for (const reminder of dueReminders) {
        // Simple logic: if daily/weekly, check if it already fired today
        if (reminder.scheduleType !== 'one-time') {
          if (reminder.lastFiredAt && (now.getTime() - reminder.lastFiredAt.getTime()) < 12 * 60 * 60 * 1000) {
            continue; // Already fired recently
          }
        }

        // Mark as fired
        reminder.lastFiredAt = now;
        if (reminder.scheduleType === 'one-time') {
          reminder.enabled = false;
        } else if (reminder.scheduleType === 'daily') {
          reminder.remindAt = new Date(reminder.remindAt.getTime() + 24 * 60 * 60 * 1000);
        } else if (reminder.scheduleType === 'weekly') {
          reminder.remindAt = new Date(reminder.remindAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        await reminder.save();

        // Save in app notification
        await Notification.create({
          user: reminder.user,
          title: reminder.title,
          message: reminder.description || 'Reminder is due',
          type: 'system',
          actionUrl: '/reminders'
        });

        // Send push notification if enabled
        if (reminder.notificationEnabled) {
          const subs = await PushSubscription.find({ user: reminder.user });
          const payload = JSON.stringify({
            title: reminder.title,
            body: reminder.description || 'Time for your task!',
            url: '/reminders'
          });

          for (const sub of subs) {
            try {
              await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: sub.keys },
                payload
              );
            } catch (err) {
              if (err.statusCode === 410 || err.statusCode === 404) {
                // Subscription has expired or is no longer valid
                await sub.deleteOne();
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Scheduler error:', err);
    }
  }, 60 * 1000);
}
