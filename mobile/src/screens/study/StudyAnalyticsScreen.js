import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  BarChart3,
  Flame,
  Clock,
  BookOpen,
  Trophy,
  Calendar,
  Sparkles,
  Play,
  TrendingUp,
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { getStudyStats } from '../../api/studySessions';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function StudyAnalyticsScreen({ navigation }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadStats = useCallback(async () => {
    try {
      setError(null);
      const data = await getStudyStats();
      setStats(data);
    } catch (err) {
      console.error('[StudyAnalytics] Error fetching stats:', err);
      setError('Unable to load study analytics. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };

  const hasData = stats && stats.total?.minutes > 0;
  const maxWeeklyHours = Math.max(
    1,
    ...(stats?.weeklyChart?.map((d) => d.hours) || [1])
  );

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scroll}
      >
        <PageHeading
          eyebrow="Time & Focus"
          title="Study Analytics"
          detail="Clear, data-backed visibility into your study habits, streaks, and subject balance."
          action={
            <Button onPress={() => navigation.navigate('StartSession')}>
              <Play size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
              Start Session
            </Button>
          }
        />

        <QueryState error={error} onRetry={loadStats} label="Analytics" />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : !hasData ? (
          <EmptyState
            icon={BarChart3}
            title="No study data yet"
            detail="Start your first study session to see your progress here."
            action={
              <Button onPress={() => navigation.navigate('StartSession')}>
                <Play size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                Start Studying
              </Button>
            }
          />
        ) : (
          <View style={styles.content}>
            {/* Primary Metrics Grid */}
            <View style={styles.metricsGrid}>
              {/* Today */}
              <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
                <Text style={styles.metricEyebrow}>Today</Text>
                <Text style={styles.metricValue}>{stats.today?.formatted || '0m'}</Text>
                <Text style={styles.metricDetail}>
                  {stats.today?.sessionsCount || 0} session
                  {stats.today?.sessionsCount !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* Streak */}
              <View style={[styles.metricCard, { backgroundColor: colors.primary }]}>
                <View style={styles.streakBadge}>
                  <Flame size={14} color="#f97316" style={{ marginRight: 4 }} />
                  <Text style={styles.streakBadgeText}>Active Streak</Text>
                </View>
                <Text style={[styles.metricValue, { color: colors.primaryForeground }]}>
                  {stats.streak || 0}{' '}
                  <Text style={{ fontSize: 18 }}>day{stats.streak !== 1 ? 's' : ''}</Text>
                </Text>
                <Text style={[styles.metricDetail, { color: colors.primaryForeground, opacity: 0.7 }]}>
                  Consecutive focus
                </Text>
              </View>

              {/* This Week */}
              <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
                <Text style={styles.metricEyebrow}>This Week</Text>
                <Text style={styles.metricValue}>{stats.thisWeek?.formatted || '0m'}</Text>
                <Text style={styles.metricDetail}>
                  {stats.thisWeek?.sessionsCount || 0} session
                  {stats.thisWeek?.sessionsCount !== 1 ? 's' : ''}
                </Text>
              </View>

              {/* This Month */}
              <View style={[styles.metricCard, { backgroundColor: colors.card }]}>
                <Text style={styles.metricEyebrow}>This Month</Text>
                <Text style={styles.metricValue}>{stats.thisMonth?.formatted || '0m'}</Text>
                <Text style={styles.metricDetail}>
                  {stats.thisMonth?.sessionsCount || 0} session
                  {stats.thisMonth?.sessionsCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Weekly Daily Chart */}
            {stats.weeklyChart && stats.weeklyChart.length > 0 && (
              <Card style={styles.chartCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>7-Day Momentum</Text>
                  <Text style={styles.sectionTitle}>Daily Study Time</Text>
                </View>

                <View style={styles.chartBarsRow}>
                  {stats.weeklyChart.map((dayItem) => {
                    const heightPercent = Math.min(
                      100,
                      Math.max(10, Math.round((dayItem.hours / maxWeeklyHours) * 100))
                    );
                    const isToday =
                      dayItem.date === new Date().toISOString().split('T')[0];

                    return (
                      <View key={dayItem.date} style={styles.chartCol}>
                        <Text style={styles.chartValueLabel}>
                          {dayItem.minutes > 0 ? `${dayItem.hours}h` : ''}
                        </Text>
                        <View style={styles.barTrack}>
                          <View
                            style={[
                              styles.barFill,
                              {
                                height: `${dayItem.minutes > 0 ? heightPercent : 6}%`,
                                backgroundColor: isToday
                                  ? colors.accent
                                  : dayItem.minutes > 0
                                  ? colors.primary
                                  : colors.muted,
                              },
                            ]}
                          />
                        </View>
                        <Text
                          style={[
                            styles.chartDayLabel,
                            isToday && { color: colors.accent, fontFamily: typography.mono.bold },
                          ]}
                        >
                          {dayItem.day}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            )}

            {/* Highlights Card */}
            <Card style={styles.highlightsCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEyebrow}>Performance Overview</Text>
                <Text style={styles.sectionTitle}>Key Focus Indicators</Text>
              </View>

              <View style={styles.highlightRow}>
                <View style={styles.highlightItem}>
                  <Text style={styles.highlightLabel}>Average Session</Text>
                  <Text style={styles.highlightValue}>
                    {stats.averageDurationFormatted || '0m'}
                  </Text>
                </View>

                <View style={styles.highlightItem}>
                  <Text style={styles.highlightLabel}>Total Completed</Text>
                  <Text style={styles.highlightValue}>
                    {stats.total?.sessionsCount || 0} sessions
                  </Text>
                </View>
              </View>

              {stats.topSubject && (
                <View style={styles.topSubjectBox}>
                  <BookOpen size={16} color={colors.accent} style={{ marginRight: 8 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topSubjectTitle}>Top Subject: {stats.topSubject.name}</Text>
                    <Text style={styles.topSubjectDetail}>
                      {stats.topSubject.hours}h focused ({stats.topSubject.percentage}% of total study time)
                    </Text>
                  </View>
                </View>
              )}
            </Card>

            {/* Subject Distribution */}
            {stats.subjectDistribution && stats.subjectDistribution.length > 0 && (
              <Card style={styles.distributionCard}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionEyebrow}>Curriculum Balance</Text>
                  <Text style={styles.sectionTitle}>Subject Distribution</Text>
                </View>

                <View style={styles.distributionList}>
                  {stats.subjectDistribution.map((sub) => (
                    <View key={sub.name} style={styles.distItem}>
                      <View style={styles.distHeader}>
                        <Text style={styles.distName} numberOfLines={1}>
                          {sub.name}
                        </Text>
                        <Text style={styles.distValue}>
                          {sub.hours}h • {sub.percentage}%
                        </Text>
                      </View>
                      <View style={styles.distTrack}>
                        <View
                          style={[
                            styles.distFill,
                            {
                              width: `${Math.max(4, sub.percentage)}%`,
                              backgroundColor: sub.color || colors.accent,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </Card>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    center: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    content: {
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    metricsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    metricCard: {
      flex: 1,
      minWidth: '45%',
      padding: spacing.lg,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    streakBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    streakBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.primaryForeground,
    },
    metricEyebrow: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: colors.mutedForeground,
    },
    metricValue: {
      fontFamily: typography.serif.medium,
      fontSize: 26,
      color: colors.foreground,
      marginVertical: spacing.xs,
    },
    metricDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    chartCard: {
      padding: spacing.lg,
    },
    sectionHeader: {
      marginBottom: spacing.md,
    },
    sectionEyebrow: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 2,
      color: colors.accent,
      marginBottom: 2,
    },
    sectionTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
    },
    chartBarsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      height: 140,
      paddingTop: spacing.md,
    },
    chartCol: {
      flex: 1,
      alignItems: 'center',
      height: '100%',
      justifyContent: 'flex-end',
    },
    chartValueLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      color: colors.mutedForeground,
      marginBottom: 4,
    },
    barTrack: {
      width: 14,
      flex: 1,
      backgroundColor: colors.muted + '40',
      borderRadius: radii.round,
      justifyContent: 'flex-end',
      overflow: 'hidden',
    },
    barFill: {
      width: '100%',
      borderRadius: radii.round,
    },
    chartDayLabel: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 6,
    },
    highlightsCard: {
      padding: spacing.lg,
    },
    highlightRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    highlightItem: {
      flex: 1,
      backgroundColor: colors.muted + '30',
      padding: spacing.md,
      borderRadius: radii.lg,
    },
    highlightLabel: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    highlightValue: {
      fontFamily: typography.sans.bold,
      fontSize: 18,
      color: colors.foreground,
      marginTop: 4,
    },
    topSubjectBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent + '10',
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.accent + '30',
    },
    topSubjectTitle: {
      fontFamily: typography.sans.semiBold,
      fontSize: 14,
      color: colors.foreground,
    },
    topSubjectDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    distributionCard: {
      padding: spacing.lg,
    },
    distributionList: {
      gap: spacing.md,
    },
    distItem: {
      width: '100%',
    },
    distHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    distName: {
      fontFamily: typography.sans.semiBold,
      fontSize: 13,
      color: colors.foreground,
      flex: 1,
    },
    distValue: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    distTrack: {
      height: 8,
      backgroundColor: colors.muted,
      borderRadius: radii.round,
      overflow: 'hidden',
    },
    distFill: {
      height: '100%',
      borderRadius: radii.round,
    },
  });
