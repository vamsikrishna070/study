import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  CalendarDays,
  Plus,
  X,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  FileText,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getExams, createExam, deleteExam, updateExam } from '../../api/exams';
import { getSubjects } from '../../api/subjects';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useStyles } from '../../theme/theme';

const EXAM_TYPES = [
  { label: 'End semester', value: 'End semester' },
  { label: 'Mid term', value: 'Mid term' },
  { label: 'Quiz', value: 'Quiz' },
  { label: 'Practical', value: 'Practical' },
  { label: 'Assignment Exam', value: 'Assignment' },
  { label: 'Other', value: 'Other' },
];

const PERFORMANCE_RATINGS = [
  { label: 'Excellent', value: 'Excellent' },
  { label: 'Good', value: 'Good' },
  { label: 'Average', value: 'Average' },
  { label: 'Poor', value: 'Poor' },
  { label: 'Very Poor', value: 'Very Poor' },
];

const ExamsScreen = ({ route, navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const { showError, showDeleteConfirm } = useAppDialog();

  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');

  // Modal State
  const [modalVisible, setModalVisible] = useState(paramOpenCreate);
  const [name, setName] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [type, setType] = useState('End semester');
  const [date, setDate] = useState(new Date());
  const [time, setTime] = useState('');
  const [venue, setVenue] = useState('');
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Performance Modal State
  const [perfModalVisible, setPerfModalVisible] = useState(false);
  const [selectedExam, setSelectedExam] = useState(null);
  const [perfRating, setPerfRating] = useState('Good');
  const [perfReflection, setPerfReflection] = useState('');
  const [marksPending, setMarksPending] = useState(true);
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('');

  const loadData = async () => {
    try {
      setError(null);
      const [examsRes, subsRes] = await Promise.all([getExams(), getSubjects()]);

      let examsData = examsRes.data || examsRes || [];
      const subsData = subsRes.data || subsRes || [];

      if (paramSubjectId) {
        examsData = examsData.filter(
          (e) => (e.subject?._id || e.subject) === paramSubjectId || e.subjectId === paramSubjectId
        );
      }

      setExams(examsData);
      setSubjects(subsData);

      if (!subjectId && subsData.length > 0) {
        setSubjectId(subsData[0]._id || subsData[0].id);
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else {
        setError('Failed to load exams.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [paramSubjectId]);

  useEffect(() => {
    if (paramOpenCreate) setModalVisible(true);
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [paramSubjectId]);

  const handleCreate = async () => {
    if (!name.trim()) {
      showError('Validation Error', 'Exam title/name is required.');
      return;
    }
    if (!subjectId) {
      showError('Validation Error', 'Please select a subject for this exam.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        subjectId,
        type,
        date: date.toISOString(),
        time: time.trim(),
        venue: venue.trim(),
        notes: notes.trim(),
      };

      const res = await createExam(payload);
      setModalVisible(false);
      setName('');
      setType('End semester');
      setTime('');
      setVenue('');
      setNotes('');
      setDate(new Date());

      if (res.data) {
        setExams((prev) => [res.data, ...prev]);
      } else {
        await loadData();
      }
    } catch (e) {
      showError('Error', e?.response?.data?.message || 'Failed to schedule exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    showDeleteConfirm({
      title: 'Delete Exam',
      message: 'Are you sure you want to remove this scheduled exam? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteExam(id);
          setExams((prev) => prev.filter((e) => (e._id || e.id) !== id));
        } catch (e) {
          showError('Delete Failed', 'Failed to delete exam. Please try again.');
        }
      },
    });
  };

  const getPercentageString = () => {
    if (marksPending) return '';
    const ob = Number(marksObtained);
    const mx = Number(maxMarks);
    if (!isNaN(ob) && !isNaN(mx) && mx > 0) {
      return ((ob / mx) * 100).toFixed(2) + '%';
    }
    return '';
  };

  const handleSavePerformance = async () => {
    if (!selectedExam) return;

    const data = {
      completed: true,
      performance: perfRating,
      reflection: perfReflection.trim(),
    };

    if (marksPending) {
      data.marksObtained = null;
      data.maxMarks = null;
      data.percentage = null;
    } else {
      if (marksObtained === '' || maxMarks === '') {
        Alert.alert('Validation Error', 'Please enter both marks obtained and maximum marks, or select "Marks not available yet".');
        return;
      }
      const ob = Number(marksObtained);
      const mx = Number(maxMarks);

      if (isNaN(ob) || ob < 0) {
        Alert.alert('Validation Error', 'Marks obtained cannot be negative.');
        return;
      }
      if (isNaN(mx) || mx <= 0) {
        Alert.alert('Validation Error', 'Maximum marks must be greater than 0.');
        return;
      }
      if (ob > mx) {
        Alert.alert('Validation Error', 'Marks obtained cannot be greater than maximum marks.');
        return;
      }

      data.marksObtained = ob;
      data.maxMarks = mx;
      data.percentage = parseFloat(((ob / mx) * 100).toFixed(2));
    }

    setSubmitting(true);
    try {
      const examId = selectedExam._id || selectedExam.id;
      const res = await updateExam(examId, data);
      
      setPerfModalVisible(false);
      setSelectedExam(null);
      setPerfRating('Good');
      setPerfReflection('');
      setMarksPending(true);
      setMarksObtained('');
      setMaxMarks('');
      
      if (res.data) {
        setExams((prev) => prev.map((e) => ((e._id || e.id) === examId ? res.data : e)));
      } else {
        await loadData();
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to save exam performance.');
    } finally {
      setSubmitting(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const current = new Date(date);
      current.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(current);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const formatted = selectedTime.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      setTime(formatted);
    }
  };

  const subjectOptions = subjects.map((s) => ({
    label: `${s.name} (${s.code})`,
    value: s._id || s.id,
  }));

  const filteredExams = exams.filter((e) => {
    if (activeTab === 'completed') {
      return e.completed === true;
    }
    return e.completed === false;
  });

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={filteredExams}
        keyExtractor={(item, idx) => item._id || item.id || idx.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow="Target dates"
              title="Exams"
              detail="Every deadline and test date kept in sharp focus."
              action={
                <Button size="sm" onPress={() => setModalVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Schedule exam
                </Button>
              }
            />
            <QueryState error={error} onRetry={loadData} label="Exams" />

            {/* Category Tabs */}
            <View style={styles.tabContainer}>
              {['upcoming', 'completed'].map((tab) => {
                const isActive = activeTab === tab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.tabButton, isActive && styles.tabButtonActive]}
                    onPress={() => setActiveTab(tab)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.tabButtonText, isActive && styles.tabButtonTextActive]}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          !error && !loading ? (
            <EmptyState
              title={`No ${activeTab} exams`}
              detail={
                activeTab === 'upcoming'
                  ? 'Stay ahead by adding your exam dates, venues, and syllabus milestones.'
                  : 'Track your finished exams and review your grades here.'
              }
              icon={CalendarDays}
              action={
                activeTab !== 'completed' ? (
                  <Button onPress={() => setModalVisible(true)}>
                    <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                    Schedule exam
                  </Button>
                ) : null
              }
            />
          ) : null
        }
        renderItem={({ item }) => {
          const examId = item._id || item.id;
          const daysLeft = item.daysLeft !== undefined ? item.daysLeft : Math.ceil((new Date(item.date) - new Date()) / 86400000);
          const isUrgent = !item.completed && daysLeft >= 0 && daysLeft <= 7;
          const isPast = daysLeft < 0 || item.completed;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleBox}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{item.type || 'EXAM'}</Text>
                    </View>
                    {item.completed && (
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>Completed ✓</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSubject}>
                    {item.subject?.name || item.subject || 'General Subject'}
                  </Text>
                </View>

                {/* Countdown Badge */}
                <View
                  style={[
                    styles.countdownBadge,
                    isUrgent && styles.urgentBadge,
                    isPast && styles.pastBadge,
                  ]}
                >
                  <Text
                    style={[
                      styles.countdownNumber,
                      isUrgent && styles.urgentText,
                      isPast && styles.pastText,
                    ]}
                  >
                    {item.completed ? 'Done' : isPast ? 'Done' : daysLeft === 0 ? 'Today' : `${daysLeft}d`}
                  </Text>
                  {!isPast && daysLeft !== 0 && (
                    <Text style={[styles.countdownLabel, isUrgent && styles.urgentText]}>
                      remaining
                    </Text>
                  )}
                </View>
              </View>

              {/* Date, Time, Venue details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <CalendarIcon size={14} color={colors.accent} />
                  <Text style={styles.detailText}>
                    {new Date(item.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                {!!item.time && (
                  <View style={styles.detailRow}>
                    <Clock size={14} color={colors.accent} />
                    <Text style={styles.detailText}>{item.time}</Text>
                  </View>
                )}

                {!!item.venue && (
                  <View style={styles.detailRow}>
                    <MapPin size={14} color={colors.accent} />
                    <Text style={styles.detailText}>{item.venue}</Text>
                  </View>
                )}
              </View>

              {!!item.notes && (
                <View style={styles.notesBox}>
                  <FileText size={12} color={colors.mutedForeground} />
                  <Text style={styles.notesText} numberOfLines={2}>
                    {item.notes}
                  </Text>
                </View>
              )}

              {item.completed && (
                <View style={styles.completedBox}>
                  <Text style={styles.completedValue}>
                    <Text style={styles.completedLabel}>Performance: </Text>
                    {item.performance || 'Good'}
                  </Text>
                  {!!item.reflection && (
                    <Text style={styles.completedValue}>
                      <Text style={styles.completedLabel}>Reflection: </Text>
                      <Text style={{ fontStyle: 'italic', color: colors.mutedForeground }}>
                        "{item.reflection}"
                      </Text>
                    </Text>
                  )}
                  <Text style={styles.completedValue}>
                    <Text style={styles.completedLabel}>Result: </Text>
                    {item.marksObtained !== undefined && item.marksObtained !== null ? (
                      <Text style={styles.completedValueBold}>
                        {item.marksObtained} / {item.maxMarks} ({item.percentage}%)
                      </Text>
                    ) : (
                      <Text style={{ color: '#f59e0b', fontFamily: typography.sans.bold }}>
                        Result Pending
                      </Text>
                    )}
                  </Text>
                </View>
              )}

              <View style={styles.cardFooter}>
                <View style={styles.progressBox}>
                  {!item.completed ? (
                    <Text style={styles.progressText}>
                      Subject Progress: {item.progress || item.subject?.progress || 0}%
                    </Text>
                  ) : (
                    <Text style={styles.progressText}>Exam Completed</Text>
                  )}
                </View>
                
                <View style={styles.cardActions}>
                  {!item.completed ? (
                    <Button
                      size="sm"
                      onPress={() => {
                        setSelectedExam(item);
                        setPerfRating(item.performance || 'Good');
                        setPerfReflection(item.reflection || '');
                        setMarksPending(item.marksObtained === undefined || item.marksObtained === null);
                        setMarksObtained(item.marksObtained !== undefined && item.marksObtained !== null ? String(item.marksObtained) : '');
                        setMaxMarks(item.maxMarks !== undefined && item.maxMarks !== null ? String(item.maxMarks) : '');
                        setPerfModalVisible(true);
                      }}
                      style={styles.actionBtn}
                    >
                      Complete
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant={!(item.marksObtained !== undefined && item.marksObtained !== null) ? 'primary' : 'outline'}
                      onPress={() => {
                        setSelectedExam(item);
                        setPerfRating(item.performance || 'Good');
                        setPerfReflection(item.reflection || '');
                        setMarksPending(item.marksObtained === undefined || item.marksObtained === null);
                        setMarksObtained(item.marksObtained !== undefined && item.marksObtained !== null ? String(item.marksObtained) : '');
                        setMaxMarks(item.maxMarks !== undefined && item.maxMarks !== null ? String(item.maxMarks) : '');
                        setPerfModalVisible(true);
                      }}
                      style={styles.actionBtn}
                    >
                      {!(item.marksObtained !== undefined && item.marksObtained !== null) ? 'Add Marks' : 'Edit Result'}
                    </Button>
                  )}
                  <Button
                    variant="danger"
                    onPress={() => handleDelete(examId)}
                    style={styles.deleteBtn}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Schedule Exam Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Exam</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Field label="Exam Name / Title">
                <Input value={name} onChangeText={setName} placeholder="Enter exam name" />
              </Field>

              <Field label="Subject">
                <SelectPicker
                  value={subjectId}
                  onValueChange={setSubjectId}
                  options={subjectOptions}
                  placeholder="Select your subject"
                />
              </Field>

              <Field label="Exam Type">
                <SelectPicker
                  value={type}
                  onValueChange={setType}
                  options={EXAM_TYPES}
                />
              </Field>

              <Field label="Date & Time">
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <CalendarIcon size={16} color={colors.accent} />
                    <Text style={styles.pickerTriggerText}>
                      {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Clock size={16} color={colors.accent} />
                    <Text style={styles.pickerTriggerText}>
                      {time || 'Select Time'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Field>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={date}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}

              <Field label="Venue / Location">
                <Input
                  value={venue}
                  onChangeText={setVenue}
                  placeholder="Enter exam venue"
                />
              </Field>

              <Field label="Preparation Notes (Optional)">
                <Input
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Add preparation notes"
                  multiline
                  style={{ minHeight: 80, alignItems: 'flex-start' }}
                  textAlignVertical="top"
                />
              </Field>
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
            >
              <Button variant="quiet" style={styles.modalBtn} onPress={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button
                style={styles.modalBtn}
                onPress={handleCreate}
                loading={submitting}
                disabled={!name.trim() || !subjectId || submitting}
              >
                Schedule Exam
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Performance Entry Modal */}
      <Modal visible={perfModalVisible} animationType="slide" transparent onRequestClose={() => setPerfModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Performance</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setPerfModalVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              {selectedExam && (
                <Text style={{ fontFamily: typography.sans.medium, color: colors.mutedForeground, marginBottom: spacing.md }}>
                  Exam: {selectedExam.name}
                </Text>
              )}

              <Field label="How did you perform?">
                <SelectPicker
                  value={perfRating}
                  onValueChange={setPerfRating}
                  options={PERFORMANCE_RATINGS}
                />
              </Field>

              <Field label="Your Reflection">
                <Input
                  value={perfReflection}
                  onChangeText={setPerfReflection}
                  placeholder="What went well? What needs improvement?"
                  multiline
                  style={{ minHeight: 80, alignItems: 'flex-start' }}
                  textAlignVertical="top"
                />
              </Field>

              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>Marks not available yet</Text>
                <Switch
                  value={marksPending}
                  onValueChange={setMarksPending}
                  trackColor={{ false: colors.border, true: colors.accent }}
                  thumbColor={Platform.OS === 'android' ? (marksPending ? colors.accent : '#f4f3f4') : undefined}
                />
              </View>

              {!marksPending && (
                <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
                  <Field label="Marks Obtained">
                    <Input
                      value={marksObtained}
                      onChangeText={setMarksObtained}
                      placeholder="e.g. 78"
                      keyboardType="numeric"
                    />
                  </Field>

                  <Field label="Maximum Marks">
                    <Input
                      value={maxMarks}
                      onChangeText={setMaxMarks}
                      placeholder="e.g. 100"
                      keyboardType="numeric"
                    />
                  </Field>

                  <View>
                    <Text style={{ fontFamily: typography.mono.bold, fontSize: 10, color: colors.mutedForeground, textTransform: 'uppercase', marginBottom: spacing.xs }}>
                      Percentage
                    </Text>
                    <View style={styles.percentageContainer}>
                      <Text style={styles.percentageText}>
                        {getPercentageString() || '—'}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            <View
              style={[
                styles.modalFooter,
                { paddingBottom: Math.max(insets.bottom, spacing.md) },
              ]}
            >
              <Button variant="quiet" style={styles.modalBtn} onPress={() => setPerfModalVisible(false)}>
                Cancel
              </Button>
              <Button
                style={styles.modalBtn}
                onPress={handleSavePerformance}
                loading={submitting}
                disabled={submitting}
              >
                Save
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    card: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacing.sm,
    },
    cardTitleBox: { flex: 1, marginRight: spacing.sm },
    typeBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.sm,
      marginBottom: 4,
    },
    typeBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 9,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
    },
    cardTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 20,
      color: colors.foreground,
    },
    cardSubject: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    countdownBadge: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '15',
      borderRadius: radii.lg,
      paddingHorizontal: 12,
      paddingVertical: 8,
      minWidth: 60,
    },
    urgentBadge: {
      backgroundColor: colors.destructive + '15',
    },
    pastBadge: {
      backgroundColor: colors.muted,
    },
    countdownNumber: {
      fontFamily: typography.mono.bold,
      fontSize: 16,
      color: colors.primary,
    },
    urgentText: {
      color: colors.destructive,
    },
    pastText: {
      color: colors.mutedForeground,
    },
    countdownLabel: {
      fontFamily: typography.sans.regular,
      fontSize: 9,
      color: colors.primary,
      textTransform: 'uppercase',
    },
    detailsGrid: {
      gap: 6,
      marginVertical: spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    detailText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.foreground,
    },
    notesBox: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
      backgroundColor: colors.background,
      borderRadius: radii.md,
      padding: spacing.sm,
      marginTop: spacing.xs,
    },
    notesText: {
      flex: 1,
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      lineHeight: 16,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    progressBox: {},
    progressText: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    deleteBtn: { minHeight: 30, paddingVertical: 2, paddingHorizontal: 10 },
    modalContainer: { flex: 1, justifyContent: 'flex-end' },
    modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,32,49,0.48)' },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '92%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 22,
      color: colors.foreground,
    },
    closeBtn: { minHeight: 36, paddingHorizontal: 8, paddingVertical: 6 },
    modalScroll: { padding: spacing.lg },
    dateTimeRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    pickerTrigger: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
    },
    pickerTriggerText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.foreground,
    },
    modalFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.md,
      padding: spacing.lg,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: `${colors.muted}33`,
    },
    modalBtn: { minWidth: 100 },
    completedBox: {
      marginTop: spacing.sm,
      backgroundColor: colors.background,
      borderRadius: radii.md,
      padding: spacing.sm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      gap: 4,
    },
    completedLabel: {
      fontFamily: typography.sans.semibold,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    completedValue: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.foreground,
    },
    completedValueBold: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.accent,
    },
    completedBadge: {
      alignSelf: 'flex-start',
      backgroundColor: '#10b981' + '15',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.sm,
      marginBottom: 4,
    },
    completedBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 9,
      color: '#10b981',
      textTransform: 'uppercase',
    },
    cardActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    actionBtn: {
      minHeight: 30,
      paddingVertical: 2,
      paddingHorizontal: 10,
    },
    switchRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      marginBottom: spacing.sm,
      gap: spacing.md,
    },
    switchLabel: {
      fontFamily: typography.sans.semibold,
      fontSize: 14,
      color: colors.foreground,
      flex: 1,
    },
    percentageContainer: {
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      height: 48,
      justifyContent: 'center',
    },
    percentageText: {
      fontFamily: typography.mono.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
      marginBottom: spacing.md,
      marginTop: spacing.sm,
    },
    tabButton: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    tabButtonActive: {
      borderBottomColor: colors.accent,
    },
    tabButtonText: {
      fontFamily: typography.sans.semibold,
      fontSize: 14,
      color: colors.mutedForeground,
    },
    tabButtonTextActive: {
      color: colors.accent,
      fontFamily: typography.sans.bold,
    },
  });

export default ExamsScreen;
