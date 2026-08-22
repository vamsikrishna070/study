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
  Clock, 
  Smile, 
  Meh, 
  Frown, 
  Save, 
  BookOpen, 
  PenLine 
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { getSubjects } from '../../api/subjects';
import { getTopics } from '../../api/syllabus';
import { createStudySession } from '../../api/studySessions';
import { useAppDialog } from '../../components/ui/AppDialog';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function LogSessionScreen({ navigation }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showSuccess, showError } = useAppDialog();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [syllabusTopics, setSyllabusTopics] = useState([]);
  const [topic, setTopic] = useState('');
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
        setSubjects(list);
        if (list.length > 0) {
          setSelectedSubjectId(list[0]._id || list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedSubjectId) {
      setSyllabusTopics([]);
      return;
    }
    getTopics(selectedSubjectId)
      .then((res) => setSyllabusTopics(res.data || res || []))
      .catch(() => setSyllabusTopics([]));
  }, [selectedSubjectId]);

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
      const chosenSubject = subjects.find((s) => (s._id || s.id) === selectedSubjectId);

      const payload = {
        subjectId: selectedSubjectId || null,
        subjectName: chosenSubject?.name || 'General Study',
        topic: topic.trim() || 'General Study',
        sessionType: 'manual',
        status: 'completed',
        startedAt: sessionDate.toISOString(),
        endedAt: new Date(sessionDate.getTime() + mins * 60000).toISOString(),
        durationMinutes: mins,
        productivity,
        notes: notes.trim(),
      };

      await createStudySession(payload);
      showSuccess('Session Logged', 'Your manual study session has been added to history.');
      navigation.replace('StudyHistory');
    } catch (err) {
      console.error('[LogSession] Save error:', err);
      showError('Save Failed', 'Failed to log study session. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const subjectOptions = subjects.map((s) => ({
    label: `${s.name} (${s.code || 'Sub'})`,
    value: s._id || s.id,
  }));

  return (
    <View style={styles.container}>
      <Header />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <PageHeading
            eyebrow="Manual Log"
            title="Log Study Session"
            detail="Record study time completed offline or without the live timer."
          />

          <View style={styles.form}>
            <Field label="Subject">
              <SelectPicker
                value={selectedSubjectId}
                onValueChange={setSelectedSubjectId}
                options={subjectOptions}
                placeholder="Select your subject"
              />
            </Field>

            <Field label="Topic / Concept">
              <Input
                value={topic}
                onChangeText={setTopic}
                placeholder="What topic are you studying?"
              />
            </Field>

            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Field label="Date">
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <CalendarIcon size={16} color={colors.accent} />
                    <Text style={styles.pickerTriggerText}>
                      {sessionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>
                </Field>
              </View>

              <View style={styles.halfCol}>
                <Field label="Duration (Minutes)">
                  <Input
                    value={durationMinutes}
                    onChangeText={setDurationMinutes}
                    keyboardType="numeric"
                    placeholder="Enter duration in minutes"
                  />
                </Field>
              </View>
            </View>

            {showDatePicker && (
              <DateTimePicker
                value={sessionDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
              />
            )}

            {/* Productivity Rating */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Productivity Rating</Text>
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
                    size={22}
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
                    size={22}
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
                    size={22}
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

            <Field label="Notes / Reflection (Optional)">
              <Input
                value={notes}
                onChangeText={setNotes}
                placeholder="Add task details"
                multiline
                numberOfLines={3}
                style={{ minHeight: 80, alignItems: 'flex-start' }}
                textAlignVertical="top"
              />
            </Field>

            <View style={styles.actionWrapper}>
              <Button
                onPress={handleSave}
                loading={saving}
                disabled={saving}
                style={styles.saveBtn}
                icon={<Save size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />}
              >
                Log Study Session
              </Button>
            </View>
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
    },
    form: {
      gap: spacing.lg,
      marginTop: spacing.md,
    },
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    halfCol: {
      flex: 1,
    },
    pickerTrigger: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.xl,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      gap: spacing.sm,
    },
    pickerTriggerText: {
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.foreground,
    },
    section: {
      gap: spacing.sm,
    },
    sectionTitle: {
      fontFamily: typography.sans.semiBold,
      fontSize: 14,
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
    actionWrapper: {
      marginTop: spacing.md,
    },
    saveBtn: {
      width: '100%',
      paddingVertical: spacing.md,
    },
  });
