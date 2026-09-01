import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

export const isExpoGo = () => {
  try {
    return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  } catch (_) {
    return false;
  }
};

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  console.warn('[NotificationService] Failed to set notification handler:', e.message);
}

export const setupNotifications = async () => {
  let hasPermission = false;

  try {
    if (Platform.OS === 'android') {
      const baseConfig = {
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 500, 500],
        lightColor: '#df6b47',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        audioAttributes: {
          usage: Notifications.AndroidAudioUsage.ALARM,
        },
      };

      await Notifications.setNotificationChannelAsync('study-alarm-default', {
        ...baseConfig,
        name: 'Reminders (Default Sound)',
        sound: true,
      });

      await Notifications.setNotificationChannelAsync('study-alarm-default-custom', {
        ...baseConfig,
        name: 'Reminders (Default Alarm)',
        sound: 'default_alarm.wav',
      });

      await Notifications.setNotificationChannelAsync('study-alarm-gentle', {
        ...baseConfig,
        name: 'Reminders (Gentle)',
        sound: 'gentle_alarm.wav',
      });

      await Notifications.setNotificationChannelAsync('study-alarm-bell', {
        ...baseConfig,
        name: 'Reminders (Study Bell)',
        sound: 'study_bell.wav',
      });

      await Notifications.setNotificationChannelAsync('study-task-alerts', {
        name: 'Task Alerts & Pending Notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#df6b47',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        sound: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus === 'granted') {
      hasPermission = true;
    }
  } catch (err) {
    console.warn('[NotificationService] setupNotifications failed (often expected in Expo Go SDK 57):', err.message);
  }

  return hasPermission;
};

export const scheduleReminderNotification = async (reminder) => {
  console.log('[Reminder] Creating reminder');
  console.log('[Reminder] Recurrence:', reminder.scheduleType || 'one-time');

  try {
    const triggerDate = new Date(reminder.remindAt);
    const type = reminder.scheduleType || 'one-time';

    const soundChoice = reminder.soundChoice || reminder.soundId || 'default';
    let channelId = 'study-alarm-default';
    if (soundChoice === 'default_alarm') {
      channelId = 'study-alarm-default-custom';
    } else if (soundChoice === 'gentle' || soundChoice === 'gentle_alarm') {
      channelId = 'study-alarm-gentle';
    } else if (soundChoice === 'bell' || soundChoice === 'study_bell') {
      channelId = 'study-alarm-bell';
    }

    const title = reminder.title || 'Reminder';
    const body = reminder.description || 'Time for your scheduled study session.';

    const scheduledIds = [];

    if (type === 'daily') {
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        channelId,
      };
      console.log('[Reminder] Trigger:', JSON.stringify(trigger));
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId,
          data: { reminderId: reminder._id || reminder.id, scheduleType: type },
        },
        trigger,
      });
      scheduledIds.push(id);
    } else if (type === 'weekly') {
      const selectedDays = (Array.isArray(reminder.weekdays) && reminder.weekdays.length > 0)
        ? reminder.weekdays
        : [triggerDate.getDay()];

      for (const day of selectedDays) {
        const expoWeekday = (day % 7) + 1;
        const trigger = {
          type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
          weekday: expoWeekday,
          hour: triggerDate.getHours(),
          minute: triggerDate.getMinutes(),
          channelId,
        };
        console.log('[Reminder] Trigger:', JSON.stringify(trigger));
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            sound: true,
            priority: Notifications.AndroidNotificationPriority.HIGH,
            channelId,
            data: { reminderId: reminder._id || reminder.id, scheduleType: type, weekday: day },
          },
          trigger,
        });
        scheduledIds.push(id);
      }
    } else if (type === 'monthly') {
      const dayOfMonth = reminder.repeatDayOfMonth || triggerDate.getDate();
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
        day: dayOfMonth,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        channelId,
      };
      console.log('[Reminder] Trigger:', JSON.stringify(trigger));
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId,
          data: { reminderId: reminder._id || reminder.id, scheduleType: type },
        },
        trigger,
      });
      scheduledIds.push(id);
    } else if (type === 'yearly') {
      const dayOfMonth = reminder.repeatDayOfMonth || triggerDate.getDate();
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: triggerDate.getMonth(),
        day: dayOfMonth,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
        channelId,
      };
      console.log('[Reminder] Trigger:', JSON.stringify(trigger));
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId,
          data: { reminderId: reminder._id || reminder.id, scheduleType: type },
        },
        trigger,
      });
      scheduledIds.push(id);
    } else {
      if (triggerDate <= new Date()) {
        console.warn("[Reminder] Cannot schedule one-time notification in the past.");
        return null;
      }
      const trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId,
      };
      console.log('[Reminder] Trigger:', JSON.stringify(trigger));
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          channelId,
          data: { reminderId: reminder._id || reminder.id, scheduleType: 'one-time' },
        },
        trigger,
      });
      scheduledIds.push(id);
    }

    const finalId = scheduledIds.length === 1 ? scheduledIds[0] : JSON.stringify(scheduledIds);
    console.log('[Reminder] Notification ID:', finalId);
    console.log('[Reminder] Scheduling result: SUCCESS');

    const allScheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('[Reminder] Scheduled notifications count:', allScheduled.length);
    console.log('[Reminder] Scheduled notifications:', JSON.stringify(allScheduled, null, 2));

    return finalId;
  } catch (err) {
    console.error("[Reminder] Scheduling result: ERROR -", err);
    return null;
  }
};

export const cancelReminderNotification = async (notificationId) => {
  if (!notificationId) return;
  try {
    let ids = [];
    if (typeof notificationId === 'string' && notificationId.startsWith('[')) {
      try {
        ids = JSON.parse(notificationId);
      } catch (_) {
        ids = [notificationId];
      }
    } else if (Array.isArray(notificationId)) {
      ids = notificationId;
    } else {
      ids = [notificationId];
    }

    for (const id of ids) {
      if (id) {
        await Notifications.cancelScheduledNotificationAsync(id);
      }
    }
  } catch (err) {
    console.warn('[NotificationService] Failed to cancel notification:', err.message);
  }
};

export const scheduleTaskPendingAlert = async (task) => {
  try {
    if (!task || task.status === 'completed' || task.status === 'in_progress') return null;

    let triggerTime = null;
    if (task.dueDate && task.dueTime) {
      try {
        const [h, m] = task.dueTime.split(':').map(Number);
        const d = new Date(task.dueDate);
        if (!isNaN(h) && !isNaN(m) && !isNaN(d.getTime())) {
          d.setHours(h, m, 0, 0);
          triggerTime = d;
        }
      } catch (_) {}
    } else if (task.scheduledStartAt) {
      triggerTime = new Date(task.scheduledStartAt);
    }

    if (!triggerTime || isNaN(triggerTime.getTime())) return null;

    const notificationTime = new Date(triggerTime.getTime() - 60 * 60 * 1000);

    if (notificationTime <= new Date()) {
      return null;
    }

    const timeStr = task.dueTime || triggerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const title = '🔴 TASK PENDING';
    const body = `${task.title} — You haven't started this task yet. Complete by ${timeStr}.`;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        channelId: 'study-task-alerts',
        data: { taskId: task._id || task.id, type: 'task_pending' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationTime,
        channelId: 'study-task-alerts',
      },
    });
    return id;
  } catch (err) {
    console.warn('[NotificationService] Failed to schedule Task Pending alert:', err.message);
    return null;
  }
};

export const scheduleTaskDailyReminder = async (task) => {
  try {
    if (!task || !task.reminderEnabled || !task.reminderTime) return null;
    const [hoursStr, minutesStr] = (task.reminderTime || '09:00').split(':');
    const hours = parseInt(hoursStr, 10) || 0;
    const minutes = parseInt(minutesStr, 10) || 0;

    const title = `Task Reminder: ${task.title}`;
    const body = "Don't forget to work on your task today.";

    const trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: hours,
      minute: minutes,
      channelId: 'study-alarm-default',
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
        channelId: 'study-alarm-default',
        data: { taskId: task._id || task.id, type: 'task_daily' },
      },
      trigger,
    });
    return id;
  } catch (err) {
    console.warn('[NotificationService] Failed to schedule Task daily reminder:', err.message);
    return null;
  }
};

export const cancelTaskNotification = async (notificationId) => {
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.warn('[NotificationService] Failed to cancel Task notification:', err.message);
    }
  }
};

export const getAllScheduledNotifications = async () => {
  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn('[NotificationService] Failed to get all scheduled notifications:', err.message);
    return [];
  }
};
