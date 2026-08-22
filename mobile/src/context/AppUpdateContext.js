import React, { createContext, useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, AppState, Platform } from 'react-native';
import { Sparkles, CloudDownload, TriangleAlert } from 'lucide-react-native';
import { checkForAppUpdate, openApkDownloadUrl, getAppVersionInfo } from '../services/appUpdateService';
import { AppDialog } from '../components/ui/AppDialog';
import { useAppTheme, useStyles } from '../theme/theme';

export const AppUpdateContext = createContext({
  appVersion: getAppVersionInfo(),
  updateInfo: null,
  isChecking: false,
  checkUpdate: async () => {},
  showUpdateDialog: () => {},
});

const CHECK_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours between automatic background checks

export function AppUpdateProvider({ children }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

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
      if (result.success && result.isUpdateAvailable) {
        setUpdateInfo(result);
        setDialogVisible(true);
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

      {/* Direct-APK Update AppDialog */}
      {Boolean(updateInfo?.isUpdateAvailable) && (
        <AppDialog
          visible={dialogVisible}
          onClose={handleDismiss}
          dismissOnBackdrop={!updateInfo?.isForced}
          type={updateInfo?.isForced ? 'warning' : 'default'}
          icon={updateInfo?.isForced ? TriangleAlert : Sparkles}
          title={updateInfo?.isForced ? 'Update Required' : 'New Version Available'}
          confirmText={isDownloading ? 'Opening...' : 'Update Now'}
          cancelText={updateInfo?.isForced ? null : 'Later'}
          onConfirm={handleUpdateNow}
          onCancel={handleDismiss}
          loading={isDownloading}
        >
          <View style={styles.dialogBody}>
            <Text style={styles.versionHeading}>
              {updateInfo?.isForced
                ? `Your installed version (v${updateInfo?.installedVersion}) is no longer supported.`
                : `StudyArena v${updateInfo?.latestVersion} is now available.`}
            </Text>

            {updateInfo?.releaseNotes?.length > 0 && (
              <View style={styles.notesContainer}>
                <Text style={styles.notesTitle}>What's new:</Text>
                {updateInfo.releaseNotes.map((note, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>•</Text>
                    <Text style={styles.bulletText}>{note}</Text>
                  </View>
                ))}
              </View>
            )}

            {Boolean(downloadError) && (
              <Text style={styles.errorText}>{downloadError}</Text>
            )}
          </View>
        </AppDialog>
      )}
    </AppUpdateContext.Provider>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    dialogBody: {
      marginTop: spacing.xs,
    },
    versionHeading: {
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
      marginBottom: spacing.md,
    },
    notesContainer: {
      backgroundColor: colors.muted + '40',
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    notesTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: spacing.xs,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginTop: 3,
    },
    bulletDot: {
      color: colors.primary,
      fontSize: 14,
      lineHeight: 18,
      marginRight: 6,
    },
    bulletText: {
      flex: 1,
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 18,
    },
    errorText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.destructive,
      marginTop: spacing.xs,
    },
  });
