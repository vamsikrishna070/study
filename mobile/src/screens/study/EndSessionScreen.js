import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { 
  Sparkles, 
  Clock, 
  BookOpen, 
  Smile, 
  Meh, 
  Frown, 
  CheckSquare, 
  Save, 
  ChevronRight 
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { StudySessionContext } from '../../context/StudySessionContext';
import { createStudySession } from '../../api/studySessions';
import { updateTask } from '../../api/tasks';
import { useAppDialog } from '../../components/ui/AppDialog';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function EndSessionScreen({ navigation, route }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { discardSession } = useContext(StudySessionContext);
  const { showSuccess, showError } = useAppDialog();

  const summary = route.params?.sessionSummary || {};
  const [productivity, setProductivity] = useState('productive'); // 'productive' | 'average' | 'difficult'
  const [reflection, setReflection] = useState('');
  const [markTaskComplete, setMarkTaskComplete] = useState(Boolean(summary.taskId));
  const [saving, setSaving] = useState(false);

  const formatDetailedTime = (sec = 0) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remMins = mins % 60;
      return `${hrs} hr ${remMins} min`;
    }
    return `${mins} min ${remainingSec} sec`;
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        subjectId: summary.subjectId || null,
        subjectName: summary.subjectName || '',
        topic: summary.topic || '',
        taskId: summary.taskId || null,
        examId: summary.examId || null,
        sessionType: 'timer',
        status: 'completed',
        startedAt: summary.startedAt || new Date().toISOString(),
        endedAt: summary.endedAt || new Date().toISOString(),
        totalPausedMs: summary.totalPausedMs || 0,
        durationMinutes: summary.durationMinutes || Math.max(1, Math.round((summary.elapsedSeconds || 60) / 60)),
        productivity,
        goal: summary.goal || '',
        notes: reflection.trim(),
      };

      await createStudySession(payload);

      // If user opted to complete the linked task
      if (markTaskComplete && summary.taskId) {
        try {
          await updateTask(summary.taskId, { completed: true });
        } catch (err) {
          console.log('[EndSession] Task auto-complete error:', err);
        }
      }

      discardSession();
      showSuccess('Session Saved', 'Great work! Your study session has been logged to history.');
      navigation.replace('StudyHistory');
    } catch (err) {
      console.error('[EndSession] Save error:', err);
      showError('Save Failed', 'Failed to save your session. Please check your connection.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View style={styles.badge}>
              <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>Session Finished</Text>
            </View>
            <Text style={styles.title}>Great study block!</Text>
            <Text style={styles.subtitle}>
              Take a moment to review and reflect on what you accomplished.
            </Text>
          </View>

          {/* Time & Subject Summary Card */}
          <Card style={styles.summaryCard}>
            <View style={styles.statRow}>
              <View style={styles.statIconBox}>
                <Clock size={24} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.statLabel}>Total Focus Time</Text>
                <Text style={styles.statValue}>
                  {formatDetailedTime(summary.elapsedSeconds || 0)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <BookOpen size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.detailSubject} numberOfLines={1}>
                  {summary.subjectName || 'General Study'}
                </Text>
                {Boolean(summary.topic) && (
                  <Text style={styles.detailTopic} numberOfLines={1}>
                    {summary.topic}
                  </Text>
                )}
              </View>
            </View>
          </Card>

          {/* Productivity Rating */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How did the session go?</Text>
            <View style={styles.productivityGrid}>
              <TouchableOpacity
                style={[
                  styles.productivityCard,
                  productivity === 'productive' && styles.productivityCardActive,
                ]}
                onPress={() => setProductivity('productive')}
                activeOpacity={0.7}
              >
                <Smile
                  size={24}
                  color={productivity === 'productive' ? colors.accent : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.productivityLabel,
                    productivity === 'productive' && styles.productivityLabelActive,
                  ]}
                >
                  Productive
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.productivityCard,
                  productivity === 'average' && styles.productivityCardActive,
                ]}
                onPress={() => setProductivity('average')}
                activeOpacity={0.7}
              >
                <Meh
                  size={24}
                  color={productivity === 'average' ? colors.accent : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.productivityLabel,
                    productivity === 'average' && styles.productivityLabelActive,
                  ]}
                >
                  Average
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.productivityCard,
                  productivity === 'difficult' && styles.productivityCardActive,
                ]}
                onPress={() => setProductivity('difficult')}
                activeOpacity={0.7}
              >
                <Frown
                  size={24}
                  color={productivity === 'difficult' ? colors.accent : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.productivityLabel,
                    productivity === 'difficult' && styles.productivityLabelActive,
                  ]}
                >
                  Difficult
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Optional Reflection */}
          <Field label="What did you accomplish? (Optional)">
            <Input
              value={reflection}
              onChangeText={setReflection}
              placeholder="Add session reflection or notes"
              multiline
              numberOfLines={3}
              style={{ minHeight: 80, alignItems: 'flex-start' }}
              textAlignVertical="top"
            />
          </Field>

          {/* Linked Task Completion Option */}
          {Boolean(summary.taskId) && (
            <View style={styles.taskToggleRow}>
              <View style={{ flex: 1, marginRight: spacing.md }}>
                <Text style={styles.taskToggleTitle}>Mark Linked Task as Done</Text>
                <Text style={styles.taskToggleSubtitle}>Complete task from your study list</Text>
              </View>
              <Switch
                value={markTaskComplete}
                onValueChange={setMarkTaskComplete}
                trackColor={{ false: colors.muted, true: colors.accent }}
              />
            </View>
          )}

          {/* Save Action */}
          <View style={styles.actionWrapper}>
            <Button
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={styles.saveBtn}
              icon={<Save size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />}
            >
              Save Session
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
      gap: spacing.xl,
    },
    header: {
      alignItems: 'center',
      marginTop: spacing.sm,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.accent,
      borderWidth: 1,
      borderRadius: radii.round,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      marginBottom: spacing.md,
    },
    badgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    title: {
      fontFamily: typography.serif.medium,
      fontSize: 26,
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    summaryCard: {
      padding: spacing.lg,
      borderRadius: radii.xl,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statIconBox: {
      width: 48,
      height: 48,
      borderRadius: radii.lg,
      backgroundColor: colors.accent + '15',
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.md,
    },
    statLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.mutedForeground,
    },
    statValue: {
      fontFamily: typography.sans.bold,
      fontSize: 22,
      color: colors.foreground,
      marginTop: 2,
    },
    divider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: spacing.md,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailSubject: {
      fontFamily: typography.sans.semiBold,
      fontSize: 15,
      color: colors.foreground,
    },
    detailTopic: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: typography.sans.semiBold,
      fontSize: 15,
      color: colors.foreground,
    },
    productivityGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    productivityCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: spacing.md,
      alignItems: 'center',
      gap: spacing.xs,
    },
    productivityCardActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '10',
    },
    productivityLabel: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    productivityLabelActive: {
      fontFamily: typography.sans.bold,
      color: colors.foreground,
    },
    taskToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      padding: spacing.md,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    taskToggleTitle: {
      fontFamily: typography.sans.semiBold,
      fontSize: 14,
      color: colors.foreground,
    },
    taskToggleSubtitle: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    actionWrapper: {
      marginTop: spacing.sm,
    },
    saveBtn: {
      width: '100%',
      paddingVertical: spacing.md,
    },
  });
