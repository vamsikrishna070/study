import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  ListChecks,
  Plus,
  X,
  Check,
  Calendar as CalendarIcon,
  Clock,
  Circle,
  CheckCircle2,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTasks, createTask, updateTask, deleteTask } from '../../api/tasks';
import { getSubjects } from '../../api/subjects';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useStyles } from '../../theme/theme';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Completed', value: 'completed' },
];

const TasksScreen = ({ route, navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const { showError, showDeleteConfirm } = useAppDialog();

  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [tasks, setTasks] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Filter
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [modalVisible, setModalVisible] = useState(paramOpenCreate);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [priority, setPriority] = useState('medium');
  const [duration, setDuration] = useState('45');
  const [dueDate, setDueDate] = useState(new Date());

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [tasksRes, subjectsRes] = await Promise.all([
        getTasks(paramSubjectId ? { subjectId: paramSubjectId } : {}),
        getSubjects(),
      ]);

      const tList = Array.isArray(tasksRes) ? tasksRes : tasksRes?.data || [];
      const sList = Array.isArray(subjectsRes) ? subjectsRes : subjectsRes?.data || [];

      setTasks(tList);
      setSubjects(sList);
    } catch (err) {
      if (err.response?.status === 401) {
        logout();
      } else {
        setError(err.response?.data?.message || 'Failed to load tasks.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [paramSubjectId, logout]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (paramOpenCreate) setModalVisible(true);
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!title.trim()) {
      showError('Validation Error', 'Task title is required.');
      return;
    }
    if (!subjectId) {
      showError('Validation Error', 'Please select a subject for this task.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.toISOString(),
        subjectId,
        priority,
        duration: Number(duration) || 45,
        status: 'pending',
      };

      const res = await createTask(payload);
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDuration('45');
      setDueDate(new Date());

      if (res.data) {
        setTasks((prev) => [res.data, ...prev]);
      } else {
        await loadData();
      }
    } catch (e) {
      showError('Error', e?.response?.data?.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleCompletion = async (task) => {
    const taskId = task._id || task.id;
    const isCompleted = task.status === 'completed';
    const nextStatus = isCompleted ? 'pending' : 'completed';

    // Optimistic UI update
    setTasks((prev) =>
      prev.map((t) => ((t._id || t.id) === taskId ? { ...t, status: nextStatus } : t))
    );

    try {
      await updateTask(taskId, { status: nextStatus });
    } catch (err) {
      showError('Update Error', 'Failed to update task completion status.');
      loadData();
    }
  };

  const handleDelete = (id) => {
    showDeleteConfirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteTask(id);
          setTasks((prev) => prev.filter((t) => (t._id || t.id) !== id));
        } catch (e) {
          showError('Delete Failed', 'Failed to delete task. Please try again.');
        }
      },
    });
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const current = new Date(dueDate);
      current.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDueDate(current);
    }
  };

  const onTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const current = new Date(dueDate);
      current.setHours(selectedTime.getHours(), selectedTime.getMinutes());
      setDueDate(current);
    }
  };

  const subjectOptions = subjects.map((s) => ({
    label: `${s.name} (${s.code})`,
    value: s._id || s.id,
  }));

  const filteredTasks = tasks.filter((t) => {
    if (statusFilter === 'pending') return t.status !== 'completed';
    if (statusFilter === 'completed') return t.status === 'completed';
    return true;
  });

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={filteredTasks}
        keyExtractor={(item, idx) => item._id || item.id || idx.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow="Accountability"
              title="Tasks"
              detail="Actionable study tasks and assignments to keep you on schedule."
              action={
                <Button size="sm" onPress={() => setModalVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Add task
                </Button>
              }
            />

            {/* Status Filter Segmented Controls */}
            <View style={styles.segmentContainer}>
              {STATUS_FILTERS.map((f) => {
                const isActive = statusFilter === f.value;
                return (
                  <TouchableOpacity
                    key={f.value}
                    style={[styles.segmentBtn, isActive && styles.segmentBtnActive]}
                    onPress={() => setStatusFilter(f.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.segmentText, isActive && styles.segmentTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <QueryState error={error} onRetry={loadData} label="Tasks" />
          </>
        }
        ListEmptyComponent={
          !error && !loading ? (
            <EmptyState
              title={statusFilter !== 'all' ? `No ${statusFilter} tasks` : 'No tasks planned'}
              detail="Create actionable study tasks with due dates to stay ahead."
              icon={ListChecks}
              action={
                <Button onPress={() => setModalVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Plan a task
                </Button>
              }
            />
          ) : null
        }
        renderItem={({ item }) => {
          const taskId = item._id || item.id;
          const isCompleted = item.status === 'completed';
          const isHighPriority = item.priority === 'high';

          return (
            <View style={[styles.taskCard, isCompleted && styles.taskCardCompleted]}>
              <View style={styles.taskHeaderRow}>
                <TouchableOpacity
                  style={styles.checkboxTouch}
                  onPress={() => handleToggleCompletion(item)}
                  activeOpacity={0.7}
                >
                  {isCompleted ? (
                    <CheckCircle2 size={22} color={colors.accent} />
                  ) : (
                    <Circle size={22} color={colors.mutedForeground} />
                  )}
                </TouchableOpacity>

                <View style={styles.taskTitleBox}>
                  <Text
                    style={[
                      styles.taskTitle,
                      isCompleted && styles.taskTitleDone,
                    ]}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.taskSubject}>
                    {item.subject?.name || item.subject || 'General'}
                  </Text>
                </View>

                <Button
                  variant="danger"
                  onPress={() => handleDelete(taskId)}
                  style={styles.deleteBtn}
                >
                  Delete
                </Button>
              </View>

              {!!item.description && (
                <Text style={styles.taskDescription} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              <View style={styles.taskFooter}>
                <View style={styles.metaBadge}>
                  <Text
                    style={[
                      styles.priorityLabel,
                      isHighPriority && { color: colors.destructive, fontFamily: typography.mono.bold },
                    ]}
                  >
                    {item.priority?.toUpperCase()} • {item.duration || item.estimatedDuration || 45} MINS
                  </Text>
                </View>
                <View style={styles.dueDateBadge}>
                  <CalendarIcon size={12} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                  <Text style={styles.dueDateText}>
                    {new Date(item.dueDate || Date.now()).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* Task Creation Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plan Study Task</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Field label="Task Title">
                <Input value={title} onChangeText={setTitle} placeholder="e.g. Read Chapter 4" />
              </Field>

              <Field label="Subject">
                <SelectPicker
                  value={subjectId}
                  onValueChange={setSubjectId}
                  options={subjectOptions}
                  placeholder="Select subject"
                />
              </Field>

              <View style={styles.gridRow}>
                <Field label="Priority" style={{ flex: 1 }}>
                  <SelectPicker
                    value={priority}
                    onValueChange={setPriority}
                    options={PRIORITY_OPTIONS}
                  />
                </Field>
                <Field label="Duration (mins)" style={{ width: 130 }}>
                  <Input
                    value={duration}
                    onChangeText={setDuration}
                    keyboardType="numeric"
                    placeholder="45"
                  />
                </Field>
              </View>

              <Field label="Due Date & Time">
                <View style={styles.dateTimeRow}>
                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowDatePicker(true)}
                    activeOpacity={0.7}
                  >
                    <CalendarIcon size={16} color={colors.accent} />
                    <Text style={styles.pickerTriggerText}>
                      {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.pickerTrigger}
                    onPress={() => setShowTimePicker(true)}
                    activeOpacity={0.7}
                  >
                    <Clock size={16} color={colors.accent} />
                    <Text style={styles.pickerTriggerText}>
                      {dueDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Field>

              {showDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange}
                />
              )}

              <Field label="Description (Optional)">
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add task notes or problem numbers..."
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
                disabled={!title.trim() || !subjectId || submitting}
              >
                Add Task
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
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 4,
      marginBottom: spacing.md,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: spacing.sm,
      alignItems: 'center',
      borderRadius: radii.lg,
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    segmentTextActive: {
      color: colors.primaryForeground,
      fontFamily: typography.sans.bold,
    },
    taskCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    taskCardCompleted: {
      opacity: 0.65,
    },
    taskHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
    },
    checkboxTouch: {
      paddingTop: 2,
    },
    taskTitleBox: {
      flex: 1,
    },
    taskTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 17,
      color: colors.foreground,
      lineHeight: 22,
    },
    taskTitleDone: {
      textDecorationLine: 'line-through',
      color: colors.mutedForeground,
    },
    taskSubject: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    taskDescription: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: spacing.xs,
      paddingLeft: 30,
    },
    taskFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder + '60',
      paddingLeft: 30,
    },
    metaBadge: {},
    priorityLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    dueDateBadge: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    dueDateText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    deleteBtn: { minHeight: 28, paddingVertical: 2, paddingHorizontal: 8 },
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
    gridRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
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
  });

export default TasksScreen;
