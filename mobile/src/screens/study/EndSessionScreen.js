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
  Save
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
  const [subjects, setSubjects] = useState(summary.subjects || []);
  const [outsideSyllabus, setOutsideSyllabus] = useState(summary.outsideSyllabus || []);

  useEffect(() => {
    getSubjects()
      .then((res) => setAvailableSubjects(res.data || res || []))
      .catch(() => setAvailableSubjects([]));
  }, []);

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
      navigation.replace('StudyHistory');
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
              <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
              <Text style={styles.badgeText}>Session Finished</Text>
            </View>
            <Text style={styles.title}>Great study block!</Text>
            <Text style={styles.subtitle}>
              Review your study duration, select completed topics, and reflect on what you accomplished.
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
                  <Smile size={20} color={productivity === 'productive' ? colors.accent : colors.mutedForeground} />
                  <Text style={[styles.prodText, productivity === 'productive' && styles.prodTextActive]}>
                    Productive
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.prodOption, productivity === 'average' && styles.prodOptionActive]}
                  onPress={() => setProductivity('average')}
                  activeOpacity={0.7}
                >
                  <Meh size={20} color={productivity === 'average' ? colors.accent : colors.mutedForeground} />
                  <Text style={[styles.prodText, productivity === 'average' && styles.prodTextActive]}>
                    Average
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.prodOption, productivity === 'difficult' && styles.prodOptionActive]}
                  onPress={() => setProductivity('difficult')}
                  activeOpacity={0.7}
                >
                  <Frown size={20} color={productivity === 'difficult' ? '#F59E0B' : colors.mutedForeground} />
                  <Text style={[styles.prodText, productivity === 'difficult' && styles.prodTextActive]}>
                    Difficult
                  </Text>
                </TouchableOpacity>
              </View>
            </Field>

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

            <Field label="Session Reflection / Notes (Optional)">
              <Input
                value={reflection}
                onChangeText={setReflection}
                placeholder="What did you learn? What needs further review?"
                multiline
                numberOfLines={3}
                style={{ height: 80, textAlignVertical: 'top' }}
              />
            </Field>

            <Button
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            >
              <Save size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />
              Save Study Log
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
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radii.full,
      marginBottom: theme.spacing.xs,
    },
    badgeText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.accent,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 14,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.md,
    },
    summaryCard: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    statRow: {
      flexDirection: 'row',
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      alignItems: 'center',
    },
    statBox: {
      flex: 1,
      alignItems: 'center',
    },
    divider: {
      width: 1,
      height: 30,
      backgroundColor: theme.colors.border,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    prodRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    prodOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    prodOptionActive: {
      borderColor: theme.colors.accent,
      backgroundColor: `${theme.colors.accent}12`,
    },
    prodText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
    },
    prodTextActive: {
      color: theme.colors.foreground,
    },
    saveBtn: {
      marginTop: theme.spacing.sm,
      height: 50,
    },
  });
