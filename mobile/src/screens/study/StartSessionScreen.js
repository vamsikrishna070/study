import React, { useState, useEffect, useContext, useCallback } from 'react';
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
  Play,
  Sparkles,
  RotateCcw,
  BarChart2,
  Target,
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { StudyTopicSelector } from '../../components/study/StudyTopicSelector';
import { StudySessionContext } from '../../context/StudySessionContext';
import { getSubjects } from '../../api/subjects';
import { getTasks } from '../../api/tasks';
import { getExams } from '../../api/exams';
import { useAppTheme, useStyles } from '../../theme/theme';

export default function StartSessionScreen({ navigation, route }) {
  const { colors } = useAppTheme();
  const styles = useStyles(createStyles);
  const { activeSession, startSession } = useContext(StudySessionContext);

  const initialSubjectId = route.params?.subjectId || null;
  const initialTaskId = route.params?.taskId || null;
  const initialExamId = route.params?.examId || null;
  const initialTopic = route.params?.topic || '';

  const [studyType, setStudyType] = useState('syllabus');
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [outsideSyllabus, setOutsideSyllabus] = useState([
    { area: '', topics: [] }
  ]);
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

      if (subList.length > 0 && selectedSubjects.length === 0) {
        const initSub = initialSubjectId
          ? subList.find((s) => (s._id || s.id) === initialSubjectId) || subList[0]
          : subList[0];

        setSelectedSubjects([
          {
            subjectId: initSub._id || initSub.id,
            subjectName: initSub.name,
            topics: initialTopic ? [{ topicId: null, topicName: initialTopic, completed: false }] : [],
          },
        ]);
      }
    } catch (err) {
      console.error('[StartSession] Error loading dependencies:', err);
    } finally {
      setLoading(false);
    }
  }, [initialSubjectId, initialTopic]);

  useEffect(() => {
    loadFormData();
  }, [loadFormData]);

  const handleStart = async () => {
    let primarySubjectId = null;
    let primarySubjectName = 'General Study';
    let primaryTopic = 'General Study';

    if (studyType === 'syllabus' && selectedSubjects.length > 0) {
      primarySubjectId = selectedSubjects[0].subjectId || null;
      primarySubjectName = selectedSubjects[0].subjectName || 'General Study';
      if (selectedSubjects[0].topics && selectedSubjects[0].topics.length > 0) {
        primaryTopic = selectedSubjects[0].topics.map((t) => t.topicName).join(', ');
      }
    } else if (studyType === 'outside_syllabus' && outsideSyllabus.length > 0) {
      primarySubjectName = outsideSyllabus[0].area || 'Outside Syllabus';
      if (outsideSyllabus[0].topics && outsideSyllabus[0].topics.length > 0) {
        primaryTopic = outsideSyllabus[0].topics.map((t) => t.name).join(', ');
      }
    }

    await startSession({
      subjectId: primarySubjectId,
      subjectName: primarySubjectName,
      topic: primaryTopic,
      taskId: selectedTaskId || null,
      examId: selectedExamId || null,
      goal: goal.trim(),
      studyType,
      subjects: selectedSubjects,
      outsideSyllabus,
    });

    navigation.replace('FocusSession');
  };

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
            eyebrow="Focus Mode"
            title="Start Study Session"
            detail="Configure your session goals, subjects, and topics to begin."
            action={
              <View style={styles.headerActions}>
                <Button
                  variant="outline"
                  onPress={() => navigation.navigate('StudyHistory')}
                  style={styles.headerBtn}
                >
                  <RotateCcw size={16} color={colors.foreground} style={{ marginRight: 6 }} />
                  History
                </Button>
                <TouchableOpacity
                  style={styles.chartIconBtn}
                  onPress={() => navigation.navigate('StudyAnalytics')}
                  activeOpacity={0.7}
                >
                  <BarChart2 size={18} color={colors.accent} />
                </TouchableOpacity>
              </View>
            }
          />

          <Card style={styles.formCard}>
            <StudyTopicSelector
              studyType={studyType}
              onStudyTypeChange={setStudyType}
              availableSubjects={subjects}
              selectedSubjects={selectedSubjects}
              onSelectedSubjectsChange={setSelectedSubjects}
              outsideSyllabus={outsideSyllabus}
              onOutsideSyllabusChange={setOutsideSyllabus}
              showCompletionCheckboxes={false}
            />

            <Field label="Linked Task (Optional)" hint="Link a task to mark completed when session finishes">
              <SelectPicker
                value={selectedTaskId}
                onChange={setSelectedTaskId}
                options={taskOptions}
                placeholder="Select a task to focus on..."
              />
            </Field>

            <Field label="Linked Exam (Optional)" hint="Target an upcoming exam for this study session">
              <SelectPicker
                value={selectedExamId}
                onChange={setSelectedExamId}
                options={examOptions}
                placeholder="Select an exam..."
              />
            </Field>

            <Field label="Session Goal (Optional)" hint="A clear focus outcome for this session">
              <Input
                value={goal}
                onChangeText={setGoal}
                placeholder="e.g. Solve 10 practice problems, read Chapter 4..."
              />
            </Field>

            <Button
              onPress={handleStart}
              style={styles.startBtn}
            >
              <Play size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />
              Start Focus Timer
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
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerBtn: {
      height: 38,
      paddingHorizontal: 12,
    },
    chartIconBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    formCard: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    startBtn: {
      marginTop: theme.spacing.md,
      height: 52,
    },
  });
