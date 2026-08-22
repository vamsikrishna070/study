import React, { useState, useContext, useEffect, useRef } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, TextInput } from 'react-native';
import { KeyRound, Lock, ArrowLeft, RefreshCw, CircleCheck } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';
import { resendOtp, resetPassword } from '../../api/auth';

const VerifyOtpScreen = ({ route, navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const email = route.params?.email || '';
  const mode = route.params?.mode || 'email-verification'; // 'email-verification' | 'password-reset'
  
  const { verify } = useContext(AuthContext);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [cooldown, setCooldown] = useState(60); // Start with 60s countdown since OTP was just sent
  const inputRef = useRef(null);

  useEffect(() => {
    let timer;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleOtpChange = (val) => {
    // Only accept numeric digits, maximum 6
    const cleaned = val.replace(/[^0-9]/g, '').slice(0, 6);
    setOtp(cleaned);
    if (errorMsg) setErrorMsg('');
  };

  const handleVerify = async () => {
    if (loading) return;
    
    const cleanedOtp = otp.trim();
    if (!cleanedOtp || cleanedOtp.length !== 6) {
      setErrorMsg('Please enter the full 6-digit verification code.');
      return;
    }
    
    if (mode === 'password-reset') {
      if (!newPassword || newPassword.length < 8) {
        setErrorMsg('New password must contain at least 8 characters.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
    }
    
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    
    try {
      if (mode === 'email-verification') {
        await verify(email, cleanedOtp);
        // Note: AppNavigator automatically renders MainNavigator with initial route Onboarding
      } else if (mode === 'password-reset') {
        await resetPassword(email, cleanedOtp, newPassword);
        setSuccessMsg('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1200);
      }
    } catch (error) {
      if (error.response) {
        if (error.response.status === 400) {
          const msg = error.response.data?.message || '';
          if (msg.toLowerCase().includes('expired')) {
            setErrorMsg('Verification code expired. Please tap "Resend Code" below.');
          } else if (msg.toLowerCase().includes('invalid')) {
            setErrorMsg('Invalid verification code. Please check and try again.');
          } else {
            setErrorMsg(msg || 'Verification failed. Please check the code.');
          }
        } else if (error.response.status === 404) {
          setErrorMsg('Account not found. Please register again.');
        } else {
          setErrorMsg('Unable to verify code. Please try again shortly.');
        }
      } else if (error.request) {
        setErrorMsg('Unable to connect to StudyArena. Please check your internet connection.');
      } else {
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resending || loading || cooldown > 0) return;
    
    setErrorMsg('');
    setSuccessMsg('');
    setResending(true);
    
    try {
      const purpose = mode === 'email-verification' ? 'registration' : 'password_reset';
      await resendOtp(email, purpose);
      setSuccessMsg('A fresh verification code has been sent to your email.');
      setCooldown(60);
      setOtp('');
      inputRef.current?.focus();
    } catch (error) {
      if (error.response) {
        if (error.response.status === 429) {
          setErrorMsg('Please wait a moment before requesting another code.');
        } else {
          setErrorMsg(error.response.data?.message || 'Failed to resend code. Please try again.');
        }
      } else if (error.request) {
        setErrorMsg('Unable to connect to StudyArena. Please check your connection.');
      } else {
        setErrorMsg('An unexpected error occurred.');
      }
    } finally {
      setResending(false);
    }
  };

  // Render 6 visual boxes for OTP digits
  const otpDigits = otp.padEnd(6, ' ').split('');

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
              We sent a 6-digit verification code to:{'\n'}
              <Text style={styles.emailHighlight}>{email || 'your email'}</Text>
            </Text>
          </View>

          <View style={styles.form}>
            {!!errorMsg && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}
            {!!successMsg && (
              <View style={styles.successContainer}>
                <CircleCheck size={16} color="#10B981" style={{ marginRight: 6 }} />
                <Text style={styles.successText}>{successMsg}</Text>
              </View>
            )}

            <Field label="6-Digit Verification Code">
              {/* Visual 6-box OTP display */}
              <TouchableOpacity
                style={styles.otpBoxesContainer}
                activeOpacity={1}
                onPress={() => inputRef.current?.focus()}
              >
                {otpDigits.map((digit, index) => {
                  const isCurrent = otp.length === index;
                  const isFilled = digit !== ' ';
                  return (
                    <View
                      key={index}
                      style={[
                        styles.otpBox,
                        isCurrent && styles.otpBoxActive,
                        isFilled && styles.otpBoxFilled,
                      ]}
                    >
                      <Text style={styles.otpBoxText}>{isFilled ? digit : ''}</Text>
                    </View>
                  );
                })}
              </TouchableOpacity>

              {/* Hidden text input capturing typed / pasted digits */}
              <TextInput
                ref={inputRef}
                value={otp}
                onChangeText={handleOtpChange}
                keyboardType="numeric"
                maxLength={6}
                autoFocus={true}
                textContentType="oneTimeCode"
                autoComplete="sms-otp"
                editable={!loading}
                style={styles.hiddenInput}
              />
            </Field>

            {mode === 'password-reset' && (
              <>
                <Field label="New Password">
                  <Input
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    placeholder="Enter new password (8+ chars)"
                    editable={!loading}
                  />
                </Field>

                <Field label="Confirm New Password">
                  <Input
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry
                    placeholder="Confirm new password"
                    editable={!loading}
                  />
                </Field>
              </>
            )}

            <Button
              onPress={handleVerify}
              loading={loading}
              disabled={loading || otp.length < 6}
              style={styles.submitButton}
            >
              {mode === 'password-reset' ? 'Reset Password' : 'Verify Email'}
            </Button>
          </View>

          {/* Resend OTP Row */}
          <View style={styles.resendSection}>
            <Text style={styles.resendPrompt}>Didn't receive the code? </Text>
            {cooldown > 0 ? (
              <Text style={styles.cooldownText}>Resend in {cooldown}s</Text>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={resending || loading}
                activeOpacity={0.7}
                style={styles.resendButton}
              >
                <RefreshCw size={14} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={styles.resendLink}>
                  {resending ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.backRow}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
            >
              <ArrowLeft size={16} color={colors.mutedForeground} style={{ marginRight: 4 }} />
              <Text style={styles.backButtonText}>Back to log in</Text>
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
    lineHeight: 20,
  },
  emailHighlight: {
    fontFamily: typography.sans.bold,
    color: colors.foreground,
  },
  form: {
    marginBottom: spacing.md,
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
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B9811A',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  successText: {
    fontFamily: typography.sans.medium,
    fontSize: 13,
    color: '#10B981',
    textAlign: 'center',
  },
  otpBoxesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginVertical: spacing.xs,
  },
  otpBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxActive: {
    borderColor: colors.accent,
    backgroundColor: `${colors.accent}0D`,
  },
  otpBoxFilled: {
    borderColor: colors.primary,
  },
  otpBoxText: {
    fontFamily: typography.sans.bold,
    fontSize: 22,
    color: colors.foreground,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0.01,
    width: 1,
    height: 1,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  resendSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
  resendPrompt: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  cooldownText: {
    fontFamily: typography.sans.bold,
    fontSize: 14,
    color: colors.mutedForeground,
  },
  resendButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resendLink: {
    fontFamily: typography.sans.bold,
    fontSize: 14,
    color: colors.accent,
  },
  backRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.xs,
  },
  backButtonText: {
    fontFamily: typography.sans.medium,
    fontSize: 14,
    color: colors.mutedForeground,
  },
});

export default VerifyOtpScreen;
