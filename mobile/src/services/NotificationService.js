import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure how notifications appear when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const setupNotifications = async () => {
  let hasPermission = false;
  
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

  return hasPermission;
};

export const scheduleReminderNotification = async (reminder) => {
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

  try {
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
    console.error("[NotificationService] Failed to schedule notification:", err);
    return null;
  }
};

export const cancelReminderNotification = async (notificationId) => {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
};

export const scheduleTaskPendingAlert = async (task) => {
  if (!task || task.status === 'completed' || task.status === 'in_progress') return null;

  let triggerTime = null;
  if (task.scheduledStartAt) {
    triggerTime = new Date(task.scheduledStartAt);
  } else if (task.dueDate && task.dueTime) {
    try {
      const [h, m] = task.dueTime.split(':').map(Number);
      const d = new Date(task.dueDate);
      if (!isNaN(h) && !isNaN(m) && !isNaN(d.getTime())) {
        d.setHours(h, m, 0, 0);
        triggerTime = d;
      }
    } catch (_) {}
  }

  if (!triggerTime) return null;

  // Subtract 1 hour for the 1-hour-before reminder
  const notificationTime = new Date(triggerTime.getTime() - 60 * 60 * 1000);
  if (notificationTime <= new Date()) return null;

  const timeStr = task.dueTime || triggerTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const title = '🔴 TASK PENDING';
  const body = `${task.title} — You haven't started this task yet. Complete by ${timeStr}.`;

  try {
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
    console.error('[NotificationService] Failed to schedule Task Pending alert:', err);
    return null;
  }
};

export const scheduleTaskDailyReminder = async (task) => {
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

  try {
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
    console.error('[NotificationService] Failed to schedule Task daily reminder:', err);
    return null;
  }
};

export const cancelTaskNotification = async (notificationId) => {
  if (notificationId) {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
    } catch (err) {
      console.warn('[NotificationService] Failed to cancel Task notification:', err);
    }
  }
};

export const getAllScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};
