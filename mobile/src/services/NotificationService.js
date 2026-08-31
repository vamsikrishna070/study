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

// Configure how notifications appear when the app is in the foreground
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

      // System Default channel
      await Notifications.setNotificationChannelAsync('study-alarm-default', {
        ...baseConfig,
        name: 'Reminders (Default Sound)',
        sound: true, // system default
      });

      // Default Custom Alarm channel
      await Notifications.setNotificationChannelAsync('study-alarm-default-custom', {
        ...baseConfig,
        name: 'Reminders (Default Alarm)',
        sound: 'default_alarm.wav',
      });

      // Gentle Alarm channel
      await Notifications.setNotificationChannelAsync('study-alarm-gentle', {
        ...baseConfig,
        name: 'Reminders (Gentle)',
        sound: 'gentle_alarm.wav',
      });

      // Study Bell channel
      await Notifications.setNotificationChannelAsync('study-alarm-bell', {
        ...baseConfig,
        name: 'Reminders (Study Bell)',
        sound: 'study_bell.wav',
      });

      // Task Alerts channel
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
  try {
    const triggerDate = new Date(reminder.remindAt);
    const type = reminder.scheduleType || 'one-time';

    if (type === 'one-time' && triggerDate <= new Date()) {
      console.warn("Cannot schedule one-time notification in the past.");
      return null;
    }

    const soundChoice = reminder.soundChoice || 'default';
    let channelId = 'study-alarm-default';

    if (soundChoice === 'default_alarm') {
      channelId = 'study-alarm-default-custom';
    } else if (soundChoice === 'gentle') {
      channelId = 'study-alarm-gentle';
    } else if (soundChoice === 'bell') {
      channelId = 'study-alarm-bell';
    }

    let trigger;
    if (type === 'daily') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        channelId,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
      };
    } else if (type === 'weekly') {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        channelId,
        weekday: triggerDate.getDay() + 1,
        hour: triggerDate.getHours(),
        minute: triggerDate.getMinutes(),
      };
    } else {
      trigger = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        channelId,
        date: triggerDate,
      };
    }

    const title = reminder.title || 'Reminder';
    const body = reminder.description || 'Time for your scheduled study session.';

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger,
    });
    return id;
  } catch (err) {
    console.warn("[NotificationService] Failed to schedule notification:", err.message);
    return null;
  }
};

export const cancelReminderNotification = async (notificationId) => {
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.warn('[NotificationService] Failed to cancel notification:', err.message);
    }
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

    if (__DEV__) {
      console.log('\n--- TASK NOTIFICATION DEBUG ---');
      console.log(`Task: ${task.title}`);
      console.log(`Current: ${new Date().toLocaleString()}`);
      console.log(`Due: ${triggerTime.toLocaleString()}`);
      console.log(`One-hour warning: ${notificationTime.toLocaleString()}`);
      console.log(`Reminder enabled: ${task.reminderEnabled ? 'yes' : 'no'}`);
      if (task.reminderEnabled) console.log(`Reminder time: ${task.reminderTime}`);
    }

    if (notificationTime <= new Date()) {
      if (__DEV__) console.log(`[NotificationService] Warning time is in the past. Skipping 1-hour warning.`);
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
        data: { taskId: task._id || task.id, type: 'task_pending' },
      },
      trigger: notificationTime,
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
      channelId: 'study-alarm-default',
      hour: hours,
      minute: minutes,
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true,
        priority: Notifications.AndroidNotificationPriority.DEFAULT,
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
