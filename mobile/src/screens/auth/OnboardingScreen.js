import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { GraduationCap, Lock, Save, ArrowLeft, School, Sparkles } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { CollegePicker } from '../../components/ui/CollegePicker';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';
import { updateProfile } from '../../api/auth';
import { connectPortal } from '../../api/portal';

const OnboardingScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { user, setUser, setIsNewRegistration, refreshUser } = useContext(AuthContext);

  const [collegeId, setCollegeId] = useState(user?.collegeId || null);
  const [university, setUniversity] = useState(user?.university || '');
  const [degree, setDegree] = useState(user?.degree || 'B.Tech');
  const [branch, setBranch] = useState(user?.branch || 'CSE');
  const [section, setSection] = useState(user?.section || '');
  const [semester, setSemester] = useState(String(user?.semester || '1'));

  const isSrm = university.toLowerCase().includes('srm');
  const [mode, setMode] = useState(null);

  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const finishOnboarding = async () => {
    if (setIsNewRegistration) setIsNewRegistration(false);
    if (refreshUser) await refreshUser();
    navigation.reset({ index: 0, routes: [{ name: 'DrawerRoot' }] });
  };

  const handleSyncSubmit = async () => {
    if (loading) return;
    setErrorMsg('');
    if (!srmUsername.trim() || !srmPassword) {
      setErrorMsg('Please enter your Registration Number and Password.');
      return;
    }
    setLoading(true);
    try {
      if (university || collegeId) {
        await updateProfile({
          collegeId: collegeId || undefined,
          university: university.trim() || 'SRM University',
          registrationNumber: srmUsername.trim().toUpperCase(),
        });
      }
      await connectPortal({
        srmUsername: srmUsername.trim().toUpperCase(),
        srmPassword,
      });
      await finishOnboarding();
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to portal.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    if (loading) return;
    setErrorMsg('');
    if (!university.trim()) {
      setErrorMsg('Please select or enter your College/University.');
      return;
    }
    if (!degree.trim() || !branch.trim()) {
      setErrorMsg('Degree and Branch are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        collegeId: collegeId || null,
        university: university.trim(),
        degree: degree.trim(),
        branch: branch.trim(),
        section: section.trim(),
        semester: Number(semester) || 1,
      };

      const updatedUser = await updateProfile(payload);
      if (setUser) setUser(updatedUser.user || updatedUser);
      await finishOnboarding();
    } catch (error) {
      console.error('Onboarding profile update failed:', error);
      await finishOnboarding();
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'sync') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Lock size={28} color={colors.primaryForeground} />
          </View>
          <Text style={styles.title}>Sync from SRM Portal</Text>
          <Text style={styles.subtitle}>
            Automatically fetch your subjects, timetable, attendance records, and personal profile.
          </Text>

          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <View style={styles.formSection}>
            <Field label="Registration Number">
              <Input
                value={srmUsername}
                onChangeText={setSrmUsername}
                placeholder="e.g. AP2411001000"
                autoCapitalize="characters"
                editable={!loading}
              />
            </Field>

            <Field label="Portal Password">
              <Input
                value={srmPassword}
                onChangeText={setSrmPassword}
                placeholder="Enter your portal password"
                secureTextEntry
                editable={!loading}
              />
            </Field>

            <View style={styles.actionsBox}>
              <Button
                onPress={handleSyncSubmit}
                disabled={loading}
                loading={loading}
                loadingText="Connecting..."
                style={{ width: '100%' }}
              >
                <Lock color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Connect & Sync Portal</Text>
              </Button>
              <Button onPress={() => setMode(null)} variant="outline" disabled={loading} style={{ width: '100%' }}>
                <ArrowLeft color={colors.foreground} size={18} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.foreground, fontWeight: 'bold' }}>Back</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (mode === 'manual') {
    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <GraduationCap size={28} color={colors.primaryForeground} />
          </View>
          <Text style={styles.title}>Academic Details</Text>
          <Text style={styles.subtitle}>Enter your course and branch details to personalize StudyArena.</Text>

          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

          <View style={styles.formSection}>
            <Field label="Degree">
              <Input
                value={degree}
                onChangeText={setDegree}
                placeholder="e.g. B.Tech"
                editable={!loading}
              />
            </Field>

            <Field label="Branch / Major">
              <Input
                value={branch}
                onChangeText={setBranch}
                placeholder="e.g. Computer Science and Engineering"
                editable={!loading}
              />
            </Field>

            <Field label="Section (Optional)">
              <Input
                value={section}
                onChangeText={setSection}
                placeholder="e.g. A"
                editable={!loading}
              />
            </Field>

            <Field label="Semester">
              <Input
                value={semester}
                onChangeText={setSemester}
                placeholder="1 to 12"
                keyboardType="numeric"
                editable={!loading}
              />
            </Field>

            <View style={styles.actionsBox}>
              <Button onPress={handleManualSubmit} disabled={loading} style={{ width: '100%' }}>
                <Save color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Complete Setup</Text>
              </Button>
              <Button onPress={() => setMode(null)} variant="outline" disabled={loading} style={{ width: '100%' }}>
                <ArrowLeft color={colors.foreground} size={18} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.foreground, fontWeight: 'bold' }}>Back</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <School size={30} color={colors.primaryForeground} />
        </View>
        <Text style={styles.title}>Welcome to StudyArena</Text>
        <Text style={styles.subtitle}>
          Select your college or university to customize your academic schedule, syllabus, and study dashboard.
        </Text>

        {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}

        <View style={styles.formSection}>
          <Field label="College / University" hint="Search from listed institutions or enter manually">
            <CollegePicker
              collegeId={collegeId}
              collegeName={university}
              placeholder="Search your college or university"
              onSelect={({ collegeId: selectedId, collegeName: selectedName }) => {
                setCollegeId(selectedId);
                setUniversity(selectedName);
                if (errorMsg) setErrorMsg('');
              }}
            />
          </Field>

          {Boolean(university.trim()) && (
            <View style={styles.optionsContainer}>
              {isSrm ? (
                <>
                  <Button onPress={() => setMode('sync')} style={{ width: '100%' }}>
                    <Sparkles color="#fff" size={18} style={{ marginRight: 8 }} />
                    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Sync from SRM Portal (Instant)</Text>
                  </Button>
                  <Button onPress={() => setMode('manual')} variant="outline" style={{ width: '100%' }}>
                    <Text style={{ color: colors.foreground, fontWeight: 'bold', fontSize: 15 }}>Set up manually</Text>
                  </Button>
                </>
              ) : (
                <Button onPress={() => setMode('manual')} style={{ width: '100%' }}>
                  <Save color="#fff" size={18} style={{ marginRight: 8 }} />
                  <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 15 }}>Continue with academic setup</Text>
                </Button>
              )}
            </View>
          )}

          {!university.trim() && (
            <Text style={styles.hintText}>
              Please select or search your institution above to proceed.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xxl,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 3,
  },
  iconContainer: {
    width: 58,
    height: 58,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.serif.medium,
    fontSize: 26,
    color: colors.foreground,
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  formSection: {
    gap: spacing.md,
  },
  optionsContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  actionsBox: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  hintText: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  error: {
    marginBottom: spacing.md,
    color: colors.destructive,
    backgroundColor: `${colors.destructive}18`,
    padding: spacing.sm,
    borderRadius: radii.md,
    textAlign: 'center',
    fontFamily: typography.sans.medium,
    fontSize: 13,
  },
});

export default OnboardingScreen;
