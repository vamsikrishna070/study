import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const AppLockContext = createContext(null);

const PIN_STORE_KEY = 'studyarena.applock.pin';
const LOCK_TIMEOUT_KEY = 'studyarena.applock.timeout';
const BIOMETRIC_STORE_KEY = 'studyarena.applock.biometricEnabled';

export const useAppLock = () => useContext(AppLockContext);

const AppLockProvider = ({ children }) => {
  const [isLockEnabled, setIsLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimeout, setLockTimeout] = useState(0);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricStatus, setBiometricStatus] = useState({ hasHardware: false, isEnrolled: false, supportedTypes: [] });

  const appState = useRef(AppState.currentState);
  const lastBackgroundTime = useRef(Date.now());
  const isLoaded = useRef(false);


  useEffect(() => {
    const init = async () => {
      try {
        const storedPin = await SecureStore.getItemAsync(PIN_STORE_KEY);
        const storedTimeout = await SecureStore.getItemAsync(LOCK_TIMEOUT_KEY);
        const storedBiometric = await SecureStore.getItemAsync(BIOMETRIC_STORE_KEY);

        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();

        console.log('[AppLock] biometric hardware:', hasHardware);
        console.log('[AppLock] biometric enrolled:', isEnrolled);
        console.log('[AppLock] supported types:', supportedTypes);
        console.log('[AppLock] stored biometricEnabled:', storedBiometric);

        setBiometricStatus({ hasHardware, isEnrolled, supportedTypes });
        setBiometricAvailable(hasHardware && isEnrolled);


        const isBioPrefEnabled = storedBiometric === 'true';
        setBiometricEnabled(isBioPrefEnabled);

        if (storedPin) {
          setIsLockEnabled(true);
          setIsLocked(true);
        }

        if (storedTimeout) {
          setLockTimeout(parseInt(storedTimeout, 10));
        }
      } catch (err) {
        console.error('[AppLock] SecureStore initialization failed:', err);
        setIsLockEnabled(false);
        setIsLocked(false);
        setBiometricEnabled(false);
        setLockTimeout(0);
      } finally {
        isLoaded.current = true;
      }
    };
    init();
  }, []);


  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (!isLoaded.current || !isLockEnabled) {
        appState.current = nextAppState;
        return;
      }


      if (appState.current.match(/active/) && nextAppState.match(/inactive|background/)) {
        lastBackgroundTime.current = Date.now();
      }


      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const timeSpentInBackground = Date.now() - lastBackgroundTime.current;
        if (timeSpentInBackground >= lockTimeout) {
          setIsLocked(true);
        }
      }

      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isLockEnabled, lockTimeout]);

  const unlock = () => {
    setIsLocked(false);
  };

  const enableLock = async (pin, timeoutMs = 0) => {
    try {
      await SecureStore.setItemAsync(PIN_STORE_KEY, pin);
      await SecureStore.setItemAsync(LOCK_TIMEOUT_KEY, timeoutMs.toString());
      setLockTimeout(timeoutMs);
      setIsLockEnabled(true);
      return true;
    } catch (e) {
      console.warn('Error enabling lock:', e);
      return false;
    }
  };

  const disableLock = async () => {
    try {
      await SecureStore.deleteItemAsync(PIN_STORE_KEY);
      await SecureStore.deleteItemAsync(LOCK_TIMEOUT_KEY);
      await SecureStore.deleteItemAsync(BIOMETRIC_STORE_KEY);
      setIsLockEnabled(false);
      setIsLocked(false);
      setBiometricEnabled(false);
      return true;
    } catch (e) {
      console.warn('Error disabling lock:', e);
      return false;
    }
  };

  const updateTimeout = async (timeoutMs) => {
    try {
      await SecureStore.setItemAsync(LOCK_TIMEOUT_KEY, timeoutMs.toString());
      setLockTimeout(timeoutMs);
      return true;
    } catch (e) {
      return false;
    }
  };

  const updateBiometricEnabled = async (enabled) => {
    try {
      const valStr = enabled ? 'true' : 'false';
      await SecureStore.setItemAsync(BIOMETRIC_STORE_KEY, valStr);
      setBiometricEnabled(Boolean(enabled));
      return true;
    } catch (e) {
      console.warn('Error updating biometric preference:', e);
      return false;
    }
  };

  const verifyPin = async (enteredPin) => {
    try {
      const storedPin = await SecureStore.getItemAsync(PIN_STORE_KEY);
      return storedPin === enteredPin;
    } catch (e) {
      return false;
    }
  };

  return (
    <AppLockContext.Provider
      value={{
        isLockEnabled,
        isLocked,
        lockTimeout,
        biometricEnabled,
        biometricAvailable,
        biometricStatus,
        unlock,
        enableLock,
        disableLock,
        updateTimeout,
        updateBiometricEnabled,
        verifyPin,
      }}
    >
      {children}
    </AppLockContext.Provider>
  );
};

export default AppLockProvider;
