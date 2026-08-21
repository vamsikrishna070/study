import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, ActivityIndicator } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import { getProgress } from '../../api/progress';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { QueryState } from '../../components/ui/QueryState';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const ProgressScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);
  const { logout } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadProgress = async () => {
    try {
      setError(null);
      const res = await getProgress();
      setData(res.data || res);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else if (e.request && !e.response) {
        setError('Unable to connect to server.');
      } else {
        setError('Failed to load progress.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadProgress(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadProgress(); }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        <PageHeading 
          eyebrow="The long view" 
          title="Progress" 
          detail="Patterns over time, so effort becomes something you can see."
        />
        
        <QueryState error={error} onRetry={loadProgress} label="Progress" />
        
        {data && !error && (
          <View style={styles.content}>
            <View style={styles.metricsGrid}>
              <View style={[styles.metricCard, { backgroundColor: colors.primary }]}>
                <Text style={[styles.metricEyebrow, { color: colors.primaryForeground, opacity: 0.65 }]}>Overall command</Text>
                <Text style={[styles.metricValue, { color: colors.accent }]}>{data.overall}%</Text>
                <Text style={[styles.metricDetail, { color: colors.primaryForeground, opacity: 0.6 }]}>semester progress</Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                <Text style={styles.metricEyebrow}>Topics completed</Text>
                <Text style={[styles.metricValue, { color: colors.foreground }]}>{data.completedTopics?.reduce((sum,t)=>sum+t.completed,0) || 0}</Text>
                <Text style={styles.metricDetail}>across your subjects</Text>
              </View>
              
              <View style={[styles.metricCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 }]}>
                <Text style={styles.metricEyebrow}>This week</Text>
                <Text style={[styles.metricValue, { color: colors.foreground }]}>
                  {data.weeklyHours?.reduce((sum,p)=>sum+p.value,0).toFixed(1)}
                  <Text style={{ fontSize: 24 }}>h</Text>
                </Text>
                <Text style={styles.metricDetail}>focused study time</Text>
              </View>
            </View>

            <View style={styles.subjectSection}>
              <Text style={styles.sectionEyebrow}>Subject by subject</Text>
              <Text style={styles.sectionTitle}>Where your attention is landing</Text>
              
              <View style={styles.subjectList}>
                {data.subjectProgress?.map(s => (
                  <View key={s.subject} style={styles.subjectItem}>
                    <View style={styles.subjectHeader}>
                      <Text style={styles.subjectName}>{s.subject}</Text>
                      <Text style={styles.subjectPercent}>{s.progress}%</Text>
                    </View>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${s.progress}%` }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  content: { gap: spacing.xl, marginTop: spacing.md },
  metricsGrid: { gap: spacing.md },
  metricCard: {
    padding: spacing.xl,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricEyebrow: {
    fontFamily: typography.mono.regular,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.mutedForeground,
  },
  metricValue: {
    fontFamily: typography.serif.medium,
    fontSize: 40,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  metricDetail: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  subjectSection: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.xl,
  },
  sectionEyebrow: {
    fontFamily: typography.mono.regular,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.accent,
    marginBottom: 4,
  },
  sectionTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    marginBottom: spacing.xl,
  },
  subjectList: {
    gap: spacing.lg,
  },
  subjectItem: {
    width: '100%',
  },
  subjectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  subjectName: {
    fontFamily: typography.sans.semiBold,
    fontSize: 14,
    color: colors.foreground,
  },
  subjectPercent: {
    fontFamily: typography.mono.regular,
    fontSize: 12,
    color: colors.mutedForeground,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.muted,
    borderRadius: radii.round,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.round,
  }
});export default ProgressScreen;
