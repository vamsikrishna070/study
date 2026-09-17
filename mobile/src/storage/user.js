import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_USER_KEY = 'studyarena_cached_user';
const CACHED_DASHBOARD_KEY = 'studyarena_cached_dashboard';

export const getCachedUser = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[Storage] Error reading cached user:', error?.message || error);
    return null;
  }
};

export const setCachedUser = async (user) => {
  try {
    if (user) {
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(CACHED_USER_KEY);
    }
  } catch (error) {
    console.warn('[Storage] Error saving cached user:', error?.message || error);
  }
};

export const removeCachedUser = async () => {
  try {
    await AsyncStorage.removeItem(CACHED_USER_KEY);
  } catch (error) {
    console.warn('[Storage] Error removing cached user:', error?.message || error);
  }
};

export const getCachedDashboard = async () => {
  try {
    const raw = await AsyncStorage.getItem(CACHED_DASHBOARD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[Storage] Error reading cached dashboard:', error?.message || error);
    return null;
  }
};

export const setCachedDashboard = async (data) => {
  try {
    if (data) {
      await AsyncStorage.setItem(CACHED_DASHBOARD_KEY, JSON.stringify(data));
    } else {
      await AsyncStorage.removeItem(CACHED_DASHBOARD_KEY);
    }
  } catch (error) {
    console.warn('[Storage] Error saving cached dashboard:', error?.message || error);
  }
};
