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

  setInterval(async () => {
    try {
      const now = new Date();

      const dueReminders = await Reminder.find({
        enabled: true,
        remindAt: { $lte: now },
        $or: [
          { lastFiredAt: null },
          { scheduleType: { $in: ['daily', 'weekly'] } }
        ]
      });

      for (const reminder of dueReminders) {

        if (reminder.scheduleType !== 'one-time') {
          if (reminder.lastFiredAt && (now.getTime() - reminder.lastFiredAt.getTime()) < 12 * 60 * 60 * 1000) {
            continue;
          }
        }

        reminder.lastFiredAt = now;
        if (reminder.scheduleType === 'one-time') {
          reminder.enabled = false;
        } else if (reminder.scheduleType === 'daily') {
          reminder.remindAt = new Date(reminder.remindAt.getTime() + 24 * 60 * 60 * 1000);
        } else if (reminder.scheduleType === 'weekly') {
          reminder.remindAt = new Date(reminder.remindAt.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
        await reminder.save();

        await Notification.create({
          user: reminder.user,
          title: reminder.title,
          message: reminder.description || 'Reminder is due',
          type: 'system',
          actionUrl: '/reminders'
        });

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
