import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  GraduationCap,
  RefreshCcw,
  Link as LinkIcon,
  Unlink,
  BookOpen,
  Calendar,
  Award,
  ChevronRight,
  PartyPopper,
  UserCheck,
} from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import {
  getPortalStatus,
  connectPortal,
  syncPortalData,
  disconnectPortal,
} from '../../api/portal';
import { AuthContext } from '../../context/AuthContext';
import { useAppDialog } from '../../hooks/useAppDialog';

const PortalDashboardScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const { refreshUser } = useContext(AuthContext);
  const { showSuccess, showError, showDialog } = useAppDialog();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await getPortalStatus();
      setData(res);
    } catch (err) {
      // No credential logging
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleOpenConnect = () => {
    setSrmUsername('');
    setSrmPassword('');
    setShowConnectModal(true);
  };

  const handleConnectSubmit = async () => {
    if (!srmUsername.trim() || !srmPassword) {
      Alert.alert('Validation', 'Please enter your Registration Number and Password.');
      return;
    }
    try {
      setConnecting(true);
      await connectPortal({
        srmUsername: srmUsername.trim().toUpperCase(),
        srmPassword,
      });

      await refreshUser();
      showSuccess('Portal Connected', 'SRM Portal linked and data synchronized successfully.');
      
      setShowConnectModal(false);
      setSrmPassword('');
      fetchStatus();
    } catch (err) {
      Alert.alert(
        'Connection Failed',
        err.response?.data?.message ||
          'Unable to connect to the SRM AP portal. Please verify your registration number and password.'
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      await syncPortalData();
      Alert.alert('Synced', 'Portal data updated from SRM.');
      fetchStatus();
    } catch (err) {
      Alert.alert('Sync Failed', err.message || 'Could not sync portal data.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    Alert.alert('Disconnect SRM Portal', 'Are you sure you want to unlink your SRM account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          try {
            await disconnectPortal();
            fetchStatus();
          } catch (err) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading SRM Portal...</Text>
      </View>
    );
  }

  const isConnected = data?.isConnected;
  const profile = data?.profile || {};
  const cgpa = data?.cgpa?.cgpa || '0.00';
  const attendanceList = data?.attendance || [];
  const timetableList = data?.timetable || [];

  let totalClasses = 0;
  let totalPresent = 0;
  attendanceList.forEach((item) => {
    totalClasses += Number(item.classes_conducted) || 0;
    totalPresent += Number(item.present) || 0;
  });
  const overallPercentage = totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : '0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.tagRow}>
            <GraduationCap size={16} color={colors.accent} />
            <Text style={styles.tagText}>SRM AP STUDENT PORTAL</Text>
          </View>
          <Text style={styles.title}>
            {isConnected ? profile.studentName || data.srmUsername : 'Connect Portal'}
          </Text>
          {isConnected && (
            <Text style={styles.subtitle}>
              Reg No: {data.srmUsername} {profile.program ? `• ${profile.program}` : ''}
            </Text>
          )}
        </View>

        {isConnected ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow} disabled={syncing}>
              <RefreshCcw size={14} color={colors.accentForeground} />
              <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.unlinkBtn} onPress={handleDisconnect}>
              <Unlink size={14} color={colors.destructive} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.connectBtn} onPress={handleOpenConnect}>
            <LinkIcon size={14} color={colors.accentForeground} />
            <Text style={styles.connectBtnText}>Connect</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main Content */}
      {isConnected ? (
        <>
          {/* Student Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoHead}>
              <UserCheck size={14} color={colors.accent} />
              <Text style={styles.infoHeadText}>STUDENT INFORMATION</Text>
            </View>
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>NAME</Text>
                <Text style={styles.infoVal}>{profile.studentName || '—'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>PROGRAMME</Text>
                <Text style={styles.infoVal}>{profile.program || 'B.Tech'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>SECTION</Text>
                <Text style={styles.infoVal}>{profile.section || '—'}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>SEMESTER</Text>
                <Text style={styles.infoVal}>Sem {profile.semester || '1'}</Text>
              </View>
            </View>
          </View>

          {/* Quick Metrics */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>ATTENDANCE</Text>
              <Text style={styles.metricValue}>{overallPercentage}%</Text>
              <Text style={styles.metricSub}>{attendanceList.length} Subjects</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>CGPA</Text>
              <Text style={[styles.metricValue, { color: '#f59e0b' }]}>{cgpa}</Text>
              <Text style={styles.metricSub}>Official Score</Text>
            </View>

            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>SESSIONS TODAY</Text>
              <Text style={styles.metricValue}>{timetableList[0]?.subjects?.filter(Boolean)?.length || 0}</Text>
              <Text style={styles.metricSub}>On schedule</Text>
            </View>
          </View>

          {/* Navigation Items — 5 core portal features (Course Resources removed) */}
          <Text style={styles.sectionHeader}>PORTAL FEATURES</Text>
          <View style={styles.navStack}>
            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('PortalAttendance')}>
              <BookOpen size={18} color={colors.accent} />
              <View style={styles.navRowText}>
                <Text style={styles.navTitle}>Attendance Details</Text>
                <Text style={styles.navDesc}>Subject-wise conduct counts & percentages</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('PortalTimetable')}>
              <Calendar size={18} color={colors.accent} />
              <View style={styles.navRowText}>
                <Text style={styles.navTitle}>Weekly Timetable</Text>
                <Text style={styles.navDesc}>Daily schedule & classroom location tags</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('PortalExams')}>
              <Award size={18} color={colors.accent} />
              <View style={styles.navRowText}>
                <Text style={styles.navTitle}>Exams & Performance</Text>
                <Text style={styles.navDesc}>Official SRM assessment marks & components</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('PortalResults')}>
              <GraduationCap size={18} color={colors.accent} />
              <View style={styles.navRowText}>
                <Text style={styles.navTitle}>Semester Results</Text>
                <Text style={styles.navDesc}>Grade points ledger & cumulative CGPA</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('PortalCalendar')}>
              <PartyPopper size={18} color={colors.accent} />
              <View style={styles.navRowText}>
                <Text style={styles.navTitle}>Academic Calendar</Text>
                <Text style={styles.navDesc}>Semester milestones & holiday schedule</Text>
              </View>
              <ChevronRight size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.emptyCard}>
          <GraduationCap size={48} color={colors.accent} />
          <Text style={styles.emptyTitle}>Connect Your SRM AP Portal</Text>
          <Text style={styles.emptyDesc}>
            Link your student account to sync attendance, timetable schedules, assessment marks, and grades automatically.
          </Text>
          <TouchableOpacity style={styles.bigConnectBtn} onPress={handleOpenConnect}>
            <Text style={styles.bigConnectBtnText}>Connect SRM Portal</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Connect Modal — Registration Number + Password only, no CAPTCHA */}
      <Modal visible={showConnectModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Connect SRM Portal</Text>
            <Text style={styles.modalDesc}>
              Link your SRM AP student account to automatically sync your academic data.
            </Text>

            <Text style={styles.inputLabel}>REGISTRATION NUMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your registration number"
              placeholderTextColor={colors.mutedForeground}
              value={srmUsername}
              onChangeText={(t) => setSrmUsername(t.toUpperCase())}
              autoCapitalize="characters"
              editable={!connecting}
            />

            <Text style={styles.inputLabel}>PORTAL PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your portal password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              value={srmPassword}
              onChangeText={setSrmPassword}
              editable={!connecting}
            />

            {connecting && (
              <View style={styles.connectingRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.connectingText}>Authenticating with SRM AP portal…</Text>
              </View>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowConnectModal(false)}
                disabled={connecting}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, connecting && styles.submitBtnDisabled]}
                onPress={handleConnectSubmit}
                disabled={connecting}
              >
                <Text style={styles.submitBtnText}>{connecting ? 'Connecting...' : 'Connect Portal'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.md,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: spacing.sm,
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.mutedForeground,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.md,
    },
    tagRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    tagText: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    title: {
      fontFamily: typography.serif.bold,
      fontSize: 24,
      color: colors.foreground,
      marginTop: 2,
    },
    subtitle: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    actionRow: {
      flexDirection: 'row',
      gap: spacing.xs,
    },
    syncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
    },
    syncBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.accentForeground,
    },
    unlinkBtn: {
      padding: spacing.xs,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    connectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
    },
    connectBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.accentForeground,
    },
    infoCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    infoHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: spacing.xs,
    },
    infoHeadText: {
      fontFamily: typography.mono.bold,
      fontSize: 9,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      marginTop: 4,
    },
    infoCol: {
      minWidth: 100,
    },
    infoLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 8,
      color: colors.mutedForeground,
    },
    infoVal: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
      marginTop: 2,
    },
    metricsGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginBottom: spacing.lg,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    metricLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 9,
      letterSpacing: 1,
      color: colors.mutedForeground,
    },
    metricValue: {
      fontFamily: typography.sans.bold,
      fontSize: 22,
      color: colors.foreground,
      marginVertical: 4,
    },
    metricSub: {
      fontFamily: typography.sans.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    sectionHeader: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      letterSpacing: 1.5,
      color: colors.mutedForeground,
      marginBottom: spacing.sm,
    },
    navStack: {
      gap: spacing.sm,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    navRowText: {
      flex: 1,
      marginLeft: spacing.md,
    },
    navTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
    },
    navDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.xl,
      padding: spacing.xl,
      marginTop: spacing.md,
    },
    emptyTitle: {
      fontFamily: typography.serif.bold,
      fontSize: 20,
      color: colors.foreground,
      marginTop: spacing.md,
    },
    emptyDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    bigConnectBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      marginTop: spacing.lg,
    },
    bigConnectBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.accentForeground,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalTitle: {
      fontFamily: typography.serif.bold,
      fontSize: 18,
      color: colors.foreground,
      marginBottom: spacing.xs,
    },
    modalDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginBottom: spacing.md,
    },
    inputLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 9,
      letterSpacing: 1,
      color: colors.mutedForeground,
      marginTop: spacing.xs,
    },
    input: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: 8,
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.foreground,
      marginTop: 4,
    },
    connectingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      backgroundColor: colors.accent + '20',
      padding: spacing.sm,
      borderRadius: radii.md,
    },
    connectingText: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.accent,
      flex: 1,
    },
    modalActions: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    submitBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: radii.md,
      backgroundColor: colors.accent,
      alignItems: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.accentForeground,
    },
  });

export default PortalDashboardScreen;
