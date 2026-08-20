import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { KeyRound, Lock } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { colors, typography, radii, spacing } from '../../theme/theme';
import { forgotPassword, resendOtp, resetPassword } from '../../api/auth';

const VerifyOtpScreen = ({ route, navigation }) => {
  const email = route.params?.email || '';
  const mode = route.params?.mode || 'email-verification'; // 'email-verification' | 'password-reset'
  
  const { verify } = useContext(AuthContext);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async () => {
    if (loading) return;
    
    if (!otp) {
      setErrorMsg('Please enter the verification code.');
      return;
    }
    if (mode === 'password-reset' && !newPassword) {
      setErrorMsg('Please enter a new password.');
      return;
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      if (mode === 'email-verification') {
        await verify(email, otp);
        // It will automatically update context and route to Dashboard
      } else if (mode === 'password-reset') {
        await resetPassword(email, otp, newPassword);
        // After reset, token is set, context should ideally reload or we navigate manually
        setSuccessMsg('Password reset successfully!');
        // Small delay before navigating to login to show success message if not auto-navigating
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 500) {
          setErrorMsg(mode === 'password-reset' ? 'Unable to reset password. Please try again.' : 'Unable to verify email. Please try again.');
        } else {
          setErrorMsg(error.response.data?.message || 'Verification failed.');
        }
      } else if (error.request) {
        setErrorMsg('Unable to connect to StudyArena.');
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (loading || cooldown > 0) return;
    
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      if (mode === 'email-verification') {
        await resendOtp(email);
      } else {
        await forgotPassword(email);
      }
      setSuccessMsg('A new verification code has been sent.');
      setCooldown(60);
    } catch (error) {
      if (error.response) {
        setErrorMsg(error.response.data?.message || 'Failed to resend code.');
      } else if (error.request) {
        setErrorMsg('Unable to connect to StudyArena.');
      } else {
        setErrorMsg('An unexpected error occurred.');
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
              {mode === 'password-reset' ? (
                <Lock size={28} color={colors.primaryForeground} />
              ) : (
                <KeyRound size={28} color={colors.primaryForeground} />
              )}
            </View>
            <Text style={styles.title}>
              {mode === 'password-reset' ? 'Reset Password' : 'Verify your email'}
            </Text>
            <Text style={styles.subtitle}>
              We've sent a 6-digit verification code to:{'\n'}
              <Text style={{ fontFamily: typography.sans.medium, color: colors.foreground }}>{email}</Text>
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

            {mode === 'password-reset' && (
              <Field label="New Password">
                <Input
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                  placeholder="Enter New Password"
                  editable={!loading}
                />
              </Field>
            )}

            <Button
              onPress={handleVerify}
              loading={loading}
              disabled={loading}
              style={styles.submitButton}
            >
              {mode === 'password-reset' ? 'Reset Password' : 'Verify Email'}
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Didn't receive the code? </Text>
            <Text 
              style={[styles.footerLink, cooldown > 0 && styles.footerLinkDisabled]} 
              onPress={handleResend}
              disabled={cooldown > 0}
            >
              {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
            </Text>
          </View>
          <View style={[styles.footer, { marginTop: spacing.md }]}>
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
  title: { fontFamily: typography.serif.medium, fontSize: 32, color: colors.foreground, letterSpacing: -0.5, textAlign: 'center' },
  subtitle: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground, marginTop: spacing.xs, textAlign: 'center', lineHeight: 20 },
  form: { marginBottom: spacing.xl },
  errorContainer: { backgroundColor: `${colors.destructive}1A`, padding: spacing.sm, borderRadius: radii.sm, marginBottom: spacing.md },
  errorText: { fontFamily: typography.sans.medium, fontSize: 14, color: colors.destructive, textAlign: 'center' },
  submitButton: { marginTop: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerText: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground },
  footerLink: { fontFamily: typography.sans.bold, fontSize: 14, color: colors.accent },
  footerLinkDisabled: { color: colors.mutedForeground, opacity: 0.7 }
});

export default VerifyOtpScreen;
