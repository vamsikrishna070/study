import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { checkForAppUpdate, openApkDownloadUrl, getAppVersionInfo } from '../services/appUpdateService';
import { UpdateDialog } from '../components/ui/UpdateDialog';

export const AppUpdateContext = createContext({
  appVersion: getAppVersionInfo(),
  updateInfo: null,
  isChecking: false,
  checkUpdate: async () => {},
  showUpdateDialog: () => {},
});

const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between automatic background checks

export function AppUpdateProvider({ children }) {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  const lastCheckTimeRef = useRef(0);
  const appVersion = getAppVersionInfo();

  const handlePerformCheck = useCallback(async (manual = false) => {
    if (isChecking) return null;

    const now = Date.now();
    if (!manual && now - lastCheckTimeRef.current < CHECK_COOLDOWN_MS) {
      return null;
    }

    try {
      setIsChecking(true);
      lastCheckTimeRef.current = now;

      const result = await checkForAppUpdate();
      if (result?.success && result.isUpdateAvailable) {
        setUpdateInfo(result);
        setDialogVisible(true);
      } else {
        setDialogVisible(false);
      }
      return result;
    } catch (err) {
      if (__DEV__) {
        console.log('[AppUpdateContext] Update check error (silently handled):', err?.message || err);
      }
      return null;
    } finally {
      setIsChecking(false);
    }
  }, [isChecking]);

  // Initial non-blocking startup check
  useEffect(() => {
    const timer = setTimeout(() => {
      handlePerformCheck(false);
    }, 2500); // 2.5s delay to prioritize critical UI and login hydration

    return () => clearTimeout(timer);
  }, [handlePerformCheck]);

  // AppState listener for background -> foreground transition
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        handlePerformCheck(false);
      }
    });

    return () => subscription.remove();
  }, [handlePerformCheck]);

  const handleUpdateNow = async () => {
    if (!updateInfo?.downloadUrl) return;

    try {
      setIsDownloading(true);
      setDownloadError('');
      await openApkDownloadUrl(updateInfo.downloadUrl);
      // If not forced, close dialog after triggering download
      if (!updateInfo.isForced) {
        setDialogVisible(false);
      }
    } catch (err) {
      setDownloadError(err.message || 'Unable to open APK download link.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDismiss = () => {
    if (updateInfo?.isForced) {
      // Cannot dismiss forced update
      return;
    }
    setDialogVisible(false);
  };

  return (
    <AppUpdateContext.Provider
      value={{
        appVersion,
        updateInfo,
        isChecking,
        checkUpdate: handlePerformCheck,
        showUpdateDialog: () => setDialogVisible(true),
      }}
    >
      {children}

      {/* Production-Quality Responsive Direct-APK Update Dialog */}
      {Boolean(updateInfo?.isUpdateAvailable) && (
        <UpdateDialog
          visible={dialogVisible}
          updateInfo={updateInfo}
          onUpdateNow={handleUpdateNow}
          onDismiss={handleDismiss}
          isDownloading={isDownloading}
          downloadError={downloadError}
        />
      )}
    </AppUpdateContext.Provider>
  );
}
