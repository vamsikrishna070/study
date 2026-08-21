import { NativeModules, Platform } from 'react-native';

const { AlarmModule } = NativeModules;

export const scheduleAlarm = async (id, timestamp, title, soundId, soundUri = null) => {
  if (Platform.OS !== 'android' || !AlarmModule) return false;
  
  try {
    const hasPermission = await AlarmModule.checkExactAlarmPermission();
    if (!hasPermission) {
      await AlarmModule.openExactAlarmSettings();
      return false;
    }

    const res = await AlarmModule.scheduleAlarm(id, timestamp, title, soundId || 'default', soundUri || null);
    return res;
  } catch (e) {
    console.error('Failed to schedule native alarm:', e);
    return false;
  }
};

export const cancelAlarm = async (id) => {
  if (Platform.OS !== 'android' || !AlarmModule) return false;
  
  try {
    await AlarmModule.cancelAlarm(id);
    return true;
  } catch (e) {
    console.error('Failed to cancel native alarm:', e);
    return false;
  }
};

export const playAudioPreview = async (soundId, soundUri = null) => {
  if (Platform.OS !== 'android' || !AlarmModule) return false;

  try {
    return await AlarmModule.playAudioPreview(soundId || 'default', soundUri || null);
  } catch (e) {
    console.warn('Failed to play audio preview:', e);
    return false;
  }
};

export const stopAudioPreview = async () => {
  if (Platform.OS !== 'android' || !AlarmModule) return false;

  try {
    return await AlarmModule.stopAudioPreview();
  } catch (e) {
    console.warn('Failed to stop audio preview:', e);
    return false;
  }
};

export const checkExactAlarmPermission = async () => {
  if (Platform.OS !== 'android' || !AlarmModule) return true;
  return await AlarmModule.checkExactAlarmPermission();
};

export const openExactAlarmSettings = async () => {
  if (Platform.OS !== 'android' || !AlarmModule) return false;
  return await AlarmModule.openExactAlarmSettings();
};
