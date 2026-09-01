import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  Play,
  BookOpen,
  Sparkles,
  RotateCcw,
  BarChart2,
  Target,
  ListChecks,
  CalendarDays,
  PenLine
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { StudySessionContext } from '../../context/StudySessionContext';
import { getSubjects } from '../../api/subjects';
import { getTopics } from '../../api/syllabus';
import { getTasks } from '../../api/tasks';
import { getExams } from '../../api/exams';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function StartSessionScreen({ navigation, route }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { activeSession, startSession } = useContext(StudySessionContext);

  const initialSubjectId = route.params?.subjectId || null;
  const initialTaskId = route.params?.taskId || null;
  const initialExamId = route.params?.examId || null;
  const initialTopic = route.params?.topic || '';

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubjectId);
  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [customTopic, setCustomTopic] = useState('');
  const [topicMode, setTopicMode] = useState('picker');
  const [tasks, setTasks] = useState([]);
  const [selectedTaskId, setSelectedTaskId] = useState(initialTaskId);
  const [exams, setExams] = useState([]);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeSession && activeSession.status === 'running') {
      navigation.replace('FocusSession');
    }
  }, [activeSession, navigation]);

  const loadFormData = useCallback(async () => {
    try {
      setLoading(true);
      const [subjectsRes, tasksRes, examsRes] = await Promise.all([
        getSubjects(),
        getTasks(),
        getExams(),
      ]);

      const subList = subjectsRes.data || subjectsRes || [];
      setSubjects(subList);
      setTasks((tasksRes.data || tasksRes || []).filter((t) => !t.completed));
      setExams(examsRes.data || examsRes || []);

      if (!selectedSubjectId && subList.length > 0) {
        setSelectedSubjectId(subList[0]._id || subList[0].id);
      }
    } catch (err) {
      console.error('[StartSession] Error loading form dependencies:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedSubjectId]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  useEffect(() => {
    if (!selectedSubjectId) {
      setSyllabusTopics([]);
      return;
    }

    getTopics(selectedSubjectId)
      .then((res) => {
        const list = res.data || res || [];
        setSyllabusTopics(list);
        if (list.length > 0 && !initialTopic) {
          setSelectedTopic(list[0].title || '');
          setTopicMode('picker');
        } else if (list.length === 0) {
          setTopicMode('custom');
        }
      })
      .catch(() => {
        setSyllabusTopics([]);
        setTopicMode('custom');
      });
  }, [selectedSubjectId, initialTopic]);

  const handleStart = async () => {
    const chosenSubject = subjects.find((s) => (s._id || s.id) === selectedSubjectId);
    const finalTopic = topicMode === 'picker' ? selectedTopic : customTopic.trim();

    await startSession({
      subjectId: selectedSubjectId || null,
      subjectName: chosenSubject?.name || 'General Study',
      topic: finalTopic || 'General Study',
      taskId: selectedTaskId || null,
      examId: selectedExamId || null,
      goal: goal.trim(),
    });

    navigation.replace('FocusSession');
  };

  const subjectOptions = subjects.map((s) => ({
    label: `${s.name} (${s.code || 'Sub'})`,
    value: s._id || s.id,
  }));

  const topicOptions = syllabusTopics.map((t) => ({
    label: t.title,
    value: t.title,
  }));

  const taskOptions = [
    { label: 'None (Unlinked)', value: '' },
    ...tasks.map((t) => ({
      label: t.title,
      value: t._id || t.id,
    })),
  ];

  const examOptions = [
    { label: 'None (Unlinked)', value: '' },
    ...exams.map((e) => ({
      label: e.name,
      value: e._id || e.id,
    })),
  ];

  return (
    <View style={styles.container}>
      <Header />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <PageHeading
            eyebrow="Focused Study"
            title="Start Study Session"
            detail="Dedicate distraction-free time to your subject, topic, and goals."
            action={
              <View style={styles.headerActions}>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => navigation.navigate('StudyHistory')}
                  activeOpacity={0.7}
                >
                  <RotateCcw size={18} color={colors.foreground} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => navigation.navigate('StudyAnalytics')}
                  activeOpacity={0.7}
                >
                  <BarChart2 size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            }
          />

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <View style={styles.form}>

              <Field label="Subject" hint="What subject are you tackling?">
                <SelectPicker
                  value={selectedSubjectId}
                  onValueChange={setSelectedSubjectId}
                  options={subjectOptions}
                  placeholder="Select your subject"
                />
              </Field>

              <Field label="Topic" hint="Choose a syllabus topic or enter a custom one">
                {syllabusTopics.length > 0 && (
                  <View style={styles.topicModeToggle}>
                    <TouchableOpacity
                      style={[styles.toggleTab, topicMode === 'picker' && styles.toggleTabActive]}
                      onPress={() => setTopicMode('picker')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.toggleTabText, topicMode === 'picker' && styles.toggleTabTextActive]}>
                        From Syllabus ({syllabusTopics.length})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.toggleTab, topicMode === 'custom' && styles.toggleTabActive]}
                      onPress={() => setTopicMode('custom')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.toggleTabText, topicMode === 'custom' && styles.toggleTabTextActive]}>
                        Custom Topic
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {topicMode === 'picker' && syllabusTopics.length > 0 ? (
                  <SelectPicker
                    value={selectedTopic}
                    onValueChange={setSelectedTopic}
                    options={topicOptions}
                    placeholder="Select topic from syllabus"
                  />
                ) : (
                  <Input
                    value={customTopic}
                    onChangeText={setCustomTopic}
                    placeholder="What topic are you studying?"
                  />
                )}
              </Field>

              <Field label="Session Goal (Optional)" hint="A clear focus outcome for this session">
                <Input
                  value={goal}
                  onChangeText={setGoal}
                  placeholder="Add session goal"
                />
              </Field>

              {tasks.length > 0 && (
                <Field label="Linked Task (Optional)">
                  <SelectPicker
                    value={selectedTaskId}
                    onValueChange={setSelectedTaskId}
                    options={taskOptions}
                    placeholder="None (Unlinked)"
                  />
                </Field>
              )}

              {exams.length > 0 && (
                <Field label="Linked Exam (Optional)">
                  <SelectPicker
                    value={selectedExamId}
                    onValueChange={setSelectedExamId}
                    options={examOptions}
                    placeholder="None (Unlinked)"
                  />
                </Field>
              )}

              <View style={styles.actionSection}>
                <Button
                  onPress={handleStart}
                  style={styles.startButton}
                  icon={<Play size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />}
                >
                  Start Studying
                </Button>

                <TouchableOpacity
                  style={styles.manualLogBtn}
                  onPress={() => navigation.navigate('LogSession')}
                  activeOpacity={0.7}
                >
                  <PenLine size={16} color={colors.accent} style={{ marginRight: 6 }} />
                  <Text style={styles.manualLogText}>Log Past Session Manually</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
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
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    headerBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.round,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingBox: {
      paddingVertical: spacing.xxl,
      alignItems: 'center',
    },
    form: {
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    topicModeToggle: {
      flexDirection: 'row',
      backgroundColor: colors.muted,
      borderRadius: radii.lg,
      padding: 3,
      marginBottom: spacing.sm,
    },
    toggleTab: {
      flex: 1,
      paddingVertical: spacing.xs + 2,
      alignItems: 'center',
      borderRadius: radii.md,
    },
    toggleTabActive: {
      backgroundColor: colors.card,
    },
    toggleTabText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    toggleTabTextActive: {
      color: colors.foreground,
      fontFamily: typography.sans.semiBold,
    },
    actionSection: {
      marginTop: spacing.md,
      gap: spacing.md,
      alignItems: 'center',
    },
    startButton: {
      width: '100%',
      paddingVertical: spacing.md,
    },
    manualLogBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    manualLogText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 14,
      color: colors.accent,
    },
  });
