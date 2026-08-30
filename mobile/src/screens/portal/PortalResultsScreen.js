import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { getPortalStatus } from '../../api/portal';

const PortalResultsScreen = ({ navigation }) => {
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
        console.error('[PortalResultsScreen] Error:', err);
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

  const results = data?.results || [];
  const cgpa = data?.cgpa?.cgpa || '0.00';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <ArrowLeft size={16} color={colors.accent} />
        <Text style={styles.backBtnText}>Back to Dashboard</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Semester Results</Text>

      {/* CGPA Summary */}
      <View style={styles.cgpaCard}>
        <Text style={styles.cgpaLabel}>CUMULATIVE GPA</Text>
        <Text style={styles.cgpaVal}>{cgpa}</Text>
      </View>

      <Text style={styles.sectionTitle}>GRADE SHEET LEDGER</Text>

      <View style={styles.stack}>
        {results.length === 0 ? (
          <Text style={styles.emptyText}>No semester grade ledger found.</Text>
        ) : (
          results.map((row, idx) => {
            const isPass = /PASS|P/i.test(row.result);
            return (
              <View key={idx} style={styles.resultCard}>
                <View style={styles.rowHeader}>
                  <Text style={styles.codeText}>{row.subject_code}</Text>
                  <View style={[styles.passBadge, !isPass && styles.failBadge]}>
                    <Text style={[styles.passText, !isPass && styles.failText]}>{row.result}</Text>
                  </View>
                </View>
                <Text style={styles.nameText}>{row.subject_description}</Text>

                <View style={styles.detailsRow}>
                  <Text style={styles.detailText}>Sem: {row.semester}</Text>
                  <Text style={styles.detailText}>Credits: {row.credit}</Text>
                  <Text style={[styles.detailText, styles.gradeText]}>Grade: {row.grade}</Text>
                </View>
              </View>
            );
          })
        )}
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
    cgpaCard: {
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 1,
      borderColor: 'rgba(245, 158, 11, 0.3)',
      borderRadius: radii.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    cgpaLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 9,
      letterSpacing: 1,
      color: '#f59e0b',
    },
    cgpaVal: {
      fontFamily: typography.sans.bold,
      fontSize: 32,
      color: '#f59e0b',
      marginTop: 2,
    },
    sectionTitle: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      letterSpacing: 1.5,
      color: colors.mutedForeground,
      marginBottom: spacing.sm,
    },
    stack: {
      gap: spacing.sm,
    },
    emptyText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginVertical: spacing.xl,
    },
    resultCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    rowHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    codeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.accent,
    },
    passBadge: {
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: 10,
    },
    failBadge: {
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    passText: {
      fontFamily: typography.sans.bold,
      fontSize: 10,
      color: '#10b981',
    },
    failText: {
      color: '#ef4444',
    },
    nameText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
      marginVertical: 4,
    },
    detailsRow: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: 4,
      paddingTop: 4,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    detailText: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    gradeText: {
      fontFamily: typography.sans.bold,
      color: '#f59e0b',
    },
  });

export default PortalResultsScreen;
