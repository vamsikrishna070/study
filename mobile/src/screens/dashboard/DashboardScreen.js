import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Text } from 'react-native';
import { Bell, ListChecks, BookOpen } from 'lucide-react-native';
import { getReminders } from '../../api/reminders';
import { getExams } from '../../api/exams';
import { getTasks } from '../../api/tasks';
import { getSubjects } from '../../api/subjects';
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
  const [data, setData] = useState({ reminders: [], exams: [], tasks: [], subjects: [] });

  const loadData = async () => {
    try {
      setError(null);
      const [reminders, exams, tasks, subjects] = await Promise.all([
        getReminders(),
        getExams(),
        getTasks(),
        getSubjects()
      ]);
      setData({ 
        reminders: reminders.data || reminders, 
        exams: exams.data || exams, 
        tasks: tasks.data || tasks, 
        subjects: subjects.data || subjects 
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
            <View style={styles.quickActions}>
              <Button style={styles.actionBtn} onPress={() => navigation.navigate('Tasks', { openCreate: true })}>+ Task</Button>
              <Button variant="outline" style={styles.actionBtn} onPress={() => navigation.navigate('Notes', { openCreate: true })}>+ Note</Button>
              <Button variant="outline" style={styles.actionBtn} onPress={() => navigation.navigate('Reminders', { openCreate: true })}>+ Reminder</Button>
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
                  <Card key={r._id || Math.random()} style={styles.card}>
                    <Text style={styles.cardTitle}>{r.title}</Text>
                    <Text style={styles.cardDetail}>{new Date(r.date).toLocaleString()}</Text>
                  </Card>
                ))
              )}
            </View>

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
});export default DashboardScreen;
