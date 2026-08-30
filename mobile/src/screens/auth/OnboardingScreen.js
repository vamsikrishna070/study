import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, ActivityIndicator } from 'react-native';
import { GraduationCap, Lock, Save, ArrowLeft } from 'lucide-react-native';
import { AuthContext } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';
import { updateProfile } from '../../api/auth';
import { connectPortal } from '../../api/portal';

const OnboardingScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { user, setUser, setIsNewRegistration, refreshUser } = useContext(AuthContext);

  const isSrm = user?.university?.toLowerCase().includes('srm');
  const [mode, setMode] = useState(isSrm ? null : 'manual');
  
  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [degree, setDegree] = useState(user?.degree || 'B.Tech');
  const [branch, setBranch] = useState(user?.branch || 'CSE');
  const [section, setSection] = useState(user?.section || '');
  const [semester, setSemester] = useState(String(user?.semester || '1'));

  const finishOnboarding = () => {
    if (setIsNewRegistration) setIsNewRegistration(false);
    navigation.reset({ index: 0, routes: [{ name: 'DrawerRoot' }] });
  };

  const handleSyncSubmit = async () => {
    setErrorMsg('');
    if (!srmUsername.trim() || !srmPassword) {
      setErrorMsg('Please enter your Registration Number and Password.');
      return;
    }
    setLoading(true);
    try {
      await connectPortal(srmUsername.trim().toUpperCase(), srmPassword);
      await refreshUser();
      finishOnboarding();
    } catch (err) {
      setErrorMsg(err.message || 'Unable to connect to portal.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async () => {
    setErrorMsg('');
    if (!degree.trim() || !branch.trim()) {
      setErrorMsg('Degree and Branch are required.');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        degree: degree.trim(),
        branch: branch.trim(),
        section: section.trim(),
        semester: Number(semester) || 1,
      };
      
      const updatedUser = await updateProfile(payload);
      if (setUser) setUser(updatedUser.user || updatedUser);
      finishOnboarding();
    } catch (error) {
      console.error('Onboarding profile update failed:', error);
      finishOnboarding(); // Proceed anyway
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'sync') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Sync from SRM Portal</Text>
          <Text style={styles.subtitle}>Automatically fetch your profile, subjects, and academic records.</Text>
          
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
          
          <View style={{ marginTop: 24, gap: 16 }}>
            <Field label="Registration Number">
              <Input 
                value={srmUsername} 
                onChangeText={setSrmUsername} 
                placeholder="e.g. AP2411001000" 
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
            
            <View style={{ marginTop: 8, gap: 12 }}>
              <Button onPress={handleSyncSubmit} disabled={loading} style={{ width: '100%' }}>
                {loading ? <ActivityIndicator color="#fff" style={{ marginRight: 8 }} /> : <Lock color="#fff" size={18} style={{ marginRight: 8 }} />}
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>{loading ? 'Connecting...' : 'Connect Portal'}</Text>
              </Button>
              <Button onPress={() => setMode(null)} variant="outline" disabled={loading} style={{ width: '100%' }}>
                <ArrowLeft color={colors.foreground} size={18} style={{ marginRight: 8 }} />
                <Text style={{ color: colors.foreground, fontWeight: 'bold' }}>Go back</Text>
              </Button>
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (mode === 'manual') {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Set up manually</Text>
          <Text style={styles.subtitle}>Enter your academic details to get started.</Text>
          
          {errorMsg ? <Text style={styles.error}>{errorMsg}</Text> : null}
          
          <View style={{ marginTop: 24, gap: 16 }}>
            <Field label="Degree">
              <Input 
                value={degree} 
                onChangeText={setDegree} 
                placeholder="e.g. B.Tech" 
                editable={!loading}
              />
            </Field>
            
            <Field label="Branch">
              <Input 
                value={branch} 
                onChangeText={setBranch} 
                placeholder="e.g. Computer Science" 
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
            
            <View style={{ marginTop: 8, gap: 12 }}>
              <Button onPress={handleManualSubmit} disabled={loading} style={{ width: '100%' }}>
                <Save color="#fff" size={18} style={{ marginRight: 8 }} />
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>Complete Setup</Text>
              </Button>
              {isSrm && (
                <Button onPress={() => setMode(null)} variant="outline" disabled={loading} style={{ width: '100%' }}>
                  <ArrowLeft color={colors.foreground} size={18} style={{ marginRight: 8 }} />
                  <Text style={{ color: colors.foreground, fontWeight: 'bold' }}>Go back</Text>
                </Button>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <GraduationCap size={32} color={colors.primaryForeground} />
        </View>
        <Text style={styles.title}>Academic Setup</Text>
        <Text style={styles.subtitle}>
          We noticed you are studying at {user?.university || 'SRM AP'}. Connect your portal to instantly fetch your subjects, timetable, and attendance.
        </Text>
        
        <View style={{ marginTop: 32, gap: 16 }}>
          <Button onPress={() => setMode('sync')} style={{ width: '100%' }}>
            <Lock color="#fff" size={20} style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Sync from SRM Portal</Text>
          </Button>
          <Button onPress={() => setMode('manual')} variant="secondary" style={{ width: '100%' }}>
            <Text style={{ color: colors.secondaryForeground, fontWeight: 'bold', fontSize: 16 }}>Set up manually</Text>
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

const createStyles = (colors, typography, spacing, radii) => StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.sans.bold,
    fontSize: 24,
    color: colors.foreground,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: typography.sans.regular,
    fontSize: 15,
    color: colors.mutedForeground,
    textAlign: 'center',
    lineHeight: 22,
  },
  error: {
    marginTop: spacing.md,
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: spacing.sm,
    borderRadius: radii.md,
    textAlign: 'center',
  }
});

export default OnboardingScreen;
