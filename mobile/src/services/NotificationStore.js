/**
 * NotificationStore
 *
 * Persists the mapping of { reminderId → localNotificationId } using AsyncStorage.
 * This is necessary because the backend Reminder model does not store notification IDs.
 * On app restart we use this to cancel/reschedule notifications correctly.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@studyarena:notif_ids';

let _cache = null;

const load = async () => {
  if (_cache) return _cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    _cache = raw ? JSON.parse(raw) : {};
  } catch {
    _cache = {};
  }
  return _cache;
};

const persist = async (map) => {
  _cache = map;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn('[NotificationStore] Failed to persist:', e);
  }
};

export const getNotifId = async (reminderId) => {
  const map = await load();
  return map[reminderId] || null;
};

export const setNotifId = async (reminderId, notifId) => {
  const map = await load();
  const next = { ...map, [reminderId]: notifId };
  await persist(next);
};

export const removeNotifId = async (reminderId) => {
  const map = await load();
  const next = { ...map };
  delete next[reminderId];
  await persist(next);
};

export const getAllNotifIds = async () => {
  return await load();
};
