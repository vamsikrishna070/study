import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  ActivityIndicator,
  Modal,
  Alert,
} from 'react-native';
import {
  BookOpen,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  UserCheck,
  RefreshCw,
  Calculator,
  ChevronRight,
  Radio,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
  getTodayAttendance,
  markAttendanceCode,
  verifyPortalSession,
  connectPortal,
} from '../../api/portal';
import { AuthContext } from '../../context/AuthContext';
import { getUserFriendlyError } from '../../utils/errorUtils';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function AttendanceScreen({ navigation }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const { user, refreshUser } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('today');

  const [portalStatus, setPortalStatus] = useState('checking');
  const [portalMessage, setPortalMessage] = useState('Checking portal connection...');

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [srmUsername, setSrmUsername] = useState('');
  const [srmPassword, setSrmPassword] = useState('');
  const [connecting, setConnecting] = useState(false);

  const horizontalScrollRef = useRef(null);

  const checkConnection = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        setPortalStatus('checking');
        setPortalMessage('Checking portal connection...');
      }
      const verifyRes = await verifyPortalSession();
      const status = (verifyRes && verifyRes.status) ? verifyRes.status : (verifyRes && verifyRes.isConnected ? 'verified' : 'disconnected');
      setPortalStatus(status);
      setPortalMessage((verifyRes && verifyRes.message) ? verifyRes.message : '');
      return status;
    } catch (err) {
      console.warn('[AttendanceScreen] verifyPortalSession warning:', err.message);
      setPortalStatus('failed');
      setPortalMessage('Unable to connect to portal');
      return 'failed';
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const res = await getTodayAttendance();
      const payload = (res && res.data) ? res.data : (res || {});
      setData(payload);

      const isConn = Boolean(payload.isConnected || payload.hasStoredPortalData || payload.srmUsername);
      const isExpired = payload.connectionStatus === 'expired' || payload.isSessionExpired;

      if (payload.syncing || payload.isSyncing) {
        setPortalStatus('connecting');
        setPortalMessage('Reconnecting to SRM portal…');
      } else if (isExpired) {
        setPortalStatus('expired');
        setPortalMessage('Live session expired. Auto-reconnecting on action.');
      } else if (isConn) {
        setPortalStatus('verified');
        setPortalMessage('Connected and verified');
      } else {
        setPortalStatus('disconnected');
        setPortalMessage('Portal connection required');
      }
    } catch (err) {
      console.error('[AttendanceScreen] Error loading attendance:', err);
      if (!data) {
        setError(getUserFriendlyError(err, 'portal_connect'));
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenInitiate = () => {
    setSrmUsername(user?.srmUsername || data?.registrationNumber || '');
    setSrmPassword('');
    setShowConnectModal(true);
  };

  const handleConnectSubmit = async () => {
    if (connecting) return;
    const cleanUsername = srmUsername.trim().toUpperCase();
    if (!cleanUsername || !srmPassword) {
      Alert.alert('Validation Error', 'Please enter your Registration Number and Password.');
      return;
    }

    try {
      setConnecting(true);
      await connectPortal({
        srmUsername: cleanUsername,
        srmPassword,
      });

      await refreshUser();
      setShowConnectModal(false);
      setSrmPassword('');
      setFeedback({
        type: 'success',
        text: 'Session connected successfully!',
      });
      await loadData();
    } catch (err) {
      Alert.alert(
        'Session Connection Failed',
        getUserFriendlyError(err, 'portal_connect')
      );
    } finally {
      setConnecting(false);
    }
  };

  const handleSyncNow = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const { syncPortalData } = require('../../api/portal');
      await syncPortalData();
      setPortalStatus('verified');
      setPortalMessage('Connected and verified');
    } catch (_) {
    } finally {
      await loadData();
      setSyncing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      const { syncPortalData } = require('../../api/portal');
      await syncPortalData();
    } catch (syncErr) {
      console.warn('[AttendanceScreen] Pull-to-refresh sync warning:', syncErr.message);
    } finally {
      await loadData();
    }
  };

  const handleMarkCode = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed || submitting) return;

    if (portalStatus === 'disconnected') {
      setFeedback({
        type: 'error',
        text: 'Portal connection required. Please connect your SRM AP account first.',
      });
      return;
    }

    if (trimmed.length < 3) {
      setFeedback({
        type: 'error',
        text: 'Please enter a valid attendance code (e.g. C123456).',
      });
      return;
    }
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await markAttendanceCode(trimmed);
      if (res.success) {
        setPortalStatus('verified');
        setPortalMessage('Connected and verified');
        setFeedback({
          type: 'success',
          text: res.message || '✓ Attendance Captured Successfully!',
        });
        setCode('');
        await loadData();
      } else {
        if (res.code === 'PORTAL_SESSION_EXPIRED') {
          setPortalStatus('expired');
          setPortalMessage('Invalid credentials. Please reconnect.');
        }
        setFeedback({
          type: 'error',
          text: res.message || 'Incorrect Attendance Code!',
        });
      }
    } catch (err) {
      const serverMsg = (err && err.response && err.response.data && err.response.data.message) ? err.response.data.message : null;
      const isExpired =
        (err && err.response && err.response.status === 401) ||
        (err && err.response && err.response.data && err.response.data.code === 'PORTAL_SESSION_EXPIRED') ||
        (serverMsg && serverMsg.includes('credentials'));

      if (isExpired) {
        setPortalStatus('expired');
        setPortalMessage('Invalid credentials. Please reconnect.');
      }

      setFeedback({
        type: 'error',
        text: isExpired ? 'Your SRM credentials appear to be incorrect or have changed. Please reconnect.' : (serverMsg || getUserFriendlyError(err, 'portal_sync')),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const rawData = data && data.data ? data.data : data;
  const payload = rawData && rawData.data ? rawData.data : (rawData || {});
  const dayOrder = payload.dayOrder || (data && data.dayOrder);
  const todayAttendance = Array.isArray(payload.attendance)
    ? payload.attendance
    : (data && Array.isArray(data.attendance))
    ? data.attendance
    : [];
  const subjectStats = Array.isArray(payload.subjectStats)
    ? payload.subjectStats
    : (data && Array.isArray(data.subjectStats))
    ? data.subjectStats
    : [];

  const isWide = windowWidth >= 640;
  const panelWidth = isWide ? (windowWidth - spacing.lg * 2 - 16) / 2 : windowWidth - spacing.lg * 2;

  const handleTabPress = (tabKey) => {
    setActiveTab(tabKey);
    if (!isWide && horizontalScrollRef.current) {
      const xOffset = tabKey === 'today' ? 0 : panelWidth + spacing.md;
      horizontalScrollRef.current.scrollTo({ x: xOffset, animated: true });
    }
  };

  const renderTodayPanel = () => (
    <View style={[styles.panelContainer, { width: isWide ? undefined : panelWidth, flex: isWide ? 1 : undefined }]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>TODAY'S ATTENDANCE ({todayAttendance.length})</Text>
        <Text style={styles.panelSub}>Today's conduct hours & status</Text>
      </View>

      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {todayAttendance.length === 0 ? (
          <Card style={styles.emptyCard}>
            <UserCheck size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No classes conducted today.</Text>
          </Card>
        ) : (
          todayAttendance.map((cls, idx) => {
            if (!cls) return null;
            const isPresent = cls.status === 'PRESENT';
            const isAbsent = cls.status === 'ABSENT';
            const isOdMl = cls.status === 'OD/ML' || cls.status === 'OD' || cls.status === 'ML';

            return (
              <Card key={idx} style={styles.classCard}>
                <View style={styles.classHeader}>
                  <View style={styles.hourBadge}>
                    <Text style={styles.hourText}>H{cls.hour || idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.subjectCode}>{cls.subjectCode || 'CLASS'}</Text>
                    <Text style={styles.subjectName} numberOfLines={1}>
                      {cls.subjectName || cls.subjectCode || 'Course Session'}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      isPresent && styles.statusPresent,
                      isAbsent && styles.statusAbsent,
                      isOdMl && styles.statusOdMl,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        isPresent && { color: '#10B981' },
                        isAbsent && { color: '#EF4444' },
                        isOdMl && { color: '#8B5CF6' },
                      ]}
                    >
                      {cls.status || 'NOT MARKED'}
                    </Text>
                  </View>
                </View>

                {(cls.startTime || cls.endTime || cls.room) && (
                  <View style={styles.classMeta}>
                    <Clock size={13} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{cls.startTime || ''}{cls.endTime ? ` - ${cls.endTime}` : ''}</Text>
                    {Boolean(cls.room) && <Text style={styles.metaDot}>•</Text>}
                    {Boolean(cls.room) && <Text style={styles.metaText}>{cls.room}</Text>}
                  </View>
                )}
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  const renderSubjectsPanel = () => (
    <View style={[styles.panelContainer, { width: isWide ? undefined : panelWidth, flex: isWide ? 1 : undefined }]}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>SUBJECT-WISE ATTENDANCE ({subjectStats.length})</Text>
        <Text style={styles.panelSub}>Complete subject record & planning</Text>
      </View>

      <TouchableOpacity
        style={styles.plannerBanner}
        onPress={() => navigation.navigate('AttendancePlanner')}
        activeOpacity={0.75}
        accessibilityLabel="Open Attendance Planner"
      >
        <View style={styles.plannerBannerLeft}>
          <View style={styles.plannerIconWrap}>
            <Calculator size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.plannerBannerTitle}>Attendance Planner</Text>
            <Text style={styles.plannerBannerSub}>Simulate absences & compute safe bunks</Text>
          </View>
        </View>
        <ChevronRight size={18} color={colors.mutedForeground} />
      </TouchableOpacity>

      <ScrollView
        style={styles.panelScroll}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={true}
        nestedScrollEnabled={true}
      >
        {subjectStats.length === 0 ? (
          <Card style={styles.emptyCard}>
            <BookOpen size={28} color={colors.mutedForeground} style={{ marginBottom: 8 }} />
            <Text style={styles.emptyText}>No subject-wise attendance recorded.</Text>
          </Card>
        ) : (
          subjectStats.map((sub, idx) => (
            <TouchableOpacity
              key={idx}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('AttendancePlanner', { initialSubjectCode: sub.subjectCode })}
            >
              <Card style={styles.subCard}>
                <View style={styles.subHeader}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.subjectCode}>{sub.subjectCode}</Text>
                    <Text style={styles.subjectName} numberOfLines={1}>{sub.subjectName}</Text>
                  </View>
                  <Text
                    style={[
                      styles.pctText,
                      sub.percentage < 75 ? { color: '#F59E0B' } : { color: '#10B981' },
                    ]}
                  >
                    {typeof sub.percentage === 'number'
                      ? (sub.percentage % 1 === 0 ? `${sub.percentage}%` : `${sub.percentage.toFixed(2)}%`)
                      : `${sub.percentage}%`}
                  </Text>
                </View>

                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(Math.max(sub.percentage || 0, 0), 100)}%` },
                      sub.percentage < 75 ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#10B981' },
                    ]}
                  />
                </View>

                <View style={styles.statsGrid}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Conducted</Text>
                    <Text style={styles.statVal}>{sub.conducted}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Present</Text>
                    <Text style={[styles.statVal, { color: '#10B981' }]}>{sub.present}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Absent</Text>
                    <Text style={[styles.statVal, { color: '#EF4444' }]}>{sub.absent}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>OD/ML</Text>
                    <Text style={[styles.statVal, { color: '#8B5CF6' }]}>{sub.odMl || 0}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );

  const syncButton = (
    <TouchableOpacity
      style={styles.headerSyncBtn}
      onPress={handleSyncNow}
      disabled={syncing}
      activeOpacity={0.75}
      accessibilityLabel="Sync attendance"
    >
      {syncing ? (
        <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 4 }} />
      ) : (
        <RefreshCw size={13} color="#ffffff" style={{ marginRight: 4 }} />
      )}
      <Text style={styles.headerSyncBtnText}>{syncing ? 'Syncing...' : 'Sync'}</Text>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Attendance & Conduct"
        showDrawer={true}
        rightElement={syncButton}
      />

      <View style={styles.mainWrapper}>
        <PageHeading
          eyebrow="SRM AP PORTAL"
          title="Attendance & Conduct"
          detail="Today's conduct hours and online attendance code submission."
        />

        {error && !data ? (
          <Card style={styles.errorCard}>
            <AlertTriangle size={36} color={colors.destructive} style={{ marginBottom: 12 }} />
            <Text style={styles.errorTitle}>Unable to load attendance</Text>
            <Text style={styles.errorDesc}>{error}</Text>
            <Button onPress={loadData} style={styles.retryBtn}>
              Retry
            </Button>
          </Card>
        ) : (
          <View style={{ flex: 1 }}>

            {/* Disconnected State: Show Connect Card. Connected/Expired/Reconnecting: Show Code Form with auto-reconnect */}
            {portalStatus === 'disconnected' ? (
              <Card style={styles.compactCard}>
                <View style={styles.inactiveCardContent}>
                  <View style={styles.inactiveIconWrap}>
                    <Radio size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.inactiveTitle}>
                      Portal connection required
                    </Text>
                    <Text style={styles.inactiveDesc}>
                      Connect your SRM AP student account to submit attendance codes and view conduct hours.
                    </Text>
                  </View>
                </View>

                <View style={{ marginTop: 12 }}>
                  <Button
                    onPress={handleOpenInitiate}
                    style={styles.initiateBtn}
                    accessibilityLabel="Connect SRM Portal"
                  >
                    Connect SRM Portal
                  </Button>
                </View>

                {feedback && (
                  <View
                    style={[
                      styles.feedbackBox,
                      feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                    ]}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                    ) : (
                      <XCircle size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.feedbackText,
                        { color: feedback.type === 'success' ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {feedback.text}
                    </Text>
                  </View>
                )}
              </Card>
            ) : (
              /* Connected / Auto-reauthenticating: Show Mark Attendance Code Form */
              <Card style={styles.compactCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Text style={styles.cardTitle}>MARK ATTENDANCE CODE</Text>
                    <Text style={styles.cardSub}>Enter the code displayed by faculty during live class.</Text>
                  </View>
                  {Boolean(dayOrder) && (
                    <View style={styles.dayOrderBadge}>
                      <Text style={styles.dayOrderText}>Day Order {dayOrder}</Text>
                    </View>
                  )}
                </View>

                {portalStatus === 'expired' && (
                  <View style={styles.sessionExpiredBanner}>
                    <Text style={styles.sessionExpiredText}>
                      Live session will automatically re-authenticate on submission.
                    </Text>
                  </View>
                )}

                <View style={styles.codeForm}>
                  <TextInput
                    value={code}
                    onChangeText={(text) => setCode(text.toUpperCase())}
                    placeholder="Enter the Attendance Code here"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                    maxLength={15}
                    editable={!submitting}
                    keyboardType="default"
                    style={styles.codeInput}
                  />
                  <Button
                    onPress={handleMarkCode}
                    loading={submitting}
                    loadingText="Submitting..."
                    disabled={!code.trim() || submitting}
                    style={styles.submitBtn}
                  >
                    Submit
                  </Button>
                </View>

                <Text style={styles.codeHintText}>Format: Capital letter + 6 digits (e.g. C123456)</Text>

                {feedback && (
                  <View
                    style={[
                      styles.feedbackBox,
                      feedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                    ]}
                  >
                    {feedback.type === 'success' ? (
                      <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                    ) : (
                      <XCircle size={16} color="#EF4444" style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.feedbackText,
                        { color: feedback.type === 'success' ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {feedback.text}
                    </Text>
                  </View>
                )}
              </Card>
            )}

            {!isWide && (
              <View style={styles.segmentedTabBar}>
                <TouchableOpacity
                  style={[styles.segmentBtn, activeTab === 'today' && styles.segmentBtnActive]}
                  onPress={() => handleTabPress('today')}
                >
                  <Text style={[styles.segmentText, activeTab === 'today' && styles.segmentTextActive]}>
                    TODAY'S ATTENDANCE ({todayAttendance.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.segmentBtn, activeTab === 'subjects' && styles.segmentBtnActive]}
                  onPress={() => handleTabPress('subjects')}
                >
                  <Text style={[styles.segmentText, activeTab === 'subjects' && styles.segmentTextActive]}>
                    SUBJECT-WISE ({subjectStats.length})
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={{ flex: 1, marginTop: spacing.xs }}>
              {isWide ? (
                <View style={styles.twoColumnRow}>
                  {renderTodayPanel()}
                  <View style={{ width: 16 }} />
                  {renderSubjectsPanel()}
                </View>
              ) : (
                <ScrollView
                  ref={horizontalScrollRef}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={panelWidth + spacing.md}
                  snapToAlignment="start"
                  onMomentumScrollEnd={(e) => {
                    const xOffset = e.nativeEvent.contentOffset.x;
                    const index = Math.round(xOffset / (panelWidth + spacing.md));
                    setActiveTab(index === 0 ? 'today' : 'subjects');
                  }}
                  contentContainerStyle={{ gap: spacing.md }}
                  refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                  }
                >
                  {renderTodayPanel()}
                  {renderSubjectsPanel()}
                </ScrollView>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Initiate Session Modal */}
      <Modal
        visible={showConnectModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => !connecting && setShowConnectModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Initiate Portal Session</Text>
            <Text style={styles.modalDesc}>
              Enter your SRM Student Portal credentials to establish an active session and enable real-time attendance submission.
            </Text>

            <Text style={styles.inputLabel}>REGISTRATION NUMBER</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. AP21110010001"
              placeholderTextColor={colors.mutedForeground}
              value={srmUsername}
              onChangeText={(t) => setSrmUsername(t.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!connecting}
            />

            <Text style={styles.inputLabel}>PORTAL PASSWORD</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="••••••••••••"
              placeholderTextColor={colors.mutedForeground}
              value={srmPassword}
              onChangeText={setSrmPassword}
              secureTextEntry
              editable={!connecting}
            />

            {connecting && (
              <View style={styles.connectingRow}>
                <ActivityIndicator size="small" color={colors.accent} />
                <Text style={styles.connectingText}>Establishing session & syncing...</Text>
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
                style={[
                  styles.submitBtnAction,
                  (!srmUsername.trim() || !srmPassword || connecting) && styles.submitBtnDisabled,
                ]}
                onPress={handleConnectSubmit}
                disabled={!srmUsername.trim() || !srmPassword || connecting}
              >
                <Text style={styles.submitBtnText}>
                  {connecting ? 'Connecting...' : 'Initiate Session'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    mainWrapper: { flex: 1, padding: spacing.lg, paddingBottom: spacing.md },
    compactCard: { padding: spacing.md, marginBottom: spacing.sm },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    cardHeaderLeft: { flex: 1 },
    cardTitle: { fontFamily: typography.sans.bold, fontSize: 14, color: colors.foreground },
    cardSub: { fontFamily: typography.sans.regular, fontSize: 11, color: colors.mutedForeground, marginTop: 1 },
    dayOrderBadge: { backgroundColor: `${colors.accent}1F`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radii.md },
    dayOrderText: { fontFamily: typography.sans.bold, fontSize: 10, color: colors.accent },
    codeForm: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    codeInput: {
      flex: 1,
      height: 40,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      paddingHorizontal: 10,
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
    },
    submitBtn: { minWidth: 95, height: 40, paddingHorizontal: 8 },
    codeHintText: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    feedbackBox: { flexDirection: 'row', alignItems: 'center', marginTop: 10, padding: 8, borderRadius: radii.md },
    feedbackSuccess: { backgroundColor: '#10B9811A' },
    feedbackError: { backgroundColor: '#EF44441A' },
    feedbackText: { fontFamily: typography.sans.medium, fontSize: 11 },

    inactiveCardContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    inactiveIconWrap: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: `${colors.accent}1A`,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    inactiveTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    inactiveDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    initiateBtn: {
      backgroundColor: colors.accent,
    },

    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacing.lg,
    },
    modalContent: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      padding: spacing.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    modalTitle: {
      fontFamily: typography.serif.bold,
      fontSize: 18,
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
    modalInput: {
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
    submitBtnAction: {
      backgroundColor: colors.accent,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      borderRadius: radii.md,
    },
    submitBtnDisabled: {
      opacity: 0.5,
    },
    submitBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: '#ffffff',
    },

    segmentedTabBar: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: radii.md,
      padding: 3,
      marginBottom: spacing.xs,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: radii.sm,
    },
    segmentBtnActive: {
      backgroundColor: colors.card,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    segmentText: {
      fontFamily: typography.sans.bold,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    segmentTextActive: {
      color: colors.accent,
    },

    twoColumnRow: {
      flex: 1,
      flexDirection: 'row',
    },
    panelContainer: {
      flex: 1,
      backgroundColor: `${colors.card}80`,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
    },
    panelHeader: {
      marginBottom: 10,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.cardBorder}80`,
    },
    plannerBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: `${colors.card}`,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    plannerBannerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    plannerIconWrap: {
      width: 32,
      height: 32,
      borderRadius: radii.sm,
      backgroundColor: `${colors.accent}1A`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plannerBannerTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
    },
    plannerBannerSub: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    panelTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    panelSub: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    panelScroll: {
      flex: 1,
    },

    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { fontFamily: typography.sans.regular, fontSize: 12, color: colors.mutedForeground, textAlign: 'center' },
    classCard: { padding: 12, marginBottom: 8 },
    classHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hourBadge: { width: 30, height: 30, borderRadius: 6, backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center' },
    hourText: { fontFamily: typography.sans.bold, fontSize: 11, color: colors.primary },
    subjectCode: { fontFamily: typography.sans.bold, fontSize: 11, color: colors.accent, textTransform: 'uppercase' },
    subjectName: { fontFamily: typography.sans.bold, fontSize: 13, color: colors.foreground },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: colors.muted },
    statusPresent: { backgroundColor: '#10B9811F' },
    statusAbsent: { backgroundColor: '#EF44441F' },
    statusOdMl: { backgroundColor: '#8B5CF61F' },
    statusText: { fontFamily: typography.sans.bold, fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase' },
    classMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: `${colors.cardBorder}80` },
    metaText: { fontFamily: typography.sans.regular, fontSize: 11, color: colors.mutedForeground },
    metaDot: { marginHorizontal: 4, color: colors.mutedForeground },
    subCard: { padding: 12, marginBottom: 8 },
    subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    pctText: { fontFamily: typography.sans.bold, fontSize: 15 },
    progressBg: { height: 6, width: '100%', backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: `${colors.cardBorder}80` },
    statBox: { alignItems: 'center', flex: 1 },
    statLabel: { fontFamily: typography.sans.medium, fontSize: 9, color: colors.mutedForeground },
    statVal: { fontFamily: typography.sans.bold, fontSize: 13, color: colors.foreground, marginTop: 1 },
    errorCard: { padding: spacing.xl, alignItems: 'center', justifyContent: 'center' },
    errorTitle: { fontFamily: typography.serif.bold, fontSize: 18, color: colors.foreground, marginBottom: 6 },
    errorDesc: { fontFamily: typography.sans.regular, fontSize: 13, color: colors.mutedForeground, textAlign: 'center', marginBottom: 16 },
    retryBtn: { minWidth: 120 },
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
  });

