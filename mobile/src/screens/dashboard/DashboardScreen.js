import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { Bell, ListChecks, BookOpen, Play, Flame, Clock, ArrowRight, Sparkles } from 'lucide-react-native';
import { getReminders } from '../../api/reminders';
import { getExams } from '../../api/exams';
import { getTasks } from '../../api/tasks';
import { getSubjects } from '../../api/subjects';
import { getStudyStats } from '../../api/studySessions';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

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
  });

  const loadData = async () => {
    try {
      setError(null);
      const [reminders, exams, tasks, subjects, studyStats] = await Promise.all([
        getReminders(),
        getExams(),
        getTasks(),
        getSubjects(),
        getStudyStats().catch(() => null),
      ]);
      setData({ 
        reminders: reminders.data || reminders || [], 
        exams: exams.data || exams || [], 
        tasks: tasks.data || tasks || [], 
        subjects: subjects.data || subjects || [], 
        studyStats: studyStats || null,
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

  useEffect(() => { loadData(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

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
  const streak = studyStats?.streak || 0;
  const recentSessions = studyStats?.recentSessions || [];

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />} 
        contentContainerStyle={styles.scroll}
      >
        <PageHeading 
          eyebrow="Dashboard" 
          title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'Student'}`} 
          detail="Here is an overview of your academic progress."
        />

        <QueryState error={error} onRetry={loadData} label="Dashboard" />

        {!error && (
          <View style={styles.content}>
            {/* Study Session Hero Card */}
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

            {/* Quick Actions */}
            <View style={styles.quickActions}>
              <Button style={styles.actionBtn} onPress={() => navigation.navigate('Tasks', { openCreate: true })}>+ Task</Button>
              <Button variant="outline" style={styles.actionBtn} onPress={() => navigation.navigate('Notes', { openCreate: true })}>+ Note</Button>
              <Button variant="outline" style={styles.actionBtn} onPress={() => navigation.navigate('Reminders', { openCreate: true })}>+ Reminder</Button>
            </View>

            {/* Today's Reminders */}
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
                  <Card key={r._id || Math.random()} style={styles.card}>
                    <Text style={styles.cardTitle}>{r.title}</Text>
                    <Text style={styles.cardDetail}>{new Date(r.date).toLocaleString()}</Text>
                  </Card>
                ))
              )}
            </View>

            {/* Pending Tasks */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pending Tasks</Text>
              {data.tasks.length === 0 ? (
                <EmptyState 
                  icon={ListChecks} 
                  title="No pending tasks" 
                  detail="You are all caught up with your tasks." 
                />
              ) : (
                data.tasks.filter(t => !t.completed).map(t => (
                  <Card key={t._id || Math.random()} style={styles.card}>
                    <Text style={styles.cardTitle}>{t.title}</Text>
                    <Text style={styles.cardDetail}>Due: {new Date(t.dueDate).toLocaleDateString()}</Text>
                  </Card>
                ))
              )}
            </View>

            {/* Subjects & Progress */}
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
    paddingBottom: spacing.xxl 
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
  sectionTitle: { 
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
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
