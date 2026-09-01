import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { Mail } from 'lucide-react-native';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';
import { forgotPassword } from '../../api/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRequestOtp = async () => {
    if (!email) {
      setErrorMsg('Please enter your email.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await forgotPassword(email);

      navigation.navigate('VerifyOtp', { email, mode: 'password-reset' });
    } catch (error) {
      if (error.response) {

        setErrorMsg(error.response.data?.message || 'Failed to send reset code.');
      } else {
        setErrorMsg('Unable to connect to StudyArena. Please check your internet connection.');
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
              <Mail size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.title}>Forgot Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered email address.
            </Text>
          </View>

          <View style={styles.form}>
            {!!errorMsg && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMsg}</Text>
              </View>
            )}

            <Field label="Email">
              <Input
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="Enter your registered email address"
                editable={!loading}
              />
            </Field>

            <Button
              onPress={handleRequestOtp}
              loading={loading}
              style={styles.submitButton}
            >
              Send OTP
            </Button>
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

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
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
  footerLink: { fontFamily: typography.sans.bold, fontSize: 14, color: colors.accent }
});export default ForgotPasswordScreen;
