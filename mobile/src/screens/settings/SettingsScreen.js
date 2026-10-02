import React, { useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  Switch,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import {
  Camera,
  Moon,
  Sun,
  Trophy,
  ToggleLeft,
  ToggleRight,
  Bell,
  Smartphone,
  Laptop,
  Tablet,
  Globe,
  LogOut,
  RefreshCw,
  Lock,
  ChevronRight,
  Clock,
  KeyRound,
  Circle,
  CircleDot,
  Fingerprint,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import { AuthContext } from '../../context/AuthContext';
import { getUserFriendlyError } from '../../utils/errorUtils';
import { AppUpdateContext } from '../../context/AppUpdateContext';
import { useAppLock } from '../../context/AppLockContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { CollegePicker } from '../../components/ui/CollegePicker';
import { useAppDialog } from '../../components/ui/AppDialog';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';
import apiClient from '../../api/client';
import { pickAndUploadImage } from '../../utils/fileUploader';
import { getPortalStatus } from '../../api/portal';
import {
  getActiveSessions,
  revokeSession as apiRevokeSession,
  revokeOtherSessions as apiRevokeOtherSessions,
  revokeAllSessions as apiRevokeAllSessions,
} from '../../api/auth';

const SettingsScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii, theme, isDark, toggleTheme } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showSuccess, showError, showDialog } = useAppDialog();
  const { appVersion, isChecking: isCheckingUpdate, checkUpdate } = useContext(AppUpdateContext);
  const {
    isLockEnabled,
    lockTimeout,
    enableLock,
    disableLock,
    updateTimeout,
    verifyPin,
    biometricEnabled,
    biometricAvailable,
    biometricStatus,
    updateBiometricEnabled,
  } = useAppLock();

  const { user, logout, setUser } = useContext(AuthContext);
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    name: user?.officialName || user?.name || '',
    collegeId: user?.collegeId || null,
    university: user?.university || '',
    registrationNumber: user?.registrationNumber || '',
    degree: user?.degree || '',
    branch: user?.branch || '',
    section: user?.section || '',
    semester: String(user?.semester || '1'),
  });

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        displayName: user.displayName || '',
        name: user.officialName || user.name || '',
        collegeId: user.collegeId || null,
        university: user.university || '',
        registrationNumber: user.registrationNumber || '',
        degree: user.degree || '',
        branch: user.branch || '',
        section: user.section || '',
        semester: String(user.semester || '1'),
      }));
    }
  }, [user]);

  const [isSynced, setIsSynced] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState('Recently');

  useEffect(() => {
    getPortalStatus()
      .then((res) => {
        if (res && (res.isConnected || res.hasStoredPortalData || res.srmUsername || res.data?.isConnected || res.data?.hasStoredPortalData)) {
          setIsSynced(true);
          const syncDate = res.lastSuccessfulSync || res.data?.lastSuccessfulSync;
          if (syncDate) {
            setLastSyncDate(new Date(syncDate).toLocaleString());
          }
        }
      })
      .catch(() => {});
  }, []);

  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Active Sessions State
  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sessionActionLoading, setSessionActionLoading] = useState(false);
  const [sessionActionTarget, setSessionActionTarget] = useState(null);

  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinLoop = useRef(null);

  const startSpinAnimation = () => {
    spinAnim.setValue(0);
    spinLoop.current = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    spinLoop.current.start();
  };

  const stopSpinAnimation = () => {
    if (spinLoop.current) {
      spinLoop.current.stop();
      spinLoop.current = null;
    }
    spinAnim.setValue(0);
  };

  const loadSessions = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh && isRefreshing) return;
    
    if (isManualRefresh) {
      setIsRefreshing(true);
      startSpinAnimation();
    } else {
      setLoadingSessions(true);
    }

    try {
      const data = await getActiveSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('[SettingsScreen] Failed to fetch active sessions:', err);
      if (isManualRefresh) {
        showError('Refresh Failed', 'Could not fetch active sessions. Please try again.');
      }
    } finally {
      if (isManualRefresh) {
        stopSpinAnimation();
        setIsRefreshing(false);
      } else {
        setLoadingSessions(false);
      }
    }
  }, [isRefreshing]);

  useEffect(() => {
    loadSessions(false);
  }, []);

  const handleRevokeSingle = (session) => {
    const devName = session.deviceName || `${session.browser} on ${session.os}`;
    showDialog({
      type: 'destructive',
      title: 'Log Out Device',
      message: `Are you sure you want to log out "${devName}"? This device will be signed out immediately and required to log in again.`,
      confirmText: 'Log out device',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSessionActionLoading(true);
        setSessionActionTarget(session.id || session.sessionId);
        try {
          await apiRevokeSession(session.id || session.sessionId);
          showSuccess('Device Logged Out', `"${devName}" has been signed out.`);
          await loadSessions(false);
        } catch (err) {
          showError('Revocation Failed', err.response?.data?.message || 'Could not log out device.');
        } finally {
          setSessionActionLoading(false);
          setSessionActionTarget(null);
        }
      },
    });
  };

  const handleRevokeOthers = () => {
    showDialog({
      type: 'destructive',
      title: 'Log Out Other Devices',
      message: 'Are you sure you want to log out all other active sessions? Only this current device will stay logged in.',
      confirmText: 'Log out other devices',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSessionActionLoading(true);
        setSessionActionTarget('others');
        try {
          const res = await apiRevokeOtherSessions();
          showSuccess('Other Devices Logged Out', `Logged out of ${res.data?.revokedCount || 'all other'} device(s).`);
          await loadSessions(false);
        } catch (err) {
          showError('Failed', err.response?.data?.message || 'Could not log out other devices.');
        } finally {
          setSessionActionLoading(false);
          setSessionActionTarget(null);
        }
      },
    });
  };

  const handleRevokeAll = () => {
    showDialog({
      type: 'destructive',
      title: 'Log Out All Devices',
      message: 'Are you sure you want to log out of ALL devices, including this device? You will be returned to the login screen.',
      confirmText: 'Log out all devices',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setSessionActionLoading(true);
        try {
          await apiRevokeAllSessions();
          await logout();
        } catch (err) {
          showError('Failed', 'Could not complete log out all devices.');
        } finally {
          setSessionActionLoading(false);
        }
      },
    });
  };

  const formatActivityTime = (dateStr) => {
    if (!dateStr) return 'Active now';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 120) return 'Active now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)} min ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} hr ago`;
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDeviceIcon = (platform, deviceType) => {
    const p = String(platform || '').toLowerCase();
    const d = String(deviceType || '').toLowerCase();
    if (p === 'ios' || p === 'android' || d === 'mobile') {
      return <Smartphone size={20} color={colors.accent} />;
    }
    if (d === 'tablet') {
      return <Tablet size={20} color={colors.accent} />;
    }
    if (d === 'desktop' || p === 'web') {
      return <Laptop size={20} color={colors.accent} />;
    }
    return <Smartphone size={20} color={colors.accent} />;
  };

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [showTimeoutSelect, setShowTimeoutSelect] = useState(false);
  const [lockAction, setLockAction] = useState('disable');
  const [pinBuffer, setPinBuffer] = useState('');
  const [pinError, setPinError] = useState('');

  const handleAuthAction = async (action) => {
    setLockAction(action);
    if (biometricAvailable && biometricEnabled) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Verify Identity',
          cancelLabel: 'Use PIN',
          disableDeviceFallback: true,
        });

        if (result.success) {
          if (action === 'disable') {
            await disableLock();
          } else if (action === 'change') {
            setShowPinSetup(true);
          }
          return;
        }
      } catch (e) {}
    }

    setShowPinConfirm(true);
  };

  const setFormValue = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const data = {
        ...form,
        collegeId: form.collegeId || null,
        university: (form.university || '').trim(),
        semester: Number(form.semester) || 1,
      };
      const res = await apiClient.patch('/auth/profile', data);
      setUser(res.data.data || res.data.user || res.data);
      showSuccess('Profile Saved', 'Your profile details have been updated.');
    } catch (error) {
      showError('Update Failed', getUserFriendlyError(error, 'profile_update'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleImagePick = async () => {
    try {
      setIsSaving(true);
      const uploaded = await pickAndUploadImage({
        aspect: [1, 1],
      });

      if (uploaded && uploaded.url) {
        const updateRes = await apiClient.patch('/auth/profile', { profileImageUrl: uploaded.url });
        setUser(updateRes.data.data || updateRes.data.user || updateRes.data);
        showSuccess('Profile Picture Updated', 'Your new profile picture has been saved.');
      }
    } catch (error) {
      showError('Photo Upload Failed', error.message || 'Failed to update profile picture.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = () => {
    showDialog({
      type: 'destructive',
      title: 'Log out',
      message: 'Are you sure you want to log out of StudyArena on this device?',
      confirmText: 'Log out',
      cancelText: 'Cancel',
      onConfirm: logout,
    });
  };

  const spinInterpolate = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageHeading
          eyebrow="Your study desk"
          title="Settings"
          detail="Make the space fit how you work best."
        />

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.profileHeader}>
            <View style={styles.imageContainer}>
              {user?.profileImageUrl ? (
                <View style={styles.imageWrapper}>
                  <Image source={{ uri: user.profileImageUrl }} style={styles.image} />
                </View>
              ) : (
                <View style={[styles.imageWrapper, styles.imagePlaceholder]}>
                  <Text style={styles.imageText}>
                    {user?.name?.split(' ').map((p) => p[0]).join('').slice(0, 2) || 'U'}
                  </Text>
                </View>
              )}
              <TouchableOpacity style={styles.cameraIcon} activeOpacity={0.8} onPress={handleImagePick}>
                <Camera size={16} color={colors.primaryForeground} />
              </TouchableOpacity>
            </View>
            <View style={styles.profileHeaderText}>
              <Text style={styles.sectionTitle}>Profile</Text>
              <Text style={styles.sectionDetail}>A little context for a more personal workspace.</Text>
            </View>
          </View>

          <View style={styles.form}>
            {isSynced && (
              <View style={styles.syncBanner}>
                <View style={styles.syncBannerRow}>
                  <CheckCircle2 size={16} color={colors.accent} />
                  <Text style={styles.syncBannerTitle}>Profile synced with SRM AP Portal</Text>
                </View>
                <Text style={styles.syncBannerDetail}>Last synced: {lastSyncDate}</Text>
              </View>
            )}

            <Field label="Display Name" hint="Appears across StudyArena. Leave empty for official name.">
              <Input
                value={form.displayName}
                onChangeText={(t) => setFormValue('displayName', t)}
                placeholder="Enter your display name"
                maxLength={60}
                editable={!isSaving}
              />
            </Field>

            <Field label="Official SRM Name">
              <Input
                value={form.name}
                onChangeText={(t) => setFormValue('name', t)}
                placeholder="Official student name"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <Field label="Registration Number">
              <Input
                value={form.registrationNumber}
                onChangeText={(t) => setFormValue('registrationNumber', t)}
                placeholder="E.g. AP24110010000"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <Field label="College / University" hint={isSynced ? '' : 'Search or enter your institution'}>
              <CollegePicker
                collegeId={form.collegeId}
                collegeName={form.university}
                placeholder="Search your college or university"
                onSelect={({ collegeId: selectedId, collegeName: selectedName }) => {
                  setForm((f) => ({ ...f, collegeId: selectedId, university: selectedName }));
                }}
                disabled={isSaving || isSynced}
              />
            </Field>

            <Field label="Degree / Program">
              <Input
                value={form.degree}
                onChangeText={(t) => setFormValue('degree', t)}
                placeholder="Enter your degree / program"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <Field label="Department / Branch">
              <Input
                value={form.branch}
                onChangeText={(t) => setFormValue('branch', t)}
                placeholder="Enter your branch / department"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label="Section">
                  <Input
                    value={form.section}
                    onChangeText={(t) => setFormValue('section', t)}
                    placeholder="E.g. Sec D"
                    editable={!isSaving && !isSynced}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Current Semester">
                  <Input
                    value={form.semester}
                    onChangeText={(t) => setFormValue('semester', t)}
                    placeholder="Enter your semester"
                    keyboardType="numeric"
                    editable={!isSaving && !isSynced}
                  />
                </Field>
              </View>
            </View>

            <View style={styles.saveAction}>
              <Button onPress={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save profile'}
              </Button>
            </View>
          </View>
        </View>

        {/* Interface Section */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Interface</Text>
          <Text style={styles.sectionTitle}>Appearance & Alerts</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleRowLeft}>
              <View style={styles.iconBox}>
                {isDark ? <Moon size={20} color={colors.foreground} /> : <Sun size={20} color={colors.foreground} />}
              </View>
              <View>
                <Text style={styles.toggleTitle}>{isDark ? 'Night desk' : 'Day desk'}</Text>
                <Text style={styles.toggleDetail}>{isDark ? 'A quieter, darker canvas' : 'Warm light for clear thinking'}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => toggleTheme()} activeOpacity={0.7}>
              {isDark ? <ToggleRight size={36} color={colors.accent} /> : <ToggleLeft size={36} color={colors.mutedForeground} />}
            </TouchableOpacity>
          </View>

          <View style={[styles.toggleRow, { marginTop: spacing.md }]}>
            <View style={styles.toggleRowLeft}>
              <View style={styles.iconBox}>
                <Bell size={20} color={colors.foreground} />
              </View>
              <View>
                <Text style={styles.toggleTitle}>Push Notifications</Text>
                <Text style={styles.toggleDetail}>Get reminded when tasks are due</Text>
              </View>
            </View>
            <Switch value={notifications} onValueChange={setNotifications} color={colors.accent} />
          </View>
        </View>

        {/* Privacy / App Lock Section */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Privacy</Text>
          <Text style={styles.sectionTitle}>App Lock</Text>

          <View style={styles.toggleRow}>
            <View style={styles.toggleRowLeft}>
              <View style={styles.iconBox}>
                <Lock size={20} color={colors.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Require Unlock</Text>
                <Text style={styles.toggleDetail}>Protect StudyArena when you leave</Text>
              </View>
            </View>
            <Switch
              value={isLockEnabled}
              onValueChange={(val) => {
                if (val) setShowPinSetup(true);
                else handleAuthAction('disable');
              }}
              color={colors.accent}
            />
          </View>

          {isLockEnabled && (
            <>
              <View style={[styles.toggleRow, !biometricAvailable && { opacity: 0.6 }]}>
                <View style={styles.toggleRowLeft}>
                  <View style={styles.iconBox}>
                    <Fingerprint size={20} color={colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Biometric Unlock</Text>
                    <Text style={styles.toggleDetail}>
                      {!biometricStatus?.hasHardware
                        ? 'Biometric hardware unavailable'
                        : !biometricStatus?.isEnrolled
                        ? 'No biometric is enrolled on this device'
                        : 'Use fingerprint or biometric authentication'}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={biometricEnabled && biometricAvailable}
                  disabled={!biometricAvailable}
                  onValueChange={async (val) => {
                    if (val) {
                      try {
                        const result = await LocalAuthentication.authenticateAsync({
                          promptMessage: 'Confirm Biometrics for StudyArena',
                          cancelLabel: 'Cancel',
                          disableDeviceFallback: true,
                        });
                        if (result.success) {
                          await updateBiometricEnabled(true);
                        }
                      } catch (e) {}
                    } else {
                      await updateBiometricEnabled(false);
                    }
                  }}
                  color={colors.accent}
                />
              </View>

              <TouchableOpacity
                style={styles.toggleRow}
                activeOpacity={0.7}
                onPress={() => setShowTimeoutSelect(true)}
              >
                <View style={styles.toggleRowLeft}>
                  <View style={styles.iconBox}>
                    <Clock size={20} color={colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Auto-lock Timeout</Text>
                    <Text style={styles.toggleDetail}>
                      {lockTimeout === 0
                        ? 'Immediately'
                        : lockTimeout === 60000
                        ? '1 minute'
                        : lockTimeout === 300000
                        ? '5 minutes'
                        : '15 minutes'}
                    </Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.toggleRow}
                activeOpacity={0.7}
                onPress={() => handleAuthAction('change')}
              >
                <View style={styles.toggleRowLeft}>
                  <View style={styles.iconBox}>
                    <KeyRound size={20} color={colors.foreground} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.toggleTitle}>Change PIN</Text>
                    <Text style={styles.toggleDetail}>Update your app lock PIN</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Active Sessions & Security Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionEyebrow}>Security</Text>
              <Text style={styles.sectionTitle}>Active Sessions</Text>
              <Text style={styles.sectionDetail}>
                Manage logged-in devices across web and mobile.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => loadSessions(true)}
              disabled={isRefreshing || loadingSessions}
              activeOpacity={0.7}
            >
              <Animated.View style={{ transform: [{ rotate: spinInterpolate }] }}>
                <RefreshCw size={16} color={colors.accent} />
              </Animated.View>
            </TouchableOpacity>
          </View>

          {loadingSessions && sessions.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={colors.accent} size="small" />
              <Text style={styles.loadingText}>Loading active sessions...</Text>
            </View>
          ) : (
            <View style={{ marginTop: spacing.md }}>
              {/* Current Device */}
              {sessions
                .filter((s) => s.isCurrent)
                .map((s) => (
                  <View key={s.id || s.sessionId} style={styles.currentDeviceCard}>
                    <View style={styles.deviceRow}>
                      <View style={styles.deviceIconBox}>
                        {getDeviceIcon(s.platform, s.deviceType)}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeRow}>
                          <Text style={styles.deviceNameText}>
                            {s.deviceName || (s.browser && s.os ? `${s.browser} on ${s.os}` : 'This Device')}
                          </Text>
                          <View style={styles.currentBadge}>
                            <View style={styles.greenDot} />
                            <Text style={styles.currentBadgeText}>THIS DEVICE</Text>
                          </View>
                        </View>
                        <Text style={styles.deviceMetaText}>
                          {s.browser || 'StudyArena Mobile'} • {s.os || 'Mobile OS'}
                          {s.ipAddress ? ` • IP: ${s.ipAddress}` : ''}
                        </Text>
                        <Text style={styles.deviceActiveText}>
                          Active now {s.createdAt ? `• Logged in ${new Date(s.createdAt).toLocaleDateString()}` : ''}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}

              {/* Other Devices */}
              <View style={{ marginTop: spacing.lg }}>
                <Text style={styles.subSectionTitle}>Other Active Devices</Text>

                {sessions.filter((s) => !s.isCurrent).length === 0 ? (
                  <View style={styles.noOtherSessionsBox}>
                    <ShieldCheck size={24} color={colors.accent} style={{ marginBottom: 6 }} />
                    <Text style={styles.noOtherSessionsText}>
                      No other active sessions. You are only signed in on this device.
                    </Text>
                  </View>
                ) : (
                  <>
                    {sessions
                      .filter((s) => !s.isCurrent)
                      .map((s) => (
                        <View key={s.id || s.sessionId} style={styles.otherDeviceCard}>
                          <View style={styles.deviceRow}>
                            <View style={styles.otherIconBox}>
                              {getDeviceIcon(s.platform, s.deviceType)}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.deviceNameText}>
                                {s.deviceName || (s.browser && s.os ? `${s.browser} on ${s.os}` : 'Remote Device')}
                              </Text>
                              <Text style={styles.deviceMetaText}>
                                {s.browser || 'StudyArena'} • {s.os || 'Remote OS'}
                                {s.ipAddress ? ` • IP: ${s.ipAddress}` : ''}
                              </Text>
                              <Text style={styles.deviceActiveText}>
                                Last active: {formatActivityTime(s.lastActiveAt)}
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={styles.revokeDeviceBtn}
                            activeOpacity={0.7}
                            disabled={sessionActionLoading && sessionActionTarget === (s.id || s.sessionId)}
                            onPress={() => handleRevokeSingle(s)}
                          >
                            <LogOut size={14} color={colors.destructive} />
                            <Text style={styles.revokeDeviceBtnText}>
                              {sessionActionLoading && sessionActionTarget === (s.id || s.sessionId)
                                ? 'Logging out...'
                                : 'Log out'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                    <View style={styles.batchActionsRow}>
                      <Button
                        variant="outline"
                        onPress={handleRevokeOthers}
                        disabled={sessionActionLoading}
                        style={{ flex: 1, marginRight: spacing.sm }}
                      >
                        Log out others
                      </Button>
                      <Button
                        variant="danger"
                        onPress={handleRevokeAll}
                        disabled={sessionActionLoading}
                        style={{ flex: 1 }}
                      >
                        Log out all
                      </Button>
                    </View>
                  </>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Updates Section */}
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Updates</Text>
          <Text style={styles.sectionTitle}>App Version & Updates</Text>
          <Text style={styles.sectionDetail}>
            Installed build: {appVersion?.displayString || 'v1.0.0 (Build 1)'}
          </Text>
          <View style={{ marginTop: spacing.md }}>
            <Button
              variant="outline"
              loading={isCheckingUpdate}
              disabled={isCheckingUpdate}
              onPress={async () => {
                const res = await checkUpdate(true);
                if (res?.success) {
                  if (!res.isUpdateAvailable) {
                    showSuccess('Up to Date', `You are using the latest version of StudyArena (${res.installedVersion}).`);
                  }
                } else if (res?.error) {
                  showError('Update Check Failed', 'Could not reach the update service. Please check your connection and try again.');
                }
              }}
            >
              {isCheckingUpdate ? 'Checking for updates...' : 'Check for Updates'}
            </Button>
          </View>
        </View>

        {/* Danger Logout Section */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Account</Text>
          <Text style={styles.sectionDetail}>Log out of your current session on this device.</Text>
          <Button variant="danger" onPress={handleLogout} style={styles.logoutBtn}>
            Log out
          </Button>
        </View>

        <View style={styles.banner}>
          <Trophy size={24} color={colors.accent} />
          <Text style={styles.bannerTitle}>A workspace with a pulse</Text>
          <Text style={styles.bannerDetail}>
            StudyArena is built for the quiet stretch between deciding to study
            and actually beginning. Keep it honest, keep it useful.
          </Text>
          <View style={styles.bannerFooter}>
            <Text style={styles.bannerVersion}>StudyArena · {appVersion?.displayString || 'v1.0.0'}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Pin Setup Modal */}
      <Modal visible={showPinSetup} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set App Lock PIN</Text>
            <Text style={styles.modalDesc}>Enter a 4-digit PIN to secure your app.</Text>

            <Input
              value={pinBuffer}
              onChangeText={(t) => setPinBuffer(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="0000"
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 16 }}
            />
            {!!pinError && <Text style={styles.errorText}>{pinError}</Text>}

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  setShowPinSetup(false);
                  setPinBuffer('');
                  setPinError('');
                }}
              >
                Cancel
              </Button>
              <View style={{ width: 16 }} />
              <Button
                style={{ flex: 1 }}
                onPress={async () => {
                  if (pinBuffer.length !== 4) {
                    setPinError('PIN must be 4 digits');
                    return;
                  }
                  await enableLock(pinBuffer, 0);
                  setShowPinSetup(false);
                  setPinBuffer('');
                  setPinError('');
                }}
              >
                Save PIN
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Pin Confirm Modal */}
      <Modal visible={showPinConfirm} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm current PIN</Text>
            <Text style={styles.modalDesc}>Enter your current 4-digit PIN.</Text>

            <Input
              value={pinBuffer}
              onChangeText={(t) => setPinBuffer(t.replace(/[^0-9]/g, '').slice(0, 4))}
              keyboardType="number-pad"
              secureTextEntry
              placeholder="0000"
              style={{ textAlign: 'center', fontSize: 24, letterSpacing: 16 }}
            />
            {!!pinError && <Text style={styles.errorText}>{pinError}</Text>}

            <View style={styles.modalActions}>
              <Button
                variant="outline"
                style={{ flex: 1 }}
                onPress={() => {
                  setShowPinConfirm(false);
                  setPinBuffer('');
                  setPinError('');
                }}
              >
                Cancel
              </Button>
              <View style={{ width: 16 }} />
              <Button
                style={{ flex: 1 }}
                onPress={async () => {
                  const isValid = await verifyPin(pinBuffer);
                  if (!isValid) {
                    setPinError('Incorrect PIN');
                    return;
                  }

                  setShowPinConfirm(false);
                  setPinBuffer('');
                  setPinError('');

                  if (lockAction === 'disable') {
                    await disableLock();
                  } else if (lockAction === 'change') {
                    setShowPinSetup(true);
                  }
                }}
              >
                Confirm
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      {/* Timeout Select Modal */}
      <Modal visible={showTimeoutSelect} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentWide}>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Auto-lock Timeout</Text>
            <Text style={[styles.modalDesc, { textAlign: 'center', marginBottom: 24 }]}>
              Select when StudyArena should lock.
            </Text>

            <View style={{ width: '100%' }}>
              {[
                { label: 'Immediately', value: 0 },
                { label: '1 minute', value: 60000 },
                { label: '5 minutes', value: 300000 },
                { label: '15 minutes', value: 900000 },
              ].map((opt) => {
                const isSelected = lockTimeout === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.timeoutOptionBtn,
                      isSelected && {
                        backgroundColor: colors.primary + '1A',
                        borderColor: colors.primary,
                      },
                    ]}
                    onPress={() => {
                      updateTimeout(opt.value);
                      setShowTimeoutSelect(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.timeoutOptionText,
                        isSelected && { color: colors.primary, fontFamily: typography.sans.bold },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected ? (
                      <CircleDot size={20} color={colors.primary} />
                    ) : (
                      <Circle size={20} color={colors.mutedForeground} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <Button
              variant="outline"
              style={{ marginTop: 16, width: '100%' }}
              onPress={() => setShowTimeoutSelect(false)}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
    section: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.xl,
      marginBottom: spacing.xl,
    },
    sectionEyebrow: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: colors.accent,
      marginBottom: 4,
    },
    sectionTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 24,
      color: colors.foreground,
    },
    sectionDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    refreshBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    loadingText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    currentDeviceCard: {
      backgroundColor: colors.accent + '0D',
      borderColor: colors.accent + '4D',
      borderWidth: 1.5,
      borderRadius: radii.xl,
      padding: spacing.lg,
      marginTop: spacing.md,
    },
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    deviceIconBox: {
      width: 42,
      height: 42,
      borderRadius: radii.lg,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.accent + '40',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: spacing.xs,
    },
    deviceNameText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    currentBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent + '26',
      borderRadius: radii.full,
      paddingHorizontal: 8,
      paddingVertical: 2,
      gap: 5,
    },
    greenDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    currentBadgeText: {
      fontFamily: typography.mono.regular,
      fontSize: 9,
      color: colors.accent,
      letterSpacing: 0.5,
    },
    deviceMetaText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    deviceActiveText: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.accent,
      marginTop: 2,
    },
    subSectionTitle: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: colors.mutedForeground,
      marginBottom: spacing.sm,
    },
    noOtherSessionsBox: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      backgroundColor: colors.background + '80',
      padding: spacing.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: spacing.xs,
    },
    noOtherSessionsText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    otherDeviceCard: {
      backgroundColor: colors.background,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.xl,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    otherIconBox: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    revokeDeviceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 4,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.destructive + '33',
      backgroundColor: colors.destructive + '0D',
      marginTop: spacing.xs,
    },
    revokeDeviceBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.destructive,
    },
    batchActionsRow: {
      flexDirection: 'row',
      marginTop: spacing.md,
    },
    profileHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: spacing.xl,
    },
    imageContainer: {
      position: 'relative',
      marginRight: spacing.lg,
    },
    imageWrapper: {
      width: 64,
      height: 64,
      borderRadius: 32,
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.cardBorder,
    },
    image: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 0,
    },
    imageText: {
      fontFamily: typography.sans.bold,
      fontSize: 20,
      color: colors.primaryForeground,
    },
    cameraIcon: {
      position: 'absolute',
      bottom: -4,
      right: -4,
      backgroundColor: colors.foreground,
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.card,
    },
    profileHeaderText: {
      flex: 1,
      justifyContent: 'center',
    },
    form: {
      gap: spacing.md,
    },
    syncBanner: {
      backgroundColor: colors.accent + '1A',
      borderColor: colors.accent + '33',
      borderWidth: 1,
      borderRadius: radii.xl,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    syncBannerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: 4,
    },
    syncBannerTitle: {
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.foreground,
    },
    syncBannerDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginLeft: 24,
    },
    saveAction: {
      alignItems: 'flex-end',
      marginTop: spacing.sm,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.xl,
      padding: spacing.md,
      marginTop: spacing.lg,
    },
    toggleRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      flex: 1,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    toggleTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    toggleDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    dangerSection: {
      backgroundColor: colors.destructive + '0D',
      borderColor: colors.destructive + '33',
    },
    logoutBtn: {
      marginTop: spacing.xl,
      alignSelf: 'flex-start',
    },
    banner: {
      backgroundColor: colors.accent + '1A',
      borderColor: colors.accent + '33',
      borderWidth: 1,
      borderRadius: radii.xl,
      padding: spacing.xl,
    },
    bannerTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 24,
      color: colors.foreground,
      marginTop: spacing.md,
    },
    bannerDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 24,
      marginTop: spacing.sm,
    },
    bannerFooter: {
      borderTopWidth: 1,
      borderTopColor: colors.accent + '33',
      paddingTop: spacing.md,
      marginTop: spacing.lg,
    },
    bannerVersion: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: colors.mutedForeground,
    },
    timeoutOptionBtn: {
      width: '100%',
      minHeight: 56,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.background,
      marginBottom: 12,
    },
    timeoutOptionText: {
      fontFamily: typography.sans.medium,
      fontSize: 16,
      color: colors.foreground,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    modalContent: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: 24,
      width: '100%',
      maxWidth: 340,
      alignItems: 'center',
    },
    modalContentWide: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: 28,
      width: '100%',
      maxWidth: 400,
      alignItems: 'center',
    },
    modalTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 20,
      color: colors.foreground,
      marginBottom: 8,
    },
    modalDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
      marginBottom: 24,
      textAlign: 'center',
    },
    modalActions: {
      flexDirection: 'row',
      marginTop: 32,
      width: '100%',
    },
    errorText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.destructive,
      marginTop: 8,
    },
  });

export default SettingsScreen;
