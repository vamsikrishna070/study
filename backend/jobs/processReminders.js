import mongoose from 'mongoose';
import webpush from 'web-push';
import Reminder from '../models/Reminder.js';
import PushSubscription from '../models/PushSubscription.js';
import Notification from '../models/Notification.js';
import { env } from '../config/env.js';
import { connectDB } from '../config/db.js';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    env.VAPID_SUBJECT || 'mailto:admin@studyarena.com',
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
}

async function processReminders() {
  console.log('Starting standalone reminder processor (Cron Job)...');
  await connectDB();

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

    console.log(`Found ${dueReminders.length} due reminder(s).`);

    for (const reminder of dueReminders) {
      if (reminder.scheduleType !== 'one-time') {
        if (reminder.lastFiredAt && (now.getTime() - reminder.lastFiredAt.getTime()) < 12 * 60 * 60 * 1000) {
          continue;
        }
      }

      reminder.lastFiredAt = now;
      if (reminder.scheduleType === 'one-time') {
        reminder.enabled = false;
      } else {
        try {
          const tz = reminder.timezone || 'UTC';
          const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
          });
          const parts = formatter.formatToParts(reminder.remindAt);
          const dateMap = {};
          parts.forEach(p => dateMap[p.type] = p.value);

          let localDate = new Date(`${dateMap.year}-${dateMap.month}-${dateMap.day}T${dateMap.hour}:${dateMap.minute}:${dateMap.second}`);
          if (reminder.scheduleType === 'daily') {
            localDate.setDate(localDate.getDate() + 1);
          } else if (reminder.scheduleType === 'weekly') {
            localDate.setDate(localDate.getDate() + 7);
          }

          const localeString = localDate.toLocaleString('en-US', { timeZone: tz });
          const baseOffset = new Date(localeString).getTime() - localDate.getTime();
          reminder.remindAt = new Date(localDate.getTime() - baseOffset);
        } catch (e) {

          const addTime = reminder.scheduleType === 'daily' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;
          reminder.remindAt = new Date(reminder.remindAt.getTime() + addTime);
        }
      }
      await reminder.save();

      await Notification.create({
        user: reminder.user,
        title: reminder.title,
        message: reminder.description || 'Reminder is due',
        type: 'system',
        actionUrl: '/reminders'
      });

      if (reminder.notificationEnabled && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
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
            } else {
              console.error('Push error:', err);
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error processing reminders:', err);
  } finally {
    console.log('Reminder processing complete. Exiting...');
    await mongoose.disconnect();
    process.exit(0);
  }
}

processReminders();
