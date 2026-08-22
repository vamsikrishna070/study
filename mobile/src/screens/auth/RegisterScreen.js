import React, { useState, useContext, useMemo } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity } from 'react-native';
import { UserPlus, Eye, EyeOff, Check, X } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function calculatePasswordStrength(password) {
  if (!password) return { score: 0, label: '', color: '' };
  
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  switch (score) {
    case 1:
      return { score: 1, label: 'Weak', color: '#EF4444' };
    case 2:
      return { score: 2, label: 'Fair', color: '#F59E0B' };
    case 3:
      return { score: 3, label: 'Good', color: '#3B82F6' };
    case 4:
      return { score: 4, label: 'Strong', color: '#10B981' };
    default:
      return { score: 0, label: 'Too short', color: '#EF4444' };
  }
}

const RegisterScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { register } = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const passwordStrength = useMemo(() => calculatePasswordStrength(password), [password]);

  const validateForm = () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName || trimmedName.length < 2) {
      return 'Please enter your full name (at least 2 characters).';
    }
    if (!trimmedEmail || !EMAIL_REGEX.test(trimmedEmail)) {
      return 'Please enter a valid email address.';
    }
    if (!password || password.length < 8) {
      return 'Password must contain at least 8 characters.';
    }
    if (password !== confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  };

  const handleRegister = async () => {
    if (loading) return;

    const validationError = validateForm();
    if (validationError) {
      setErrorMsg(validationError);
      return;
    }

    setErrorMsg('');
    setLoading(true);

    try {
      const trimmedName = name.trim();
      const trimmedEmail = email.trim().toLowerCase();
      
      await register(trimmedName, trimmedEmail, password);
      navigation.navigate('VerifyOtp', { email: trimmedEmail, mode: 'email-verification' });
    } catch (error) {
      if (error.response) {
        if (error.response.status === 409) {
          setErrorMsg('An account with this email already exists.');
        } else if (error.response.data?.message) {
          setErrorMsg(error.response.data.message);
        } else {
          setErrorMsg('Unable to complete registration. Please try again.');
        }
      } else if (error.request) {
        setErrorMsg('Unable to connect to StudyArena. Please check your connection.');
      } else {
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
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
              <UserPlus size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.title}>Create your space</Text>
            <Text style={styles.subtitle}>Sign up to organize your academic life.</Text>
          </View>

          <View style={styles.form}>
            {!!errorMsg && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Field label="Full Name">
              <Input
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errorMsg) setErrorMsg('');
                }}
                autoCapitalize="words"
                placeholder="Enter your full name"
                editable={!loading}
              />
            </Field>

            <Field label="Email Address">
              <Input
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errorMsg) setErrorMsg('');
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Enter your email address"
                editable={!loading}
              />
            </Field>

            <Field label="Password">
              <Input
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMsg) setErrorMsg('');
                }}
                secureTextEntry
                placeholder="Create a strong password (8+ chars)"
                editable={!loading}
              />
            </Field>

            {/* Password Strength Indicator */}
            {password.length > 0 && (
              <View style={styles.strengthContainer}>
                <View style={styles.strengthBarRow}>
                  {[1, 2, 3, 4].map((step) => (
                    <View
                      key={step}
                      style={[
                        styles.strengthBarSegment,
                        {
                          backgroundColor:
                            passwordStrength.score >= step
                              ? passwordStrength.color
                              : colors.cardBorder,
                        },
                      ]}
                    />
                  ))}
                </View>
                <View style={styles.strengthLabelRow}>
                  <Text style={styles.strengthHintText}>Password Strength:</Text>
                  <Text style={[styles.strengthLabelText, { color: passwordStrength.color }]}>
                    {passwordStrength.label}
                  </Text>
                </View>
              </View>
            )}

            <Field label="Confirm Password">
              <Input
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errorMsg) setErrorMsg('');
                }}
                secureTextEntry
                placeholder="Re-enter your password"
                editable={!loading}
              />
            </Field>

            {/* Password Match Indicator */}
            {confirmPassword.length > 0 && (
              <View style={styles.matchIndicatorRow}>
                {password === confirmPassword ? (
                  <View style={styles.matchRow}>
                    <Check size={14} color="#10B981" />
                    <Text style={[styles.matchText, { color: '#10B981' }]}>Passwords match</Text>
                  </View>
                ) : (
                  <View style={styles.matchRow}>
                    <X size={14} color={colors.destructive} />
                    <Text style={[styles.matchText, { color: colors.destructive }]}>Passwords do not match</Text>
                  </View>
                )}
              </View>
            )}

            <Button
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              Create account
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7}>
              <Text style={styles.footerLink}>Log in</Text>
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
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.serif.medium,
    fontSize: 28,
    color: colors.foreground,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  form: {
    marginBottom: spacing.lg,
  },
  errorContainer: {
    backgroundColor: `${colors.destructive}1A`,
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: typography.sans.medium,
    fontSize: 13,
    color: colors.destructive,
    textAlign: 'center',
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 44,
  },
  visibilityToggle: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
  },
  strengthContainer: {
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  strengthBarRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 4,
  },
  strengthBarSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  strengthHintText: {
    fontFamily: typography.sans.regular,
    fontSize: 11,
    color: colors.mutedForeground,
  },
  strengthLabelText: {
    fontFamily: typography.sans.bold,
    fontSize: 11,
  },
  matchIndicatorRow: {
    marginTop: -spacing.xs,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchText: {
    fontFamily: typography.sans.medium,
    fontSize: 12,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  footerText: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  footerLink: {
    fontFamily: typography.sans.bold,
    fontSize: 14,
    color: colors.accent,
  },
});

export default RegisterScreen;
