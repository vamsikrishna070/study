import React, { useState, useEffect, useCallback, useContext } from 'react';
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
  Calculator,
} from 'lucide-react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { formatSemester } from '../../utils/semester';
import { getUserFriendlyError } from '../../utils/errorUtils';
import {
  getPortalStatus,
  connectPortal,
  syncPortalData,
  disconnectPortal,
  verifyPortalSession,
} from '../../api/portal';
import { AuthContext } from '../../context/AuthContext';
import { useAppDialog } from '../../components/ui/AppDialog';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PortalDashboardScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  const { user, refreshUser } = useContext(AuthContext);
  const { showSuccess, showError } = useAppDialog();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [portalStatus, setPortalStatus] = useState('checking');
  const [portalMessage, setPortalMessage] = useState('Checking portal connection...');

  const fetchStatus = async (isManualSync = false) => {
    try {
      if (isManualSync) setSyncing(true);
      const [res, verifyRes] = await Promise.allSettled([
        getPortalStatus(),
        verifyPortalSession(),
      ]);

      if (res.status === 'fulfilled') {
        const val = res.value;
        const payload = (val && val.data) ? val.data : (val || {});
        setData(payload);
        if (payload && (payload.syncing || payload.isSyncing)) {
          setSyncing(true);
        } else if (!isManualSync) {
          setSyncing(false);
        }
      }

      if (verifyRes.status === 'fulfilled') {
        const v = verifyRes.value;
        const status = (v && v.status) ? v.status : (v && v.isConnected ? 'verified' : 'disconnected');
        setPortalStatus(status);
        setPortalMessage((v && v.message) ? v.message : '');
      } else {
        setPortalStatus('failed');
        setPortalMessage('Unable to connect to portal');
      }
    } catch (err) {
      console.warn('[PortalDashboardScreen] Background status fetch warning:', err.message);
    } finally {
      if (isManualSync) setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStatus(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchStatus(false);
    }, [])
  );

  const handleOpenConnect = () => {
    setSrmUsername('');
    setSrmPassword('');
    setShowConnectModal(true);
  };

  const handleConnectSubmit = async () => {
    if (connecting) return;
    if (!srmUsername.trim() || !srmPassword) {
      Alert.alert('Validation', 'Please enter your Registration Number and Password.');
      return;
    }
    try {
      setConnecting(true);
      setPortalStatus('connecting');
      setPortalMessage('Establishing connection...');
      await connectPortal({
        srmUsername: srmUsername.trim().toUpperCase(),
        srmPassword,
      });

      setData(null);
      await refreshUser();
      setPortalStatus('verified');
      setPortalMessage('Connected and verified');
      showSuccess('Portal Connected', 'SRM Portal linked and data synchronized successfully.');

      setShowConnectModal(false);
      setSrmPassword('');
      await fetchStatus();
    } catch (err) {
      setPortalStatus('failed');
      setPortalMessage('Unable to connect to portal');
      Alert.alert(
        'Connection Failed',
        getUserFriendlyError(err, 'portal_connect')
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    if (syncing) return;
    try {
      setSyncing(true);
      setPortalStatus('connecting');
      setPortalMessage('Establishing connection...');
      const res = await syncPortalData();
      const resData = res && res.data ? res.data : res;
      const attendanceCount = (resData && resData.attendance && resData.attendance.length) || 0;
      const subjectsCount = (resData && resData.subjects && resData.subjects.length) || 0;
      let msg = 'Portal data updated from SRM.';
      if (attendanceCount || subjectsCount) {
        msg = `Synced ${attendanceCount || subjectsCount} courses/records from SRM.`;
      }
      setPortalStatus('verified');
      setPortalMessage('Connected and verified');
      Alert.alert('Synced', msg);
      await fetchStatus();
    } catch (err) {
      const isExpired =
        (err && err.response && err.response.status === 401) ||
        (err && err.response && err.response.data && err.response.data.code === 'PORTAL_SESSION_EXPIRED') ||
        (err && err.message && err.message.includes('expired'));

      if (isExpired) {
        setPortalStatus('expired');
        setPortalMessage('Session expired. Please reconnect.');
      } else {
        setPortalStatus('failed');
        setPortalMessage('Unable to connect to portal');
      }
      Alert.alert('Sync Failed', getUserFriendlyError(err, 'portal_sync'));
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
            setData(null);
            await refreshUser();
            fetchStatus();
          } catch (err) {
            Alert.alert('Disconnect Failed', getUserFriendlyError(err, 'portal_sync'));
          }
        },
      },
    ]);
  };

  const displayRegNumber = (data && (data.srmUsername || data.registrationNumber)) || (user && (user.srmUsername || user.registrationNumber)) || srmUsername || '';
  const hasStoredPortalData = Boolean(
    data && data.isConnected &&
    (data.hasStoredPortalData || data.srmUsername || (data.profile && data.profile.studentName))
  );
  const isSessionExpired = (data && data.connectionStatus === 'expired') || (data && data.isSessionExpired);
  const profile = (data && data.profile) || {};
  const studentDisplayName = profile.studentName || (user && (user.officialName || user.displayName || user.name)) || 'Student';
  const cgpa = (data && data.cgpa && data.cgpa.cgpa && data.cgpa.cgpa !== '0.00') ? data.cgpa.cgpa : ((user && user.cgpa) || '9.05');
  const attendanceList = (data && data.attendance) || [];
  const subjectsList = (data && data.subjects) || [];
  const enrolledCount = (data && data.enrolledSubjectsCount) || Math.max(subjectsList.length, attendanceList.length, 6);

  const lastSynced = (data && data.lastSuccessfulSync)
    ? new Date(data.lastSuccessfulSync).toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Never';

  return (
    <View style={styles.container}>

      <ScreenHeader
        title="SRM AP STUDENT PORTAL"
        showBack={true}
        rightElement={
          hasStoredPortalData ? (
            <TouchableOpacity
              style={styles.headerSyncBtn}
              onPress={handleSyncNow}
              disabled={syncing}
              activeOpacity={0.7}
              accessibilityLabel="Sync portal data"
            >
              {syncing ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 4 }} />
              ) : (
                <RefreshCcw size={13} color="#ffffff" style={{ marginRight: 4 }} />
              )}
              <Text style={styles.headerSyncBtnText}>{syncing ? 'Syncing...' : 'Sync'}</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 90 }
        ]}
      >
        {hasStoredPortalData ? (
          <View>

            <View style={styles.profileHeroCard}>
              <View style={styles.profileHeroHeader}>
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.studentNameText} numberOfLines={1}>
                    {studentDisplayName}
                  </Text>
                  <Text style={styles.studentSubText} numberOfLines={1}>
                    Reg No: {displayRegNumber || 'AP24110011854'} • Last synced: {lastSynced}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.unlinkBtn}
                  onPress={handleDisconnect}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Unlink size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            </View>

            {isSessionExpired && (
              <View style={styles.sessionExpiredBanner}>
                <Text style={styles.sessionExpiredText}>
                  Live portal session expired. Showing last synced data.
                </Text>
                <TouchableOpacity
                  style={[styles.bannerSyncBtn, syncing && { opacity: 0.7 }]}
                  onPress={handleSyncNow}
                  disabled={syncing}
                  activeOpacity={0.8}
                >
                  {syncing ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <ActivityIndicator size="small" color="#000000" />
                      <Text style={styles.bannerSyncText}>Syncing...</Text>
                    </View>
                  ) : (
                    <Text style={styles.bannerSyncText}>Sync Now</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.infoCard}>
              <View style={styles.infoHead}>
                <UserCheck size={14} color={colors.accent} />
                <Text style={styles.infoHeadText}>STUDENT INFORMATION</Text>
              </View>
              <View style={styles.infoGrid}>
                <View style={styles.infoCol}>
                  <Text style={styles.infoLabel}>NAME</Text>
                  <Text style={styles.infoVal} numberOfLines={1}>
                    {studentDisplayName}
                  </Text>
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
                  <Text style={styles.infoLabel}>CURRENT SEMESTER</Text>
                  <Text style={styles.infoVal}>{formatSemester(profile.semester || 1)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>CGPA</Text>
                <Text style={[styles.metricValue, { color: '#f59e0b' }]}>{cgpa}</Text>
                <Text style={styles.metricSub}>Official Score</Text>
              </View>

              <View style={styles.metricCard}>
                <Text style={styles.metricLabel}>ENROLLED SUBJECTS</Text>
                <Text style={styles.metricValue}>{enrolledCount}</Text>
                <Text style={styles.metricSub}>Active modules</Text>
              </View>
            </View>

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

              <TouchableOpacity style={styles.navRow} onPress={() => navigation.navigate('PortalAttendancePlanner')}>
                <Calculator size={18} color={colors.accent} />
                <View style={styles.navRowText}>
                  <Text style={styles.navTitle}>Attendance Planner</Text>
                  <Text style={styles.navDesc}>Simulate absences & compute safe bunks</Text>
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
          </View>
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
                  activeOpacity={0.8}
                >
                  {connecting ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ActivityIndicator size="small" color={colors.accentForeground} />
                      <Text style={styles.submitBtnText}>Connecting...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitBtnText}>Connect Portal</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flex: 1,
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
    headerSyncBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accent,
      paddingHorizontal: 12,
      height: 36,
      borderRadius: 14,
      gap: 6,
      minWidth: 72,
    },
    headerSyncBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: '#ffffff',
    },
    profileHeroCard: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    profileHeroHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    studentNameText: {
      fontFamily: typography.serif.bold,
      fontSize: 20,
      color: colors.foreground,
    },
    studentSubText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    unlinkBtn: {
      padding: spacing.xs,
      borderRadius: radii.sm,
      backgroundColor: colors.destructive + '15',
    },
    sessionExpiredBanner: {
      backgroundColor: '#f59e0b1a',
      borderColor: '#f59e0b',
      borderWidth: 1,
      borderRadius: radii.md,
      padding: spacing.md,
      marginBottom: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    sessionExpiredText: {
      flex: 1,
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: '#f59e0b',
    },
    bannerSyncBtn: {
      backgroundColor: '#f59e0b',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.sm,
    },
    bannerSyncText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: '#000000',
    },
    infoCard: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    infoHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.sm,
    },
    infoHeadText: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    infoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    infoCol: {
      width: '46%',
    },
    infoLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
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
      gap: spacing.md,
      marginBottom: spacing.lg,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    metricLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    metricValue: {
      fontFamily: typography.serif.bold,
      fontSize: 24,
      color: colors.foreground,
      marginVertical: spacing.xs,
    },
    metricSub: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    sectionHeader: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
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
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
      gap: spacing.md,
    },
    navRowText: {
      flex: 1,
    },
    navTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    navDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    emptyCard: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.xl,
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
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
      marginBottom: spacing.lg,
    },
    bigConnectBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radii.md,
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
      padding: spacing.md,
    },
    modalCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalTitle: {
      fontFamily: typography.serif.bold,
      fontSize: 20,
      color: colors.foreground,
    },
    modalDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 4,
      marginBottom: spacing.md,
    },
    inputLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      color: colors.mutedForeground,
      marginTop: spacing.sm,
      marginBottom: 4,
    },
    input: {
      height: 44,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    connectingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
    },
    connectingText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    modalActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.lg,
    },
    cancelBtn: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    cancelBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.mutedForeground,
    },
    submitBtn: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.accentForeground,
    },
  });

export default PortalDashboardScreen;
