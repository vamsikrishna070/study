import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Text, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Bell, ListChecks, BookOpen, Play, Flame, Clock, ArrowRight, CheckCircle2, XCircle, MapPin, UserCheck, KeyRound } from 'lucide-react-native';
import { getReminders } from '../../api/reminders';
import { getExams } from '../../api/exams';
import { getTasks } from '../../api/tasks';
import { getSubjects } from '../../api/subjects';
import { getStudyStats } from '../../api/studySessions';
import { getTodayAttendance, markAttendanceCode } from '../../api/portal';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const isTaskCompleted = (t) => {
  if (!t) return false;
  if (t.status === 'completed' || t.status === 'done') return true;
  if (t.isCompleted === true || t.isCompleted === 'true') return true;
  if (t.completed === true || t.completed === 'true') return true;
  return false;
};

const safeFormatDate = (dateVal, fallbackText = 'No date set') => {
  if (!dateVal) return fallbackText;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallbackText;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch (_) {
    return fallbackText;
  }
};

const safeFormatDateTime = (dateVal, fallbackText = 'Scheduled') => {
  if (!dateVal) return fallbackText;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return fallbackText;
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (_) {
    return fallbackText;
  }
};

const DashboardScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);
  const { user, logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    reminders: [],
    exams: [],
    tasks: [],
    subjects: [],
    studyStats: null,
    todayAttendance: null,
  });

  const [attendanceCode, setAttendanceCode] = useState('');
  const [submittingCode, setSubmittingCode] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState(null);

  const loadData = async () => {
    try {
      setError(null);
      const [reminders, exams, tasks, subjects, studyStats, attendanceRes] = await Promise.all([
        getReminders(),
        getExams(),
        getTasks(),
        getSubjects(),
        getStudyStats().catch(() => null),
        getTodayAttendance().catch(() => null),
      ]);
      setData({
        reminders: reminders.data || reminders || [],
        exams: exams.data || exams || [],
        tasks: tasks.data || tasks || [],
        subjects: subjects.data || subjects || [],
        studyStats: studyStats || null,
        todayAttendance: attendanceRes || null,
      });
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else if (e.request && !e.response) {
        setError('Unable to connect to server.');
      } else {
        setError('Failed to load dashboard data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

  const handleMarkCodeDashboard = async () => {
    if (!attendanceCode.trim() || submittingCode) return;
    setSubmittingCode(true);
    setCodeFeedback(null);
    try {
      const res = await markAttendanceCode(attendanceCode.trim().toUpperCase());
      if (res.success) {
        setCodeFeedback({
          type: 'success',
          text: res.message || '✓ Attendance marked successfully!',
        });
        setAttendanceCode('');
        loadData();
      } else {
        setCodeFeedback({
          type: 'error',
          text: res.message || 'The attendance code is invalid or has expired.',
        });
      }
    } catch (err) {
      setCodeFeedback({
        type: 'error',
        text: err.response?.data?.message || 'Failed to submit code. Please try again.',
      });
    } finally {
      setSubmittingCode(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const studyStats = data.studyStats;
  const todayStudyFormatted = studyStats?.today?.formatted || '0m';
  const streak = user?.currentStreak !== undefined && user?.currentStreak !== null
    ? user.currentStreak
    : (studyStats?.streak || 0);
  const recentSessions = studyStats?.recentSessions || [];
  const attendanceClasses = data.todayAttendance?.attendance || [];
  const dayOrder = data.todayAttendance?.dayOrder;

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeading
          eyebrow="Dashboard"
          title={`${getGreeting()}, ${user?.displayName || user?.officialName || user?.name || 'Student'}`}
          detail="Here is an overview of your academic progress."
        />

        <QueryState error={error} onRetry={loadData} label="Dashboard" />

        {!error && (
          <View style={styles.content}>

            <Card style={styles.studyHeroCard}>
              <View style={styles.studyHeroHeader}>
                <View style={styles.studyHeroBadge}>
                  <Clock size={14} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={styles.studyHeroBadgeText}>TODAY'S FOCUS</Text>
                </View>
                {streak > 0 && (
                  <View style={styles.streakBadge}>
                    <Flame size={14} color="#f97316" style={{ marginRight: 4 }} />
                    <Text style={styles.streakBadgeText}>{streak} day streak</Text>
                  </View>
                )}
              </View>

              <View style={styles.studyHeroMain}>
                <Text style={styles.studyHeroTime}>{todayStudyFormatted}</Text>
                <Text style={styles.studyHeroSubtitle}>
                  {studyStats?.today?.sessionsCount || 0} session{studyStats?.today?.sessionsCount !== 1 ? 's' : ''} logged today
                </Text>
              </View>

              <View style={styles.studyHeroActions}>
                <Button
                  onPress={() => navigation.navigate('StartSession')}
                  style={styles.startStudyBtn}
                  icon={<Play size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />}
                >
                  Start Studying
                </Button>
                <Button
                  variant="outline"
                  onPress={() => navigation.navigate('StudyHistory')}
                  style={styles.historyBtn}
                >
                  History
                </Button>
              </View>

              {recentSessions.length > 0 && (
                <View style={styles.recentSessionsBox}>
                  <Text style={styles.recentSessionsTitle}>Recent Focus</Text>
                  {recentSessions.slice(0, 2).map((s) => (
                    <View key={s._id || s.id || Math.random()} style={styles.recentSessionRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.recentSessionSubject} numberOfLines={1}>
                          {s.subject?.name || s.subjectName || 'General Study'}
                        </Text>
                        {Boolean(s.topic) && (
                          <Text style={styles.recentSessionTopic} numberOfLines={1}>
                            {s.topic}
                          </Text>
                        )}
                      </View>
                      <Text style={styles.recentSessionDuration}>
                        {s.durationMinutes || 0}m
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            <View style={styles.quickActions}>
              <Button style={styles.actionBtn} onPress={() => navigation.navigate('Tasks', { openCreate: true })}>+ Task</Button>
              <Button variant="outline" style={styles.actionBtn} onPress={() => navigation.navigate('Notes', { openCreate: true })}>+ Note</Button>
              <Button variant="outline" style={styles.actionBtn} onPress={() => navigation.navigate('Reminders', { openCreate: true })}>+ Reminder</Button>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={styles.sectionTitle}>Today's Attendance</Text>
                  {Boolean(dayOrder) && (
                    <View style={styles.dayOrderBadge}>
                      <Text style={styles.dayOrderText}>Day Order {dayOrder}</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  onPress={() => navigation.navigate('Attendance')}
                  style={styles.viewMoreBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewMoreText}>View All →</Text>
                </TouchableOpacity>
              </View>

              <Card style={styles.markCodeCard}>
                <View style={styles.markCodeHeader}>
                  <KeyRound size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.markCodeTitle}>Mark Attendance Code</Text>
                </View>
                <Text style={styles.markCodeSub}>Enter the Attendance Code announced during class</Text>
                <View style={styles.markCodeRow}>
                  <TextInput
                    value={attendanceCode}
                    onChangeText={(txt) => setAttendanceCode(txt.toUpperCase())}
                    placeholder="Enter the Attendance Code here"
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="characters"
                    maxLength={15}
                    editable={!submittingCode}
                    style={styles.markCodeInput}
                  />
                  <Button
                    onPress={handleMarkCodeDashboard}
                    loading={submittingCode}
                    disabled={!attendanceCode.trim() || submittingCode}
                    style={styles.markCodeSubmitBtn}
                  >
                    Submit
                  </Button>
                </View>

                {codeFeedback && (
                  <View
                    style={[
                      styles.feedbackBox,
                      codeFeedback.type === 'success' ? styles.feedbackSuccess : styles.feedbackError,
                    ]}
                  >
                    {codeFeedback.type === 'success' ? (
                      <CheckCircle2 size={14} color="#10B981" style={{ marginRight: 6 }} />
                    ) : (
                      <XCircle size={14} color="#EF4444" style={{ marginRight: 6 }} />
                    )}
                    <Text
                      style={[
                        styles.feedbackText,
                        { color: codeFeedback.type === 'success' ? '#10B981' : '#EF4444' },
                      ]}
                    >
                      {codeFeedback.text}
                    </Text>
                  </View>
                )}
              </Card>

              {attendanceClasses.length === 0 ? (
                <Card style={styles.card}>
                  <View style={styles.emptyAttendanceBox}>
                    <UserCheck size={24} color={colors.mutedForeground} style={{ marginBottom: 6 }} />
                    <Text style={styles.emptyAttendanceTitle}>No attendance records for today</Text>
                    <Text style={styles.emptyAttendanceSub}>Check back during class hours or view overall conduct.</Text>
                  </View>
                </Card>
              ) : (
                attendanceClasses.map((cls, idx) => {
                  const isPresent = cls?.status === 'PRESENT';
                  const isAbsent = cls?.status === 'ABSENT';
                  const isOdMl = cls?.status === 'OD/ML' || cls?.status === 'OD' || cls?.status === 'ML';

                  return (
                    <Card key={idx} style={styles.attendanceCard}>
                      <View style={styles.attendanceHeader}>
                        <View style={styles.hourBadge}>
                          <Text style={styles.hourText}>H{cls?.hour || idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={styles.subjectCode}>{cls?.subjectCode || 'COURSE'}</Text>
                          <Text style={styles.subjectName} numberOfLines={1}>
                            {cls?.subjectName || cls?.subjectCode || 'Class Session'}
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
                            {cls?.status || 'NOT MARKED'}
                          </Text>
                        </View>
                      </View>

                      {(cls?.startTime || cls?.endTime || cls?.room) && (
                        <View style={styles.attendanceMeta}>
                          {(cls?.startTime || cls?.endTime) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Clock size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                              <Text style={styles.metaText}>{cls?.startTime || ''}{cls?.endTime ? ` - ${cls.endTime}` : ''}</Text>
                            </View>
                          )}
                          {Boolean(cls?.room) && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 12 }}>
                              <MapPin size={12} color={colors.accent} style={{ marginRight: 4 }} />
                              <Text style={styles.metaText}>{cls.room}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </Card>
                  );
                })
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Today's Reminders</Text>
              {data.reminders.length === 0 ? (
                <EmptyState
                  icon={Bell}
                  title="All clear"
                  detail="You have no reminders scheduled for today."
                />
              ) : (
                data.reminders.map(r => (
                  <Card key={r._id || r.id || Math.random()} style={styles.card}>
                    <Text style={styles.cardTitle}>{r.title}</Text>
                    <Text style={styles.cardDetail}>
                      {safeFormatDateTime(r.remindAt || r.date || r.time || r.createdAt)}
                    </Text>
                  </Card>
                ))
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Tasks</Text>
              {(() => {
                const pendingTasks = (data.tasks || []).filter(t => !isTaskCompleted(t));
                if (pendingTasks.length === 0) {
                  return (
                    <EmptyState
                      icon={ListChecks}
                      title="No pending tasks"
                      detail="You are all caught up with your tasks."
                    />
                  );
                }
                return pendingTasks.map(t => (
                  <Card key={t._id || t.id || Math.random()} style={styles.card}>
                    <Text style={styles.cardTitle}>{t.title}</Text>
                    <Text style={styles.cardDetail}>
                      Due: {safeFormatDate(t.dueDate || t.date || t.createdAt)}
                    </Text>
                  </Card>
                ));
              })()}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Subjects & Progress</Text>
              {data.subjects.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No subjects"
                  detail="You haven't enrolled in any subjects yet."
                />
              ) : (
                data.subjects.map(s => (
                  <Card
                    key={s._id || Math.random()}
                    style={styles.card}
                    onPress={() => navigation.navigate('SubjectDetail', { id: s._id, subject: s })}
                  >
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    <Text style={styles.cardDetail}>Code: {s.code}</Text>
                  </Card>
                ))
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background
  },
  scroll: {
    padding: spacing.md,
    paddingBottom: 110,
  },
  content: {
    gap: spacing.xl,
  },
  studyHeroCard: {
    padding: spacing.lg,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    backgroundColor: colors.card,
  },
  studyHeroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  studyHeroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  studyHeroBadgeText: {
    fontFamily: typography.mono.bold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.accent,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f97316' + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.round,
  },
  streakBadgeText: {
    fontFamily: typography.sans.bold,
    fontSize: 11,
    color: '#f97316',
  },
  studyHeroMain: {
    marginVertical: spacing.xs,
  },
  studyHeroTime: {
    fontFamily: typography.serif.medium,
    fontSize: 36,
    color: colors.foreground,
  },
  studyHeroSubtitle: {
    fontFamily: typography.sans.regular,
    fontSize: 13,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  studyHeroActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  startStudyBtn: {
    flex: 2,
  },
  historyBtn: {
    flex: 1,
  },
  recentSessionsBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    gap: spacing.xs,
  },
  recentSessionsTitle: {
    fontFamily: typography.mono.regular,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: colors.mutedForeground,
    marginBottom: 4,
  },
  recentSessionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  recentSessionSubject: {
    fontFamily: typography.sans.semiBold,
    fontSize: 13,
    color: colors.foreground,
  },
  recentSessionTopic: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  recentSessionDuration: {
    fontFamily: typography.mono.medium,
    fontSize: 12,
    color: colors.accent,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actionBtn: {
    flex: 1,
    minWidth: '30%',
  },
  section: {
    gap: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  sectionTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
  },
  dayOrderBadge: {
    backgroundColor: colors.accent + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  dayOrderText: {
    fontFamily: typography.mono.bold,
    fontSize: 10,
    color: colors.accent,
  },
  viewMoreBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  viewMoreText: {
    fontFamily: typography.sans.semiBold,
    fontSize: 13,
    color: colors.accent,
  },

  markCodeCard: {
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderRadius: radii.lg,
  },
  markCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markCodeTitle: {
    fontFamily: typography.sans.bold,
    fontSize: 14,
    color: colors.foreground,
  },
  markCodeSub: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
    marginBottom: spacing.sm,
  },
  markCodeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
  },
  markCodeInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    fontFamily: typography.sans.bold,
    fontSize: 13,
    color: colors.foreground,
  },
  markCodeSubmitBtn: {
    width: 85,
    height: 40,
  },
  feedbackBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 8,
    borderRadius: radii.md
  },
  feedbackSuccess: { backgroundColor: '#10B9811A' },
  feedbackError: { backgroundColor: '#EF44441A' },
  feedbackText: { fontFamily: typography.sans.medium, fontSize: 12 },

  attendanceCard: {
    marginBottom: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  attendanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hourBadge: {
    backgroundColor: colors.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
  },
  hourText: {
    fontFamily: typography.mono.bold,
    fontSize: 12,
    color: colors.foreground,
  },
  subjectCode: {
    fontFamily: typography.mono.bold,
    fontSize: 11,
    color: colors.accent,
    textTransform: 'uppercase',
  },
  subjectName: {
    fontFamily: typography.sans.semiBold,
    fontSize: 14,
    color: colors.foreground,
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    backgroundColor: colors.cardBorder,
  },
  statusPresent: {
    backgroundColor: '#10B98120',
  },
  statusAbsent: {
    backgroundColor: '#EF444420',
  },
  statusOdMl: {
    backgroundColor: '#8B5CF620',
  },
  statusText: {
    fontFamily: typography.mono.bold,
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  attendanceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder + '60',
  },
  metaText: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  emptyAttendanceBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  emptyAttendanceTitle: {
    fontFamily: typography.sans.semiBold,
    fontSize: 14,
    color: colors.foreground,
    marginTop: 2,
  },
  emptyAttendanceSub: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 2,
  },
  card: {
    marginBottom: spacing.sm,
    padding: spacing.md,
  },
  cardTitle: {
    fontFamily: typography.sans.bold,
    fontSize: 16,
    color: colors.foreground,
  },
  cardDetail: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: 4,
  }
});

export default DashboardScreen;
