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

  const title = reminder.title || "Study Reminder";
  const body = reminder.description
    ? `${reminder.title}\n${reminder.description}`
    : reminder.title;

  // Determine Channel ID
  let channelId = 'study-alarm-default';
  let soundFilename = true; // Use system default

  if (reminder.soundId === 'default_alarm') {
    channelId = 'study-alarm-default-custom';
    soundFilename = 'default_alarm.wav';
  } else if (reminder.soundId === 'gentle_alarm') {
    channelId = 'study-alarm-gentle';
    soundFilename = 'gentle_alarm.wav';
  } else if (reminder.soundId === 'study_bell') {
    channelId = 'study-alarm-bell';
    soundFilename = 'study_bell.wav';
  }

  let trigger;
  
  if (type === 'one-time') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      channelId,
      date: triggerDate,
    };
  } else if (type === 'daily') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId,
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  } else if (type === 'weekly') {
    let jsWeekday = triggerDate.getDay(); 
    if (reminder.weekdays && reminder.weekdays.length > 0) {
      jsWeekday = reminder.weekdays[0]; 
    }
    const expoWeekday = jsWeekday + 1; 
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      channelId,
      weekday: expoWeekday,
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  } else if (type === 'monthly') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      channelId,
      day: reminder.repeatDayOfMonth || triggerDate.getDate(),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  } else if (type === 'yearly') {
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      channelId,
      month: triggerDate.getMonth(), 
      day: reminder.repeatDayOfMonth || triggerDate.getDate(),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      vibrate: [0, 500, 500, 500],
      sound: soundFilename,
      priority: Notifications.AndroidNotificationPriority.MAX,
      autoDismiss: false, // Keep it ringing
    },
    trigger,
  });
  
  return id;
};

export const cancelReminderNotification = async (notificationId) => {
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }
};

export const getAllScheduledNotifications = async () => {
  return await Notifications.getAllScheduledNotificationsAsync();
};
