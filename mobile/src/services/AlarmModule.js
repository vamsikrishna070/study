import { NativeModules, Platform, Alert, Linking } from 'react-native';

const { AlarmModule } = NativeModules;

export const scheduleAlarm = async (id, timestamp, title, soundId) => {
  if (Platform.OS !== 'android') return;
  
  try {
    const hasPermission = await AlarmModule.checkExactAlarmPermission();
    if (!hasPermission) {
      Alert.alert(
        'Exact Alarm Permission Required',
        'To ensure reminders fire exactly on time, StudyArena needs the "Alarms & Reminders" permission. Please enable it in Settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => AlarmModule.openExactAlarmSettings() }
        ]
      );
      return false; // Return false so UI doesn't fake success
    }

    await AlarmModule.scheduleAlarm(id, timestamp, title, soundId);
    return true;
  } catch (e) {
    console.error('Failed to schedule native alarm:', e);
    return false;
  }
};

export const cancelAlarm = async (id) => {
  if (Platform.OS !== 'android') return;
  
  try {
    await AlarmModule.cancelAlarm(id);
    return true;
  } catch (e) {
    console.error('Failed to cancel native alarm:', e);
    return false;
  }
};
