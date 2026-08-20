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
    await Notifications.setNotificationChannelAsync('study-reminders', {
      name: 'Study Reminders',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#df6b47',
      // use system default sound implicitly
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

  let trigger;
  
  if (type === 'one-time') {
    // DateTriggerInput — fires once at the exact date
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      channelId: 'study-reminders',
      date: triggerDate,
    };
  } else if (type === 'daily') {
    // DailyTriggerInput — fires every day at hour:minute
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      channelId: 'study-reminders',
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  } else if (type === 'weekly') {
    // WeeklyTriggerInput — weekday: 1 = Sunday, 2 = Monday, ..., 7 = Saturday
    let jsWeekday = triggerDate.getDay(); // JS: 0 = Sun, 1 = Mon, ..., 6 = Sat
    if (reminder.weekdays && reminder.weekdays.length > 0) {
      jsWeekday = reminder.weekdays[0]; // Use first selected weekday
    }
    const expoWeekday = jsWeekday + 1; // Expo: 1 = Sun, 2 = Mon, ..., 7 = Sat
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      channelId: 'study-reminders',
      weekday: expoWeekday,
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  } else if (type === 'monthly') {
    // MonthlyTriggerInput — day (1-31), hour, minute
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.MONTHLY,
      channelId: 'study-reminders',
      day: reminder.repeatDayOfMonth || triggerDate.getDate(),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  } else if (type === 'yearly') {
    // YearlyTriggerInput — month (0-11 JS range), day (1-31), hour, minute
    trigger = {
      type: Notifications.SchedulableTriggerInputTypes.YEARLY,
      channelId: 'study-reminders',
      month: triggerDate.getMonth(), // 0 = Jan, 11 = Dec
      day: reminder.repeatDayOfMonth || triggerDate.getDate(),
      hour: triggerDate.getHours(),
      minute: triggerDate.getMinutes(),
    };
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      vibrate: [0, 250, 250, 250],
      sound: true, // System default — arbitrary local audio not supported for background notifications
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
