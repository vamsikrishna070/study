import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Sparkles,
  Smile,
  Meh,
  Frown,
  CheckCircle2,
  ListTodo,
  Clock,
  Check,
  X,
  RotateCcw
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { StudyTopicSelector } from '../../components/study/StudyTopicSelector';
import { StudySessionContext } from '../../context/StudySessionContext';
import { createStudySession } from '../../api/studySessions';
import { getSubjects } from '../../api/subjects';
import { updateTask } from '../../api/tasks';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useAppTheme, useStyles } from '../../theme/theme';

export default function EndSessionScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const styles = useStyles(createStyles);
  const { discardSession } = useContext(StudySessionContext);
  const { showSuccess, showError } = useAppDialog();

  const summary = route.params?.sessionSummary || {};
  const [productivity, setProductivity] = useState('productive');
  const [reflection, setReflection] = useState('');
  const [markTaskComplete, setMarkTaskComplete] = useState(Boolean(summary.taskId));
  const [saving, setSaving] = useState(false);

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [studyType, setStudyType] = useState(summary.studyType || 'syllabus');
  const [completionMode, setCompletionMode] = useState('all');
  const [subjects, setSubjects] = useState(summary.subjects || []);
  const [outsideSyllabus, setOutsideSyllabus] = useState(summary.outsideSyllabus || []);

  useEffect(() => {
    getSubjects()
      .then((res) => setAvailableSubjects(res.data || res || []))
      .catch(() => setAvailableSubjects([]));
  }, []);

  useEffect(() => {
    if (completionMode === 'all') {
      setSubjects((prev) =>
        prev.map((sub) => ({
          ...sub,
          topics: (sub.topics || []).map((top) => ({ ...top, completed: true })),
        }))
      );
      setOutsideSyllabus((prev) =>
        prev.map((out) => ({
          ...out,
          topics: (out.topics || []).map((top) => ({ ...top, completed: true })),
        }))
      );
    } else if (completionMode === 'none') {
      setSubjects((prev) =>
        prev.map((sub) => ({
          ...sub,
          topics: (sub.topics || []).map((top) => ({ ...top, completed: false })),
        }))
      );
      setOutsideSyllabus((prev) =>
        prev.map((out) => ({
          ...out,
          topics: (out.topics || []).map((top) => ({ ...top, completed: false })),
        }))
      );
    }
  }, [completionMode]);

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
    if (saving) return;
    try {
      setSaving(true);

      const rawSubjectId = summary.subjectId || null;
      const validSubjectId = (typeof rawSubjectId === 'string' && rawSubjectId.length === 24) ? rawSubjectId : null;
      const rawTaskId = summary.taskId || null;
      const validTaskId = (typeof rawTaskId === 'string' && rawTaskId.length === 24) ? rawTaskId : null;
      const rawExamId = summary.examId || null;
      const validExamId = (typeof rawExamId === 'string' && rawExamId.length === 24) ? rawExamId : null;

      const payload = {
        subjectId: validSubjectId,
        subjectName: summary.subjectName || '',
        topic: summary.topic || '',
        taskId: validTaskId,
        examId: validExamId,
        sessionType: 'timer',
        studyType,
        status: 'completed',
        startedAt: summary.startedAt || new Date().toISOString(),
        endedAt: summary.endedAt || new Date().toISOString(),
        totalPausedMs: summary.totalPausedMs || 0,
        durationMinutes: summary.durationMinutes || Math.max(1, Math.round((summary.elapsedSeconds || 60) / 60)),
        productivity,
        goal: summary.goal || '',
        notes: reflection.trim(),
        subjects,
        outsideSyllabus,
      };

      await createStudySession(payload);

      if (markTaskComplete && validTaskId) {
        try {
          await updateTask(validTaskId, { completed: true });
        } catch (err) {
          console.log('[EndSession] Task auto-complete error:', err);
        }
      }

      discardSession();
      showSuccess('Session Saved', 'Great work! Your study session and syllabus progress have been updated.');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('StudyHistory');
      }
    } catch (err) {
      console.error('[EndSession] Save error:', err);
      showError('Save Failed', err?.response?.data?.message || err?.message || 'Failed to save your session. Please check your connection.');
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
              <Sparkles size={14} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>Session Finished</Text>
            </View>
            <Text style={styles.title}>Great study block!</Text>
            <Text style={styles.subtitle}>
              Confirm topic completion to automatically sync progress with your syllabus.
            </Text>
          </View>

          <Card style={styles.summaryCard}>
            <View style={styles.statRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Time Spent</Text>
                <Text style={styles.statValue}>{formatDetailedTime(summary.elapsedSeconds || 0)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Focus Goal</Text>
                <Text style={styles.statValue} numberOfLines={1}>{summary.goal || 'General Study'}</Text>
              </View>
            </View>

            <Field label="How productive did you feel?">
              <View style={styles.prodRow}>
                <TouchableOpacity
                  style={[styles.prodOption, productivity === 'productive' && styles.prodOptionActive]}
                  onPress={() => setProductivity('productive')}
                  activeOpacity={0.7}
                >
                  <Smile size={18} color={productivity === 'productive' ? colors.accent : colors.mutedForeground} />
                  <Text style={[styles.prodText, productivity === 'productive' && styles.prodTextActive]}>
                    Productive
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.prodOption, productivity === 'average' && styles.prodOptionActive]}
                  onPress={() => setProductivity('average')}
                  activeOpacity={0.7}
                >
                  <Meh size={18} color={productivity === 'average' ? colors.accent : colors.mutedForeground} />
                  <Text style={[styles.prodText, productivity === 'average' && styles.prodTextActive]}>
                    Average
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.prodOption, productivity === 'difficult' && styles.prodOptionActive]}
                  onPress={() => setProductivity('difficult')}
                  activeOpacity={0.7}
                >
                  <Frown size={18} color={productivity === 'difficult' ? '#F59E0B' : colors.mutedForeground} />
                  <Text style={[styles.prodText, productivity === 'difficult' && styles.prodTextActive]}>
                    Difficult
                  </Text>
                </TouchableOpacity>
              </View>
            </Field>

            {studyType === 'revision' ? (
              <View style={styles.revisionNoticeCard}>
                <RotateCcw size={16} color={colors.accent} style={{ marginRight: 8, marginTop: 2 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.revisionNoticeTitle}>Revision Session Completed</Text>
                  <Text style={styles.revisionNoticeText}>
                    These topics are already completed in your syllabus. Saving this session will log your revision time in Study History without altering syllabus completion.
                  </Text>
                </View>
              </View>
            ) : (
              <Field label="How did you finish these topics?" hint="Completed syllabus topics automatically update your syllabus progress">
                <View style={styles.modeColumn}>
                  <TouchableOpacity
                    style={[styles.modeBtn, completionMode === 'all' && styles.modeBtnActive]}
                    onPress={() => setCompletionMode('all')}
                    activeOpacity={0.7}
                  >
                    <CheckCircle2 size={16} color={completionMode === 'all' ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 8 }} />
                    <Text style={[styles.modeBtnText, completionMode === 'all' && styles.modeBtnTextActive]}>
                      All Topics Completed
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, completionMode === 'partial' && styles.modeBtnActive]}
                    onPress={() => setCompletionMode('partial')}
                    activeOpacity={0.7}
                  >
                    <ListTodo size={16} color={completionMode === 'partial' ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 8 }} />
                    <Text style={[styles.modeBtnText, completionMode === 'partial' && styles.modeBtnTextActive]}>
                      Select Completed Topics
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modeBtn, completionMode === 'none' && styles.modeBtnActive]}
                    onPress={() => setCompletionMode('none')}
                    activeOpacity={0.7}
                  >
                    <Clock size={16} color={completionMode === 'none' ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 8 }} />
                    <Text style={[styles.modeBtnText, completionMode === 'none' && styles.modeBtnTextActive]}>
                      Keep All Topics Pending
                    </Text>
                  </TouchableOpacity>
                </View>
              </Field>
            )}

            {completionMode === 'partial' && (
              <StudyTopicSelector
                studyType={studyType}
                onStudyTypeChange={setStudyType}
                availableSubjects={availableSubjects}
                selectedSubjects={subjects}
                onSelectedSubjectsChange={setSubjects}
                outsideSyllabus={outsideSyllabus}
                onOutsideSyllabusChange={setOutsideSyllabus}
                showCompletionCheckboxes={true}
              />
            )}

            <Field label="Session Reflection / Notes (Optional)">
              <Input
                value={reflection}
                onChangeText={setReflection}
                placeholder="What did you learn or accomplish during this session?"
                multiline
                numberOfLines={3}
                style={{ minHeight: 70 }}
              />
            </Field>

            <Button
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            >
              Save Study Session
            </Button>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    header: {
      marginBottom: theme.spacing.lg,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: theme.radii.round,
      marginBottom: theme.spacing.sm,
    },
    badgeText: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 10,
      letterSpacing: 1.2,
      color: theme.colors.accent,
      textTransform: 'uppercase',
    },
    title: {
      fontFamily: theme.typography.serif.medium,
      fontSize: 22,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 13,
      color: theme.colors.mutedForeground,
    },
    summaryCard: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    statRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    divider: {
      width: 1,
      height: 28,
      backgroundColor: theme.colors.cardBorder,
    },
    statLabel: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 9,
      textTransform: 'uppercase',
      color: theme.colors.mutedForeground,
      marginBottom: 2,
    },
    statValue: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 14,
      color: theme.colors.foreground,
    },
    prodRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    prodOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      gap: 6,
    },
    prodOptionActive: {
      borderColor: theme.colors.accent,
      backgroundColor: `${theme.colors.accent}12`,
    },
    prodText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 12,
      color: theme.colors.mutedForeground,
    },
    prodTextActive: {
      color: theme.colors.foreground,
      fontFamily: theme.typography.sans.semiBold,
    },
    modeColumn: {
      gap: theme.spacing.xs,
    },
    modeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: theme.radii.lg,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    modeBtnActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    modeBtnText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 12,
      color: theme.colors.mutedForeground,
    },
    modeBtnTextActive: {
      color: theme.colors.primaryForeground,
      fontFamily: theme.typography.sans.semiBold,
    },
    saveBtn: {
      marginTop: theme.spacing.sm,
      height: 48,
    },
    revisionNoticeCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      marginVertical: theme.spacing.sm,
    },
    revisionNoticeTitle: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 13,
      color: theme.colors.foreground,
      marginBottom: 2,
    },
    revisionNoticeText: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.mutedForeground,
      lineHeight: 16,
    },
  });
