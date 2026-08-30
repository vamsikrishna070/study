import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { BookOpen, AlertTriangle, ArrowLeft } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { getPortalStatus } from '../../api/portal';

const PortalAttendanceScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPortalStatus();
        setData(res);
      } catch (err) {
        console.error('[PortalAttendanceScreen] Error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const attendanceList = data?.attendance || [];
  let totalClasses = 0;
  let totalPresent = 0;
  attendanceList.forEach((item) => {
    totalClasses += Number(item.classes_conducted) || 0;
    totalPresent += Number(item.present) || 0;
  });
  const overallPercentage = totalClasses > 0 ? ((totalPresent / totalClasses) * 100).toFixed(1) : '0.0';

  const lowAttendance = attendanceList.filter((i) => parseFloat(i.attendance_percentage || '0') < 75);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={16} color={colors.accent} />
        <Text style={styles.backBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Subject Attendance</Text>

      {/* Warning */}
      {lowAttendance.length > 0 && (
        <View style={styles.warningBox}>
          <AlertTriangle size={16} color="#f59e0b" />
          <Text style={styles.warningText}>
            Warning: {lowAttendance.length} Subject(s) have attendance below 75%.
          </Text>
        </View>
      )}

      {/* Metric summary */}
      <View style={styles.metricCard}>
        <Text style={styles.metricLabel}>ENROLLED SUBJECTS</Text>
        <Text style={styles.metricValue}>{attendanceList.length}</Text>
        <Text style={styles.metricSub}>Active course modules</Text>
      </View>

      <Text style={styles.sectionTitle}>SUBJECT LOG</Text>

      <View style={styles.listStack}>
        {attendanceList.map((item, idx) => {
          const pct = parseFloat(item.attendance_percentage || '0');
          const isLow = pct < 75;

          return (
            <View key={idx} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeText}>{item.subject_code}</Text>
                  <Text style={styles.nameText} numberOfLines={1}>{item.subject_name}</Text>
                </View>
                <View style={[styles.badge, isLow ? styles.badgeLow : styles.badgeGood]}>
                  <Text style={[styles.badgeText, isLow ? styles.badgeTextLow : styles.badgeTextGood]}>
                    {item.attendance_percentage}%
                  </Text>
                </View>
              </View>

              {/* Progress */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.min(pct, 100)}%`, backgroundColor: isLow ? '#f59e0b' : '#10b981' },
                  ]}
                />
              </View>

              <View style={styles.statsGrid}>
                <View style={styles.statCol}>
                  <Text style={styles.statVal}>{item.classes_conducted}</Text>
                  <Text style={styles.statLbl}>Conducted</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, { color: '#10b981' }]}>{item.present}</Text>
                  <Text style={styles.statLbl}>Present</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, { color: '#ef4444' }]}>{item.absent}</Text>
                  <Text style={styles.statLbl}>Absent</Text>
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statVal, { color: '#a855f7' }]}>{item.od_ml_taken || '0'}</Text>
                  <Text style={styles.statLbl}>OD / ML</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>
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
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: spacing.xs,
    },
    backBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.accent,
    },
    title: {
      fontFamily: typography.serif.bold,
      fontSize: 24,
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    warningBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
      borderRadius: radii.md,
      padding: spacing.sm,
      marginBottom: spacing.md,
    },
    warningText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: '#f59e0b',
      flex: 1,
    },
    metricCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    metricLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 9,
      letterSpacing: 1,
      color: colors.mutedForeground,
    },
    metricValue: {
      fontFamily: typography.sans.bold,
      fontSize: 28,
      color: colors.foreground,
      marginVertical: 2,
    },
    metricSub: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    sectionTitle: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      letterSpacing: 1.5,
      color: colors.mutedForeground,
      marginBottom: spacing.sm,
    },
    listStack: {
      gap: spacing.sm,
    },
    itemCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    itemHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    codeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.accent,
    },
    nameText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 2,
      borderRadius: 12,
    },
    badgeGood: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
    },
    badgeLow: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    badgeTextGood: {
      color: '#10b981',
    },
    badgeTextLow: {
      color: '#f59e0b',
    },
    badgeText: {
      fontFamily: typography.sans.bold,
      fontSize: 11,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: colors.muted,
      borderRadius: 3,
      overflow: 'hidden',
      marginVertical: spacing.xs,
    },
    progressBarFill: {
      height: '100%',
      borderRadius: 3,
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    statCol: {
      alignItems: 'center',
    },
    statVal: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
    },
    statLbl: {
      fontFamily: typography.sans.regular,
      fontSize: 9,
      color: colors.mutedForeground,
    },
  });

export default PortalAttendanceScreen;
