import React, { useState, useContext } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { GraduationCap } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { colors, typography, radii, spacing } from '../../theme/theme';

const LoginScreen = ({ navigation }) => {
  const { login } = useContext(AuthContext);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await login(email, password);
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          setErrorMsg('Invalid email or password');
        } else if (error.response.data?.unverified) {
          navigation.navigate('VerifyOtp', { email, mode: 'email-verification' });
        } else {
          setErrorMsg(error.response.data?.message || 'Login failed.');
        }
      } else if (error.request) {
        setErrorMsg('Network error. Please check your connection.');
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
              <GraduationCap size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to your StudyArena desk.</Text>
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
                placeholder="Enter your email address"
                editable={!loading}
              />
            </Field>

            <Field label="Password">
              <Input
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Enter your password"
                editable={!loading}
              />
            </Field>

            <View style={styles.forgotPasswordContainer}>
              <Text 
                style={styles.forgotPasswordText} 
                onPress={() => navigation.navigate('ForgotPassword')}
              >
                Forgot Password?
              </Text>
            </View>

            <Button
              onPress={handleLogin}
              loading={loading}
              style={styles.submitButton}
            >
              Log in
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to StudyArena? </Text>
            <Text 
              style={styles.footerLink} 
              onPress={() => navigation.navigate('Register')}
            >
              Create an account
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24, // 3xl roughly
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
    fontSize: 32,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  },
  form: {
    marginBottom: spacing.xl,
  },
  errorContainer: {
    backgroundColor: `${colors.destructive}1A`, // 10%
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    fontFamily: typography.sans.medium,
    fontSize: 14,
    color: colors.destructive,
  },
  submitButton: {
    marginTop: spacing.md,
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginBottom: spacing.md,
  },
  forgotPasswordText: {
    fontFamily: typography.sans.medium,
    fontSize: 14,
    color: colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
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
  }
});

export default LoginScreen;
