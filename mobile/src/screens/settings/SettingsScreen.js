import React, { useContext, useState } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity, Switch, Alert, Image } from 'react-native';
import { Camera, Moon, Sun, Trophy, ToggleLeft, ToggleRight, Bell, Smartphone, RefreshCw } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { AppUpdateContext } from '../../context/AppUpdateContext';
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

const SettingsScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii, theme, isDark, toggleTheme } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showSuccess, showError, showDialog } = useAppDialog();
  const { appVersion, isChecking: isCheckingUpdate, checkUpdate } = useContext(AppUpdateContext);

  const { user, logout, setUser } = useContext(AuthContext);
  const [form, setForm] = useState({
    name: user?.name || '',
    collegeId: user?.collegeId || null,
    university: user?.university || '',
    degree: user?.degree || '',
    branch: user?.branch || '',
    semester: String(user?.semester || '1'),
  });

  const [notifications, setNotifications] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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
      showError('Update Failed', 'Failed to update profile settings. Please try again.');
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
            <Field label="Full Name">
              <Input 
                value={form.name} 
                onChangeText={t => setFormValue('name', t)} 
                placeholder="Enter your full name"
                editable={!isSaving}
              />
            </Field>

            <Field label="College / University" hint="Search or enter your institution">
              <CollegePicker
                collegeId={form.collegeId}
                collegeName={form.university}
                placeholder="Search your college or university"
                onSelect={({ collegeId: selectedId, collegeName: selectedName }) => {
                  setForm(f => ({ ...f, collegeId: selectedId, university: selectedName }));
                }}
                disabled={isSaving}
              />
            </Field>

            <Field label="Degree / Program">
              <Input 
                value={form.degree} 
                onChangeText={t => setFormValue('degree', t)} 
                placeholder="Enter your degree / program"
                editable={!isSaving}
              />
            </Field>

            <Field label="Department / Branch">
              <Input 
                value={form.branch} 
                onChangeText={t => setFormValue('branch', t)} 
                placeholder="Enter your branch / department"
                editable={!isSaving}
              />
            </Field>

            <Field label="Current Semester">
              <Input 
                value={form.semester} 
                onChangeText={t => setFormValue('semester', t)} 
                placeholder="Enter your semester"
                keyboardType="numeric" 
                editable={!isSaving}
              />
            </Field>

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
  }
});

export default SettingsScreen;
