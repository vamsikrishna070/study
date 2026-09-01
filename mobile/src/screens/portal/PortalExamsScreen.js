import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { ArrowLeft, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { getPortalStatus, syncPortalData } from '../../api/portal';
import { getUserFriendlyError } from '../../utils/errorUtils';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

const PortalExamsScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await getPortalStatus();
      setData(res);
    } catch (err) {
      console.error('[PortalExamsScreen] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSyncNow = async () => {
    try {
      setSyncing(true);
      await syncPortalData();
      Alert.alert('Synced', 'Official SRM marks synchronized successfully.');
      loadStatus();
    } catch (err) {
      Alert.alert('Sync Failed', getUserFriendlyError(err, 'portal_sync'));
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const exams = data?.exams || [];
  const lastSynced = data?.lastSuccessfulSync
    ? new Date(data.lastSuccessfulSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Not synced';

  const syncButton = (
    <TouchableOpacity style={styles.syncBtn} onPress={handleSyncNow} disabled={syncing}>
      <RefreshCw size={12} color={colors.accentForeground} />
      <Text style={styles.syncBtnText}>{syncing ? 'Syncing...' : 'Sync'}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScreenHeader title="Exams & Performance" rightElement={syncButton} />
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: spacing.md,
            paddingBottom: Math.max(insets.bottom, 20) + 100,
          }
        ]}
      >
        <Text style={styles.title}>Exams & Assessment Marks</Text>

      <View style={styles.stack}>
        {exams.length === 0 ? (
          <Text style={styles.emptyText}>Marks are not available yet from the SRM AP Student Portal.</Text>
        ) : (
          exams.map((exam, idx) => {
            const isPublished = exam.published && exam.marks_obtained !== null && exam.marks_obtained !== undefined;
            const components = exam.components || exam.assessments || [];

            return (
              <View key={idx} style={styles.examCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.codeText}>{exam.subject_code}</Text>
                  <View style={styles.verifiedTag}>
                    <ShieldCheck size={12} color="#10b981" />
                    <Text style={styles.verifiedText}>Official SRM Data</Text>
                  </View>
                </View>

                <Text style={styles.nameText}>{exam.subject_name}</Text>

                <View style={styles.boxOfficial}>
                  <View style={styles.officialHeader}>
                    <Text style={styles.boxLabel}>OFFICIAL SRM MARKS</Text>
                    <Text style={styles.syncTime}>Synced: {lastSynced}</Text>
                  </View>

                  {isPublished ? (
                    <Text style={styles.officialVal}>
                      {exam.marks_obtained} {exam.max_marks ? `/ ${exam.max_marks}` : ''}
                    </Text>
                  ) : (
                    <Text style={styles.unpubText}>Marks not published by SRM yet.</Text>
                  )}

                  {components.length > 0 && (
                    <View style={styles.compBox}>
                      <Text style={styles.compTitle}>COMPONENT BREAKDOWN</Text>
                      {components.map((c, cIdx) => (
                        <View key={cIdx} style={styles.compRow}>
                          <Text style={styles.compName}>{c.name}</Text>
                          <Text style={styles.compScore}>
                            {c.conductedObtained ? `${c.conductedObtained}/${c.conductedMax || ''}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
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
    scrollContent: {
      padding: spacing.md,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    topHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    backBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.accent,
    },
    syncBtn: {
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
    syncBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: '#ffffff',
    },
    title: {
      fontFamily: typography.serif.bold,
      fontSize: 24,
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    stack: {
      gap: spacing.md,
    },
    emptyText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginVertical: spacing.xl,
    },
    examCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    codeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.accent,
    },
    verifiedTag: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    verifiedText: {
      fontFamily: typography.sans.bold,
      fontSize: 10,
      color: '#10b981',
    },
    nameText: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
      marginVertical: 4,
    },
    boxOfficial: {
      backgroundColor: colors.background,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginTop: spacing.xs,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    officialHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    boxLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 8,
      color: colors.mutedForeground,
      letterSpacing: 1,
    },
    syncTime: {
      fontFamily: typography.mono.regular,
      fontSize: 8,
      color: colors.mutedForeground,
    },
    officialVal: {
      fontFamily: typography.sans.bold,
      fontSize: 22,
      color: colors.foreground,
      marginTop: 2,
    },
    unpubText: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: '#f59e0b',
      marginTop: 2,
    },
    compBox: {
      marginTop: spacing.xs,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    compTitle: {
      fontFamily: typography.mono.regular,
      fontSize: 8,
      color: colors.mutedForeground,
    },
    compRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    compName: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.foreground,
    },
    compScore: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      color: colors.accent,
    },
  });

export default PortalExamsScreen;
