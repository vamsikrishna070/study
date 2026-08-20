import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Mail, Lock } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { colors, typography, radii, spacing } from '../../theme/theme';
import { forgotPassword, resetPassword } from '../../api/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(0); // 0 = request email, 1 = verify & reset
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleRequestOtp = async () => {
    if (!email) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setStep(1);
      setSuccessMsg('If an account exists, a reset code was sent.');
    } catch (error) {
      if (error.response) {
        setErrorMsg(error.response.data?.message || 'Failed to send reset code.');
      } else {
        setErrorMsg('Network error. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!otp || !password) {
      setErrorMsg('Please enter the code and a new password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await resetPassword(email, otp, password);
      // Because resetPassword sets the token, we will be authenticated and redirected
      // But if it doesn't navigate automatically, we can navigate to Login
    } catch (error) {
      if (error.response) {
        setErrorMsg(error.response.data?.message || 'Failed to reset password.');
      } else {
        setErrorMsg('Network error. Please check your connection.');
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              {step === 0 ? (
                <Mail size={28} color={colors.primaryForeground} />
              ) : (
                <Lock size={28} color={colors.primaryForeground} />
              )}
            </View>
            <Text style={styles.title}>{step === 0 ? 'Forgot Password' : 'Reset Password'}</Text>
            <Text style={styles.subtitle}>
              {step === 0 
                ? 'Enter your email to receive a reset code.' 
                : `Enter the code sent to ${email} and your new password.`}
            </Text>
          </View>

          <View style={styles.form}>
            {!!errorMsg && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
            {!!successMsg && (
              <View style={[styles.errorContainer, { backgroundColor: `${colors.primary}1A` }]}>
                <Text style={[styles.errorText, { color: colors.primary }]}>{successMsg}</Text>
              </View>
            )}

            {step === 0 ? (
              <>
                <Field label="Email">
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholder="Enter Your Email"
                    editable={!loading}
                  />
                </Field>

                <Button
                  onPress={handleRequestOtp}
                  loading={loading}
                  style={styles.submitButton}
                >
                  Send Reset Code
                </Button>
              </>
            ) : (
              <>
                <Field label="6-Digit Code">
                  <Input
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="numeric"
                    maxLength={6}
                    placeholder="Enter 6-digit code"
                    editable={!loading}
                  />
                </Field>
                <Field label="New Password">
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Enter New Password"
                    editable={!loading}
                  />
                </Field>

                <Button
                  onPress={handleResetPassword}
                  loading={loading}
                  style={styles.submitButton}
                >
                  Reset Password
                </Button>
              </>
            )}
          </View>

          <View style={styles.footer}>
            <Text 
              style={styles.footerLink} 
              onPress={() => navigation.navigate('Login')}
            >
              Back to log in
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.md },
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
  header: { alignItems: 'center', marginBottom: spacing.xl },
  iconContainer: {
    width: 56, height: 56, borderRadius: radii.xl, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  title: { fontFamily: typography.serif.medium, fontSize: 32, color: colors.foreground, letterSpacing: -0.5 },
  subtitle: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground, marginTop: spacing.xs, textAlign: 'center' },
  form: { marginBottom: spacing.xl },
  errorContainer: { backgroundColor: `${colors.destructive}1A`, padding: spacing.sm, borderRadius: radii.sm, marginBottom: spacing.md },
  errorText: { fontFamily: typography.sans.medium, fontSize: 14, color: colors.destructive },
  submitButton: { marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground },
  footerLink: { fontFamily: typography.sans.bold, fontSize: 14, color: colors.accent }
});

export default ForgotPasswordScreen;
