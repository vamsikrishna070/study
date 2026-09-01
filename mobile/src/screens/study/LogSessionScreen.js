import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar as CalendarIcon,
  Smile,
  Meh,
  Frown,
  Save,
  PenLine
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { StudyTopicSelector } from '../../components/study/StudyTopicSelector';
import { getSubjects } from '../../api/subjects';
import { createStudySession } from '../../api/studySessions';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useAppTheme, useStyles } from '../../theme/theme';

export default function LogSessionScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showSuccess, showError } = useAppDialog();

  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [studyType, setStudyType] = useState('syllabus');
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [outsideSyllabus, setOutsideSyllabus] = useState([
    { area: '', topics: [] }
  ]);

  const [sessionDate, setSessionDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [productivity, setProductivity] = useState('productive');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSubjects()
      .then((res) => {
        const list = res.data || res || [];
        setAvailableSubjects(list);
        if (list.length > 0 && selectedSubjects.length === 0) {
          setSelectedSubjects([
            {
              subjectId: list[0]._id || list[0].id,
              subjectName: list[0].name,
              topics: [],
            },
          ]);
        }
      })
      .catch(() => {});
  }, []);

  const onDateChange = (_event, selected) => {
    setShowDatePicker(false);
    if (selected) {
      setSessionDate(selected);
    }
  };

  const handleSave = async () => {
    const mins = parseInt(durationMinutes, 10);
    if (!mins || mins <= 0) {
      showError('Invalid Duration', 'Please enter a valid study duration in minutes.');
      return;
    }

    try {
      setSaving(true);

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

      const payload = {
        subjectId: primarySubjectId,
        subjectName: primarySubjectName,
        topic: primaryTopic,
        sessionType: 'manual',
        studyType,
        status: 'completed',
        startedAt: sessionDate.toISOString(),
        endedAt: new Date(sessionDate.getTime() + mins * 60000).toISOString(),
        durationMinutes: mins,
        productivity,
        notes: notes.trim(),
        subjects: selectedSubjects,
        outsideSyllabus,
      };

      await createStudySession(payload);
      showSuccess('Session Logged', 'Your manual study session and syllabus progress have been updated.');
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('StudyHistory');
      }
    } catch (err) {
      console.error('[LogSession] Save error:', err);
      showError('Save Failed', 'Failed to log study session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header showBack={true} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <PageHeading
            eyebrow="Manual Entry"
            title="Log Past Study Session"
            detail="Record study time completed offline or outside the timer."
          />

          <Card style={styles.formCard}>
            <StudyTopicSelector
              studyType={studyType}
              onStudyTypeChange={setStudyType}
              availableSubjects={availableSubjects}
              selectedSubjects={selectedSubjects}
              onSelectedSubjectsChange={setSelectedSubjects}
              outsideSyllabus={outsideSyllabus}
              onOutsideSyllabusChange={setOutsideSyllabus}
              showCompletionCheckboxes={true}
            />

            <Field label="Session Date">
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowDatePicker(true)}
                activeOpacity={0.7}
              >
                <CalendarIcon size={18} color={colors.accent} style={{ marginRight: 8 }} />
                <Text style={styles.datePickerText}>
                  {sessionDate.toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={sessionDate}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}
            </Field>

            <Field label="Duration (Minutes)">
              <Input
                value={durationMinutes}
                onChangeText={setDurationMinutes}
                keyboardType="numeric"
                placeholder="45"
              />
            </Field>

            <Field label="How productive was this session?">
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

            <Field label="Notes / Achievements (Optional)">
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Key concepts covered, questions..."
                multiline
                numberOfLines={3}
                style={{ height: 70, textAlignVertical: 'top' }}
              />
            </Field>

            <Button
              onPress={handleSave}
              loading={saving}
              style={styles.saveBtn}
            >
              <Save size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />
              Log Study Session
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
    formCard: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    datePickerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    datePickerText: {
      fontSize: 14,
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
