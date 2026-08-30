import React, { useState, useEffect, useCallback } from 'react';
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
  Alert,
} from 'react-native';
import {
  BookOpen,
  Calendar,
  Clock,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { QueryState } from '../../components/ui/QueryState';
import { getTodayAttendance, markAttendanceCode } from '../../api/portal';
import { getUserFriendlyError } from '../../utils/errorUtils';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function AttendanceScreen({ navigation }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', text: '' }

  const loadData = useCallback(async () => {
    try {
      setFeedback(null);
      const res = await getTodayAttendance();
      setData(res);
    } catch (err) {
      console.error('[AttendanceScreen] Error loading attendance:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleMarkCode = async () => {
    if (!code.trim() || submitting) return;

    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await markAttendanceCode(code.trim().toUpperCase());
      if (res.success) {
        setFeedback({
          type: 'success',
          text: res.message || '✓ Attendance marked successfully!',
        });
        setCode('');
        loadData();
      } else {
        setFeedback({
          type: 'error',
          text: res.message || 'The attendance code is invalid or has expired.',
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: getUserFriendlyError(err, 'portal_connect'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const dayOrder = data?.dayOrder;
  const classes = data?.attendance || [];
  const subjectStats = data?.subjectStats || [];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <PageHeading
          eyebrow="SRM AP Portal"
          title="Attendance & Conduct"
          detail="Today's conduct hours and online code submission."
        />

        {/* Mark Attendance Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Text style={styles.cardTitle}>Mark Attendance Code</Text>
              <Text style={styles.cardSub}>Enter 6-digit code announced during class</Text>
            </View>
            {dayOrder && (
              <View style={styles.dayOrderBadge}>
                <Text style={styles.dayOrderText}>Day Order {dayOrder}</Text>
              </View>
            )}
          </View>

          <View style={styles.codeForm}>
            <TextInput
              value={code}
              onChangeText={(text) => setCode(text.toUpperCase())}
              placeholder="E.g. A123456"
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
              disabled={!code.trim() || submitting}
              style={styles.submitBtn}
            >
              Submit
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

        {/* Scheduled Conduct Hours */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Classes ({classes.length})</Text>
        </View>

        {classes.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>No attendance has been marked yet today.</Text>
          </Card>
        ) : (
          classes.map((cls, idx) => {
            if (!cls) return null;
            return (
              <Card key={idx} style={styles.classCard}>
                <View style={styles.classHeader}>
                  <View style={styles.hourBadge}>
                    <Text style={styles.hourText}>H{cls?.hour || idx + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.subjectCode}>{cls?.subjectCode || 'CLASS'}</Text>
                    <Text style={styles.subjectName}>{cls?.subjectName || cls?.subjectCode || 'Course Session'}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      cls?.status === 'PRESENT' && styles.statusPresent,
                      cls?.status === 'ABSENT' && styles.statusAbsent,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        cls?.status === 'PRESENT' && { color: '#10B981' },
                        cls?.status === 'ABSENT' && { color: '#EF4444' },
                      ]}
                    >
                      {cls?.status || 'NOT MARKED'}
                    </Text>
                  </View>
                </View>

                {(cls?.startTime || cls?.endTime) && (
                  <View style={styles.classMeta}>
                    <Clock size={13} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                    <Text style={styles.metaText}>{cls?.startTime || ''}{cls?.endTime ? ` - ${cls.endTime}` : ''}</Text>
                    {!!cls?.room && <Text style={styles.metaDot}>•</Text>}
                    {!!cls?.room && <Text style={styles.metaText}>{cls.room}</Text>}
                  </View>
                )}
              </Card>
            );
          })
        )}

        {/* Subject Wise Summary */}
        {subjectStats.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 24 }]}>
              <Text style={styles.sectionTitle}>Subject Wise Percentage</Text>
            </View>

            {subjectStats.map((sub, idx) => (
              <Card key={idx} style={styles.subCard}>
                <View style={styles.subHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjectCode}>{sub.subjectCode}</Text>
                    <Text style={styles.subjectName}>{sub.subjectName}</Text>
                  </View>
                  <Text
                    style={[
                      styles.pctText,
                      sub.percentage < 75 ? { color: '#F59E0B' } : { color: '#10B981' },
                    ]}
                  >
                    {sub.percentage}%
                  </Text>
                </View>

                <View style={styles.progressBg}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(sub.percentage, 100)}%` },
                      sub.percentage < 75 ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#10B981' },
                    ]}
                  />
                </View>

                <View style={styles.statsRow}>
                  <Text style={styles.statLabel}>Present: {sub.present}</Text>
                  <Text style={styles.statLabel}>Absent: {sub.absent}</Text>
                  <Text style={styles.statLabel}>Total: {sub.conducted}</Text>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.lg, paddingBottom: 40 },
    card: { padding: spacing.lg, marginBottom: spacing.lg },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    cardHeaderLeft: { flex: 1 },
    cardTitle: { fontFamily: typography.sans.bold, fontSize: 16, color: colors.foreground },
    cardSub: { fontFamily: typography.sans.regular, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
    dayOrderBadge: { backgroundColor: `${colors.accent}1F`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.md },
    dayOrderText: { fontFamily: typography.sans.bold, fontSize: 11, color: colors.accent },
    codeForm: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    codeInput: {
      flex: 1,
      height: 44,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    submitBtn: { width: 95, height: 44 },
    feedbackBox: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 10, borderRadius: radii.md },
    feedbackSuccess: { backgroundColor: '#10B9811A' },
    feedbackError: { backgroundColor: '#EF44441A' },
    feedbackText: { fontFamily: typography.sans.medium, fontSize: 12 },
    sectionHeader: { marginBottom: 10 },
    sectionTitle: { fontFamily: typography.sans.bold, fontSize: 14, color: colors.mutedForeground, textTransform: 'uppercase', letterSpacing: 0.5 },
    emptyCard: { padding: 20, alignItems: 'center' },
    emptyText: { fontFamily: typography.sans.regular, fontSize: 13, color: colors.mutedForeground },
    classCard: { padding: 14, marginBottom: 10 },
    classHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    hourBadge: { width: 34, height: 34, borderRadius: 8, backgroundColor: `${colors.primary}1A`, alignItems: 'center', justifyContent: 'center' },
    hourText: { fontFamily: typography.sans.bold, fontSize: 12, color: colors.primary },
    subjectCode: { fontFamily: typography.sans.bold, fontSize: 11, color: colors.accent, textTransform: 'uppercase' },
    subjectName: { fontFamily: typography.sans.bold, fontSize: 14, color: colors.foreground },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: colors.muted },
    statusPresent: { backgroundColor: '#10B9811F' },
    statusAbsent: { backgroundColor: '#EF44441F' },
    statusText: { fontFamily: typography.sans.bold, fontSize: 10, color: colors.mutedForeground },
    classMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${colors.cardBorder}80` },
    metaText: { fontFamily: typography.sans.regular, fontSize: 12, color: colors.mutedForeground },
    metaDot: { marginHorizontal: 6, color: colors.mutedForeground },
    subCard: { padding: 14, marginBottom: 10 },
    subHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    pctText: { fontFamily: typography.sans.bold, fontSize: 16 },
    progressBg: { height: 6, width: '100%', backgroundColor: colors.muted, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    statLabel: { fontFamily: typography.sans.medium, fontSize: 11, color: colors.mutedForeground },
  });
