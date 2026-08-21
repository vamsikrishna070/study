import React, { useState, useContext } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { UserPlus } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

const RegisterScreen = ({ navigation }) => {
  const { colors } = useAppTheme();
  const { register } = useContext(AuthContext);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMsg('Please fill in all fields.');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    try {
      await register(name, email, password);
      navigation.navigate('VerifyOtp', { email, mode: 'email-verification' });
    } catch (error) {
      if (error.response) {
        setErrorMsg(error.response.data?.message || 'Registration failed.');
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
              <UserPlus size={28} color={colors.primaryForeground} />
            </View>
            <Text style={styles.title}>Create an account</Text>
            <Text style={styles.subtitle}>Join StudyArena to get started.</Text>
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
                onChangeText={setName}
                autoCapitalize="words"
                placeholder="Enter your full name"
                editable={!loading}
              />
            </Field>

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
                placeholder="Create a password"
                editable={!loading}
              />
            </Field>

            <Button
              onPress={handleRegister}
              loading={loading}
              style={styles.submitButton}
            >
              Sign up
            </Button>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Text 
              style={styles.footerLink} 
              onPress={() => navigation.navigate('Login')}
            >
              Log in
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = useStyles(({ colors, typography, spacing, radii }) => StyleSheet.create({
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
}));

export default RegisterScreen;
