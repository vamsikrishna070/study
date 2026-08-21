import React, { useState, useContext } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, Alert } from 'react-native';
import { Sparkles, GraduationCap, CheckCircle } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { CollegePicker } from '../../components/ui/CollegePicker';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';
import { updateProfile } from '../../api/auth';

const DEGREE_OPTIONS = [
  { label: 'B.Tech (Bachelor of Technology)', value: 'B.Tech' },
  { label: 'B.E. (Bachelor of Engineering)', value: 'B.E.' },
  { label: 'MBBS (Bachelor of Medicine)', value: 'MBBS' },
  { label: 'B.Sc. (Bachelor of Science)', value: 'B.Sc.' },
  { label: 'BCA (Computer Applications)', value: 'BCA' },
  { label: 'MCA (Computer Applications)', value: 'MCA' },
  { label: 'M.Tech (Master of Technology)', value: 'M.Tech' },
  { label: 'B.Com (Bachelor of Commerce)', value: 'B.Com' },
  { label: 'B.A. (Bachelor of Arts)', value: 'B.A.' },
  { label: 'BBA (Business Administration)', value: 'BBA' },
  { label: 'MBA (Business Administration)', value: 'MBA' },
  { label: 'Diploma', value: 'Diploma' },
  { label: 'Other', value: 'Other' },
];

const BRANCH_OPTIONS = [
  { label: 'Computer Science & Engineering (CSE)', value: 'CSE' },
  { label: 'Information Technology (IT)', value: 'IT' },
  { label: 'Electronics & Communication (ECE)', value: 'ECE' },
  { label: 'Electrical & Electronics (EEE)', value: 'EEE' },
  { label: 'Mechanical Engineering (ME)', value: 'Mechanical' },
  { label: 'Civil Engineering (CE)', value: 'Civil' },
  { label: 'Artificial Intelligence & Data Science', value: 'AI & DS' },
  { label: 'Cyber Security', value: 'Cyber Security' },
  { label: 'Biotechnology', value: 'Biotechnology' },
  { label: 'Chemical Engineering', value: 'Chemical' },
  { label: 'Commerce & Finance', value: 'Commerce' },
  { label: 'Business Administration', value: 'Management' },
  { label: 'Medical & Health Sciences', value: 'Medicine' },
  { label: 'General Sciences', value: 'Science' },
  { label: 'Arts & Humanities', value: 'Arts' },
  { label: 'Other', value: 'Other' },
];

const YEAR_OPTIONS = [
  { label: '1st Year', value: '1st Year' },
  { label: '2nd Year', value: '2nd Year' },
  { label: '3rd Year', value: '3rd Year' },
  { label: '4th Year', value: '4th Year' },
  { label: '5th Year', value: '5th Year' },
];

const SEMESTER_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: `Semester ${i + 1}`,
  value: String(i + 1),
}));

const OnboardingScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { user, setUser, setIsNewRegistration } = useContext(AuthContext);

  const [collegeId, setCollegeId] = useState(user?.collegeId || null);
  const [university, setUniversity] = useState(user?.university || '');
  const [degree, setDegree] = useState(user?.degree || 'B.Tech');
  const [branch, setBranch] = useState(user?.branch || 'CSE');
  const [year, setYear] = useState(user?.batch || '1st Year');
  const [semester, setSemester] = useState(String(user?.semester || '1'));
  
  const [loading, setLoading] = useState(false);

  const handleFinish = async () => {
    setLoading(true);
    try {
      const payload = {
        collegeId: collegeId || null,
        university: university.trim(),
        degree,
        branch,
        batch: year,
        semester: Number(semester) || 1,
      };

      const updatedUser = await updateProfile(payload);
      if (setUser) {
        setUser(updatedUser.user || updatedUser);
      }
      if (setIsNewRegistration) {
        setIsNewRegistration(false);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'DrawerRoot' }],
      });
    } catch (error) {
      console.error('Onboarding profile update failed:', error);
      // Even if network fails, allow continuing to dashboard so user is never stuck
      if (setIsNewRegistration) {
        setIsNewRegistration(false);
      }
      navigation.reset({
        index: 0,
        routes: [{ name: 'DrawerRoot' }],
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (setIsNewRegistration) {
      setIsNewRegistration(false);
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'DrawerRoot' }],
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <GraduationCap size={32} color={colors.primaryForeground} />
            </View>
            <View style={styles.badgeRow}>
              <Sparkles size={14} color={colors.accent} style={{ marginRight: 4 }} />
              <Text style={styles.badgeText}>Personalize StudyArena</Text>
            </View>
            <Text style={styles.title}>Set up your study desk</Text>
            <Text style={styles.subtitle}>
              Tell us about your program so we can tailor your subjects, tasks, and syllabus.
            </Text>
          </View>

          <View style={styles.form}>
            <Field label="College / University" hint="Where are you currently studying?">
              <CollegePicker
                collegeId={collegeId}
                collegeName={university}
                placeholder="Search your college or university"
                onSelect={({ collegeId: selectedId, collegeName: selectedName }) => {
                  setCollegeId(selectedId);
                  setUniversity(selectedName);
                }}
                disabled={loading}
              />
            </Field>

            <Field label="Degree / Program">
              <SelectPicker
                label="Degree / Program"
                placeholder="Select your degree"
                value={degree}
                options={DEGREE_OPTIONS}
                onValueChange={setDegree}
                disabled={loading}
              />
            </Field>

            <Field label="Department / Branch">
              <SelectPicker
                label="Department / Branch"
                placeholder="Select your branch"
                value={branch}
                options={BRANCH_OPTIONS}
                onValueChange={setBranch}
                searchable={true}
                disabled={loading}
              />
            </Field>

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Field label="Academic Year">
                  <SelectPicker
                    label="Academic Year"
                    placeholder="Select your academic year"
                    value={year}
                    options={YEAR_OPTIONS}
                    onValueChange={setYear}
                    disabled={loading}
                  />
                </Field>
              </View>

              <View style={styles.halfCol}>
                <Field label="Current Semester">
                  <SelectPicker
                    label="Current Semester"
                    placeholder="Select your semester"
                    value={semester}
                    options={SEMESTER_OPTIONS}
                    onValueChange={setSemester}
                    disabled={loading}
                  />
                </Field>
              </View>
            </View>

            <Button
              onPress={handleFinish}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              Complete Setup
            </Button>

            <TouchableOpacity 
              onPress={handleSkip} 
              disabled={loading}
              style={styles.skipButton}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Skip for now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    shadowColor: colors.foreground,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.04,
    shadowRadius: 28,
    elevation: 2,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.accent}1A`,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontFamily: typography.mono.medium,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontFamily: typography.serif.medium,
    fontSize: 26,
    color: colors.foreground,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.sans.regular,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
    lineHeight: 19,
    paddingHorizontal: spacing.sm,
  },
  form: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  submitButton: {
    marginTop: spacing.lg,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
  },
  skipText: {
    fontFamily: typography.sans.medium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});

export default OnboardingScreen;
