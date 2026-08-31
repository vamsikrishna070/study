import React, { useContext, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Switch, Alert, Image, Modal } from 'react-native';
import { Camera, Moon, Sun, Trophy, ToggleLeft, ToggleRight, Bell, Smartphone, RefreshCw, Lock, ChevronRight, Clock, KeyRound, Circle, CircleDot, Fingerprint, CheckCircle2 } from 'lucide-react-native';
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

  React.useEffect(() => {
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

  React.useEffect(() => {
    getPortalStatus()
      .then((res) => {
        if (res && res.isConnected) {
          setIsSynced(true);
          if (res.lastSuccessfulSync) {
            setLastSyncDate(new Date(res.lastSuccessfulSync).toLocaleString());
          }
        }
      })
      .catch(() => {});
  }, []);

  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [showPinSetup, setShowPinSetup] = useState(false);
  const [showPinConfirm, setShowPinConfirm] = useState(false);
  const [showTimeoutSelect, setShowTimeoutSelect] = useState(false);
  const [lockAction, setLockAction] = useState('disable'); // 'disable' | 'change'
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
      } catch (e) {
        // Fallback to PIN
      }
    }

    // Fallback to PIN if biometric cancelled/failed or not enabled
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
        semester: Number(form.semester) || 1
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
      message: 'Are you sure you want to log out of StudyArena?',
      confirmText: 'Log out',
      cancelText: 'Cancel',
      onConfirm: logout,
    });
  };

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
                    {user?.name?.split(' ').map(p => p[0]).join('').slice(0, 2) || 'U'}
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
                onChangeText={t => setFormValue('displayName', t)}
                placeholder="E.g. Vamsi"
                maxLength={60}
                editable={!isSaving}
              />
            </Field>

            <Field label="Official SRM Name">
              <Input
                value={form.name}
                onChangeText={t => setFormValue('name', t)}
                placeholder="Official student name"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <Field label="Registration Number">
              <Input
                value={form.registrationNumber}
                onChangeText={t => setFormValue('registrationNumber', t)}
                placeholder="E.g. AP24110010000"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <Field label="College / University" hint={isSynced ? '' : "Search or enter your institution"}>
              <CollegePicker
                collegeId={form.collegeId}
                collegeName={form.university}
                placeholder="Search your college or university"
                onSelect={({ collegeId: selectedId, collegeName: selectedName }) => {
                  setForm(f => ({ ...f, collegeId: selectedId, university: selectedName }));
                }}
                disabled={isSaving || isSynced}
              />
            </Field>

            <Field label="Degree / Program">
              <Input
                value={form.degree}
                onChangeText={t => setFormValue('degree', t)}
                placeholder="Enter your degree / program"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <Field label="Department / Branch">
              <Input
                value={form.branch}
                onChangeText={t => setFormValue('branch', t)}
                placeholder="Enter your branch / department"
                editable={!isSaving && !isSynced}
              />
            </Field>

            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Field label="Section">
                  <Input
                    value={form.section}
                    onChangeText={t => setFormValue('section', t)}
                    placeholder="E.g. Sec D"
                    editable={!isSaving && !isSynced}
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Current Semester">
                  <Input
                    value={form.semester}
                    onChangeText={t => setFormValue('semester', t)}
                    placeholder="Enter your semester"
                    keyboardType="numeric"
                    editable={!isSaving && !isSynced}
                  />
                </Field>
              </View>
            </View>

            <View style={styles.saveAction}>
              <Button onPress={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save profile"}
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
                <Text style={styles.toggleTitle}>{isDark ? "Night desk" : "Day desk"}</Text>
                <Text style={styles.toggleDetail}>{isDark ? "A quieter, darker canvas" : "Warm light for clear thinking"}</Text>
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

        {/* Privacy & Security Section */}
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
                      } catch (e) {
                        // User cancelled or failed
                      }
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
                      {lockTimeout === 0 ? 'Immediately' :
                       lockTimeout === 60000 ? '1 minute' :
                       lockTimeout === 300000 ? '5 minutes' : '15 minutes'}
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

        {/* App Version & Updates Section */}
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

        {/* Account Section */}
        <View style={[styles.section, styles.dangerSection]}>
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>Account</Text>
          <Text style={styles.sectionDetail}>Log out of your current session.</Text>
          <Button variant="danger" onPress={handleLogout} style={styles.logoutBtn}>
            Log out
          </Button>
        </View>

        {/* Bottom Banner */}
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

      {/* PIN Setup Modal */}
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
              <Button variant="outline" style={{ flex: 1 }} onPress={() => { setShowPinSetup(false); setPinBuffer(''); setPinError(''); }}>Cancel</Button>
              <View style={{ width: 16 }} />
              <Button
                style={{ flex: 1 }}
                onPress={async () => {
                  if (pinBuffer.length !== 4) {
                    setPinError('PIN must be 4 digits');
                    return;
                  }
                  await enableLock(pinBuffer, 0); // Default to immediately
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

      {/* PIN Confirm Modal (for changing or disabling) */}
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
              <Button variant="outline" style={{ flex: 1 }} onPress={() => { setShowPinConfirm(false); setPinBuffer(''); setPinError(''); }}>Cancel</Button>
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

      {/* Auto-lock Timeout Selection Modal */}
      <Modal visible={showTimeoutSelect} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentWide}>
            <Text style={[styles.modalTitle, { textAlign: 'center' }]}>Auto-lock Timeout</Text>
            <Text style={[styles.modalDesc, { textAlign: 'center', marginBottom: 24 }]}>Select when StudyArena should lock.</Text>

            <View style={{ width: '100%' }}>
              {[
                { label: 'Immediately', value: 0 },
                { label: '1 minute', value: 60000 },
                { label: '5 minutes', value: 300000 },
                { label: '15 minutes', value: 900000 },
              ].map(opt => {
                const isSelected = lockTimeout === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.timeoutOptionBtn,
                      isSelected && { backgroundColor: colors.primary + '1A', borderColor: colors.primary }
                    ]}
                    onPress={() => {
                      updateTimeout(opt.value);
                      setShowTimeoutSelect(false);
                    }}
                  >
                    <Text style={[
                      styles.timeoutOptionText,
                      isSelected && { color: colors.primary, fontFamily: typography.sans.bold }
                    ]}>
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

            <Button variant="outline" style={{ marginTop: 16, width: '100%' }} onPress={() => setShowTimeoutSelect(false)}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
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
    backgroundColor: colors.accent + '1A', // 10%
    borderColor: colors.accent + '33', // 20%
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
    backgroundColor: colors.destructive + '0D', // 5% opacity
    borderColor: colors.destructive + '33', // 20% opacity
  },
  logoutBtn: {
    marginTop: spacing.xl,
    alignSelf: 'flex-start',
  },
  banner: {
    backgroundColor: colors.accent + '1A', // 10% opacity
    borderColor: colors.accent + '33', // 20% opacity
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
  }
});

export default SettingsScreen;
