import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
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
  Play,
  Pause,
  Square,
  RotateCcw,
  Bell,
  BellOff,
  Pencil,
  Trash2,
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
import {
  scheduleTaskPendingAlert,
  scheduleTaskDailyReminder,
  cancelTaskNotification,
  getAllScheduledNotifications,
} from '../../services/NotificationService';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
];

const STATUS_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Paused', value: 'paused' },
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

  const [statusFilter, setStatusFilter] = useState('all');

  const [modalVisible, setModalVisible] = useState(paramOpenCreate);
  const [editingTask, setEditingTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState(new Date());

  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTimeDate, setReminderTimeDate] = useState(() => {
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    return d;
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showReminderTimePicker, setShowReminderTimePicker] = useState(false);
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
    if (paramOpenCreate) {
      resetForm();
      setModalVisible(true);
    }
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setSubjectId(paramSubjectId || (subjects.length > 0 ? (subjects[0]._id || subjects[0].id) : ''));
    setPriority('medium');
    setDueDate(new Date());
    setReminderEnabled(false);
    const d = new Date();
    d.setHours(19, 0, 0, 0);
    setReminderTimeDate(d);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setTitle(task.title || '');
    setDescription(task.description || '');
    setSubjectId(task.subject?._id || task.subject?.id || task.subjectId || '');
    setPriority(task.priority || 'medium');
    setDueDate(task.dueDate ? new Date(task.dueDate) : new Date());
    setReminderEnabled(Boolean(task.reminderEnabled));

    if (task.reminderTime) {
      const [h, m] = task.reminderTime.split(':');
      const rt = new Date();
      rt.setHours(parseInt(h, 10) || 19, parseInt(m, 10) || 0, 0, 0);
      setReminderTimeDate(rt);
    } else {
      const d = new Date();
      d.setHours(19, 0, 0, 0);
      setReminderTimeDate(d);
    }
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Validation Error', 'Task title is required.');
      return;
    }

    setSubmitting(true);
    try {
      const hours = String(reminderTimeDate.getHours()).padStart(2, '0');
      const minutes = String(reminderTimeDate.getMinutes()).padStart(2, '0');
      const reminderTimeStr = `${hours}:${minutes}`;

      const dueTimeStr = `${String(dueDate.getHours()).padStart(2, '0')}:${String(dueDate.getMinutes()).padStart(2, '0')}`;

      let reminderId = editingTask?.reminderNotificationId || null;
      let pendingId = editingTask?.pendingStartNotificationId || null;

      if (reminderEnabled) {
        if (reminderId) await cancelTaskNotification(reminderId);
        reminderId = await scheduleTaskDailyReminder({
          _id: editingTask?._id || editingTask?.id,
          title: title.trim(),
          reminderEnabled: true,
          reminderTime: reminderTimeStr,
        });
      } else if (reminderId) {
        await cancelTaskNotification(reminderId);
        reminderId = null;
      }

      const tempTaskObj = {
        _id: editingTask?._id || editingTask?.id,
        title: title.trim(),
        status: editingTask?.status || 'pending',
        dueDate: dueDate.toISOString(),
        dueTime: dueTimeStr,
        scheduledStartAt: dueDate.toISOString(),
      };

      if (tempTaskObj.status === 'pending') {
        if (pendingId) await cancelTaskNotification(pendingId);
        pendingId = await scheduleTaskPendingAlert(tempTaskObj);
      }

      const payload = {
        title: title.trim(),
        description: description.trim(),
        dueDate: dueDate.toISOString(),
        dueTime: dueTimeStr,
        scheduledStartAt: dueDate.toISOString(),
        subjectId: subjectId || null,
        priority,
        reminderEnabled,
        reminderTime: reminderTimeStr,
        reminderFrequency: reminderEnabled ? 'daily' : 'none',
        reminderNotificationId: reminderId,
        pendingStartNotificationId: pendingId,
      };

      if (editingTask) {
        const taskId = editingTask._id || editingTask.id;
        const res = await updateTask(taskId, payload);
        const updated = res.data || { ...editingTask, ...payload };
        setTasks((prev) => prev.map((t) => ((t._id || t.id) === taskId ? updated : t)));
      } else {
        payload.status = 'pending';
        const res = await createTask(payload);
        if (res.data) {
          setTasks((prev) => [res.data, ...prev]);
        } else {
          setTasks((prev) => [payload, ...prev]);
        }
      }

      if (__DEV__) {
        const allNotifs = await getAllScheduledNotifications();
        console.log(`[TasksScreen] Currently scheduled notifications: ${allNotifs.length}`);
        allNotifs.forEach(n => console.log(` - ID: ${n.identifier}, Title: ${n.content.title}, Type: ${n.trigger.type}`));
      }

      setModalVisible(false);
      resetForm();
    } catch (e) {
      showError('Error', e?.response?.data?.message || 'Failed to save Task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartTask = async (task) => {
    const taskId = task._id || task.id;

    if (task.pendingStartNotificationId) {
      await cancelTaskNotification(task.pendingStartNotificationId);
    }

    const now = new Date();
    const updated = {
      ...task,
      status: 'in_progress',
      startedAt: task.startedAt || now.toISOString(),
      lastStartedAt: now.toISOString(),
      pendingStartNotificationId: '',
    };

    setTasks((prev) => prev.map((t) => ((t._id || t.id) === taskId ? updated : t)));

    try {
      await updateTask(taskId, {
        status: 'in_progress',
        startedAt: updated.startedAt,
        lastStartedAt: updated.lastStartedAt,
        pendingStartNotificationId: '',
      });
    } catch (err) {
      showError('Error', 'Failed to start task.');
      loadData();
    }
  };

  const handleStopTask = async (task) => {
    const taskId = task._id || task.id;
    const now = new Date();

    const updated = {
      ...task,
      status: 'paused',
      stoppedAt: now.toISOString(),
    };

    setTasks((prev) => prev.map((t) => ((t._id || t.id) === taskId ? updated : t)));

    try {
      await updateTask(taskId, {
        status: 'paused',
        stoppedAt: updated.stoppedAt,
      });
    } catch (err) {
      showError('Error', 'Failed to stop task.');
      loadData();
    }
  };

  const handleEndTask = async (task) => {
    const taskId = task._id || task.id;

    if (task.pendingStartNotificationId) {
      await cancelTaskNotification(task.pendingStartNotificationId);
    }
    if (task.reminderNotificationId) {
      await cancelTaskNotification(task.reminderNotificationId);
    }

    const now = new Date();
    const updated = {
      ...task,
      status: 'completed',
      completedAt: now.toISOString(),
      pendingStartNotificationId: '',
      reminderNotificationId: '',
    };

    setTasks((prev) => prev.map((t) => ((t._id || t.id) === taskId ? updated : t)));

    try {
      await updateTask(taskId, {
        status: 'completed',
        completedAt: updated.completedAt,
        pendingStartNotificationId: '',
        reminderNotificationId: '',
      });
    } catch (err) {
      showError('Error', 'Failed to end task.');
      loadData();
    }
  };

  const handleRestartTask = async (task) => {
    const taskId = task._id || task.id;

    const updated = {
      ...task,
      status: 'pending',
      completedAt: null,
    };

    setTasks((prev) => prev.map((t) => ((t._id || t.id) === taskId ? updated : t)));

    try {
      await updateTask(taskId, {
        status: 'pending',
        completedAt: null,
      });
    } catch (err) {
      showError('Error', 'Failed to restart task.');
      loadData();
    }
  };

  const handleDelete = (task) => {
    const id = task._id || task.id;
    showDeleteConfirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this Task? This action cannot be undone.',
      onConfirm: async () => {
        try {
          if (task.pendingStartNotificationId) {
            await cancelTaskNotification(task.pendingStartNotificationId);
          }
          if (task.reminderNotificationId) {
            await cancelTaskNotification(task.reminderNotificationId);
          }
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

  const onReminderTimeChange = (event, selectedTime) => {
    setShowReminderTimePicker(false);
    if (selectedTime) {
      setReminderTimeDate(selectedTime);
    }
  };

  const subjectOptions = subjects.map((s) => ({
    label: `${s.name} (${s.code})`,
    value: s._id || s.id,
  }));

  const filteredTasks = tasks.filter((t) => {
    const normStatus = t.status === 'in-progress' ? 'in_progress' : (t.status || 'pending');
    if (statusFilter === 'pending') return normStatus === 'pending';
    if (statusFilter === 'in_progress') return normStatus === 'in_progress';
    if (statusFilter === 'paused') return normStatus === 'paused';
    if (statusFilter === 'completed') return normStatus === 'completed';
    return true;
  });

  const formatTimeString = (dateIsoOrStr) => {
    if (!dateIsoOrStr) return '';
    const d = new Date(dateIsoOrStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDueDate = (dateObj, dueTimeStr) => {
    if (!dateObj) return 'No scheduled time';
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return 'No scheduled time';
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    const dateFormatted = isToday ? 'Today' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    let timeFormatted = '';
    if (dueTimeStr) {
      const [h, m] = dueTimeStr.split(':');
      const timeObj = new Date();
      timeObj.setHours(parseInt(h, 10) || 0, parseInt(m, 10) || 0);
      timeFormatted = `, ${timeObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    } else {
      timeFormatted = `, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}`;
    }

    return `Complete by: ${dateFormatted}${timeFormatted}`;
  };

  const formatReminderTime = (timeStr) => {
    if (!timeStr) return '7:00 PM';
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10) || 19, parseInt(m, 10) || 0);
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });
  };

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
              eyebrow="Execution & Progress"
              title="Tasks"
              detail="Manage your study tasks with explicit lifecycle controls: Start, Stop, and End."
              action={
                <Button size="sm" onPress={() => { resetForm(); setModalVisible(true); }}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Add Task
                </Button>
              }
            />

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
              title={statusFilter !== 'all' ? `No ${statusFilter} tasks` : 'No Tasks planned'}
              detail="Create actionable study tasks with scheduled start times and reminders to stay ahead."
              icon={ListChecks}
              action={
                <Button onPress={() => { resetForm(); setModalVisible(true); }}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Plan a Task
                </Button>
              }
            />
          ) : null
        }
        renderItem={({ item }) => {
          const normStatus = item.status === 'in-progress' ? 'in_progress' : (item.status || 'pending');
          const isPending = normStatus === 'pending';
          const isInProgress = normStatus === 'in_progress';
          const isPaused = normStatus === 'paused';
          const isCompleted = normStatus === 'completed';
          const isHighPriority = item.priority === 'high';

          return (
            <View style={[
              styles.taskCard,
              isInProgress && styles.taskCardInProgress,
              isPaused && styles.taskCardPaused,
              isCompleted && styles.taskCardCompleted,
            ]}>
              <View style={styles.taskMainRow}>

                <View style={styles.statusIconBox}>
                  {isPending && <Circle size={22} color={colors.mutedForeground} />}
                  {isInProgress && <Play size={22} color={colors.primary} fill={colors.primary} />}
                  {isPaused && <Pause size={22} color="#f59e0b" fill="#f59e0b" />}
                  {isCompleted && <Check size={22} color={colors.accent} strokeWidth={3} />}
                </View>

                <View style={styles.taskContentBox}>
                  <Text
                    style={[
                      styles.taskTitle,
                      isInProgress && styles.taskTitleInProgress,
                      isCompleted && styles.taskTitleDone,
                    ]}
                  >
                    {item.title}
                  </Text>

                  <View style={styles.subtextContainer}>
                    {isPending && (
                      <Text style={styles.dueDateText}>
                        {formatDueDate(item.scheduledStartAt || item.dueDate, item.dueTime)}
                      </Text>
                    )}
                    {isInProgress && (
                      <Text style={styles.inProgressSubtext}>
                        ▶ Started: {formatTimeString(item.lastStartedAt || item.startedAt || item.updatedAt)}
                      </Text>
                    )}
                    {isPaused && (
                      <Text style={styles.pausedSubtext}>
                        ⏸ Stopped: {formatTimeString(item.stoppedAt || item.updatedAt)}
                      </Text>
                    )}
                    {isCompleted && (
                      <Text style={styles.completedSubtext}>
                        ✓ Completed: {formatTimeString(item.completedAt || item.updatedAt)}
                      </Text>
                    )}

                    {!isCompleted && item.reminderEnabled && (
                      <View style={styles.reminderBadgeInline}>
                        <Bell size={12} color={colors.accent} style={{ marginRight: 4 }} />
                        <Text style={styles.reminderBadgeText}>
                          Daily at {formatReminderTime(item.reminderTime)}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!!item.description && (
                    <Text
                      style={[styles.taskDescription, isCompleted && styles.taskDescriptionDone]}
                      numberOfLines={2}
                    >
                      {item.description}
                    </Text>
                  )}

                  <View style={styles.taskMetaRow}>
                    {item.subject && (
                      <View style={styles.subjectBadge}>
                        <Text style={styles.subjectBadgeText}>
                          {item.subjectCode ? `${item.subjectCode} - ` : ''}{item.subject?.name || item.subject}
                        </Text>
                      </View>
                    )}
                    <View style={styles.priorityBadge}>
                      <Text
                        style={[
                          styles.priorityBadgeText,
                          isHighPriority && { color: colors.destructive },
                        ]}
                      >
                        {item.priority?.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.taskActionColumn}>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => openEditModal(item)}
                    activeOpacity={0.7}
                  >
                    <Pencil size={15} color={colors.mutedForeground} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconActionBtn}
                    onPress={() => handleDelete(item)}
                    activeOpacity={0.7}
                  >
                    <Trash2 size={15} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.lifecycleRow}>
                {isPending && (
                  <TouchableOpacity
                    style={[styles.lifecycleBtn, styles.btnStart]}
                    onPress={() => handleStartTask(item)}
                    activeOpacity={0.8}
                  >
                    <Play size={14} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.btnStartText}>START</Text>
                  </TouchableOpacity>
                )}

                {isInProgress && (
                  <>
                    <TouchableOpacity
                      style={[styles.lifecycleBtn, styles.btnStop]}
                      onPress={() => handleStopTask(item)}
                      activeOpacity={0.8}
                    >
                      <Pause size={14} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.btnStopText}>STOP</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.lifecycleBtn, styles.btnEnd]}
                      onPress={() => handleEndTask(item)}
                      activeOpacity={0.8}
                    >
                      <Square size={13} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.btnEndText}>END</Text>
                    </TouchableOpacity>
                  </>
                )}

                {isPaused && (
                  <>
                    <TouchableOpacity
                      style={[styles.lifecycleBtn, styles.btnStart]}
                      onPress={() => handleStartTask(item)}
                      activeOpacity={0.8}
                    >
                      <Play size={14} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.btnStartText}>START</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.lifecycleBtn, styles.btnEnd]}
                      onPress={() => handleEndTask(item)}
                      activeOpacity={0.8}
                    >
                      <Square size={13} color="#ffffff" fill="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.btnEndText}>END</Text>
                    </TouchableOpacity>
                  </>
                )}

                {isCompleted && (
                  <TouchableOpacity
                    style={[styles.lifecycleBtn, styles.btnRestart]}
                    onPress={() => handleRestartTask(item)}
                    activeOpacity={0.8}
                  >
                    <RotateCcw size={14} color={colors.foreground} style={{ marginRight: 6 }} />
                    <Text style={styles.btnRestartText}>RESTART</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingTask ? 'Edit Task' : 'Prepare Task'}
              </Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Field label="Task Title">
                <Input value={title} onChangeText={setTitle} placeholder="e.g. Prepare for Gen AI CLA" />
              </Field>

              <Field label="Subject">
                <SelectPicker
                  value={subjectId}
                  onValueChange={setSubjectId}
                  options={subjectOptions}
                  placeholder="Select a subject"
                />
              </Field>

              <Field label="Priority">
                <SelectPicker
                  value={priority}
                  onValueChange={setPriority}
                  options={PRIORITY_OPTIONS}
                />
              </Field>

              <Field label="Complete by Date & Time">
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
                      {dueDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Field>

              <View style={{ marginBottom: spacing.md, paddingHorizontal: 4 }}>
                <Text style={[styles.label, { color: colors.foreground, fontSize: 14, fontWeight: '600', marginBottom: 4 }]}>🔔 Deadline alert</Text>
                <Text style={{ fontSize: 13, color: colors.mutedForeground }}>
                  Automatic 1-hour-before notification.
                </Text>
              </View>

              <Field label="Task reminder (Optional recurring reminder)">
                <View style={styles.reminderConfigBox}>
                  <TouchableOpacity
                    style={styles.reminderOptionRow}
                    onPress={() => setReminderEnabled(false)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radioCircle, !reminderEnabled && styles.radioCircleActive]}>
                      {!reminderEnabled && <View style={styles.radioInner} />}
                    </View>
                    <BellOff size={16} color={!reminderEnabled ? colors.foreground : colors.mutedForeground} style={{ marginHorizontal: 8 }} />
                    <Text style={[styles.reminderOptionText, !reminderEnabled && styles.reminderOptionTextActive]}>
                      Off
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.reminderOptionRow}
                    onPress={() => setReminderEnabled(true)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radioCircle, reminderEnabled && styles.radioCircleActive]}>
                      {reminderEnabled && <View style={styles.radioInner} />}
                    </View>
                    <Bell size={16} color={reminderEnabled ? colors.accent : colors.mutedForeground} style={{ marginHorizontal: 8 }} />
                    <Text style={[styles.reminderOptionText, reminderEnabled && styles.reminderOptionTextActive]}>
                      Every 24 hours
                    </Text>

                    {reminderEnabled && (
                      <TouchableOpacity
                        style={styles.timeBadgeBtn}
                        onPress={() => setShowReminderTimePicker(true)}
                        activeOpacity={0.7}
                      >
                        <Clock size={14} color={colors.accent} style={{ marginRight: 4 }} />
                        <Text style={styles.timeBadgeText}>
                          {reminderTimeDate.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </View>
              </Field>

              <Field label="Description / Details">
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add details, links, or notes"
                  multiline
                  numberOfLines={3}
                  style={styles.textArea}
                />
              </Field>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button variant="quiet" onPress={() => setModalVisible(false)}>
                Cancel
              </Button>
              <Button onPress={handleSave} loading={submitting} disabled={submitting}>
                {editingTask ? 'Save Task Changes' : 'Create Task'}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display="default"
            onChange={onDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={dueDate}
            mode="time"
            display="default"
            onChange={onTimeChange}
          />
        )}

        {showReminderTimePicker && (
          <DateTimePicker
            value={reminderTimeDate}
            mode="time"
            display="default"
            onChange={onReminderTimeChange}
          />
        )}
      </Modal>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    listContent: {
      padding: spacing.md,
      paddingBottom: 100,
    },
    segmentContainer: {
      flexDirection: 'row',
      backgroundColor: colors.card,
      borderRadius: radii.lg,
      padding: 4,
      marginVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 8,
      alignItems: 'center',
      borderRadius: radii.md,
    },
    segmentBtnActive: {
      backgroundColor: colors.primary,
    },
    segmentText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
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
    taskCardInProgress: {
      borderColor: colors.primary,
      borderWidth: 1.5,
      backgroundColor: colors.primary + '08',
    },
    taskCardPaused: {
      borderColor: '#f59e0b',
      borderWidth: 1.5,
      backgroundColor: '#f59e0b08',
    },
    taskCardCompleted: {
      opacity: 0.75,
      backgroundColor: colors.background,
    },
    taskMainRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    statusIconBox: {
      paddingTop: 2,
      marginRight: spacing.sm,
    },
    taskContentBox: {
      flex: 1,
    },
    taskTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
      lineHeight: 20,
    },
    taskTitleInProgress: {
      color: colors.primary,
    },
    taskTitleDone: {
      textDecorationLine: 'line-through',
      color: colors.mutedForeground,
    },
    subtextContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'center',
      marginTop: 2,
      gap: spacing.xs,
    },
    dueDateText: {
      fontFamily: typography.mono.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    inProgressSubtext: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.primary,
    },
    pausedSubtext: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: '#f59e0b',
    },
    completedSubtext: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.accent,
    },
    reminderBadgeInline: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent + '15',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: radii.sm,
      marginLeft: 4,
    },
    reminderBadgeText: {
      fontFamily: typography.mono.medium,
      fontSize: 10,
      color: colors.accent,
    },
    taskDescription: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    taskDescriptionDone: {
      textDecorationLine: 'line-through',
    },
    taskMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
      gap: spacing.xs,
    },
    subjectBadge: {
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    subjectBadgeText: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.foreground,
    },
    priorityBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
    },
    priorityBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    taskActionColumn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: spacing.xs,
    },
    iconActionBtn: {
      padding: spacing.xs,
    },
    lifecycleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingTop: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder + '60',
    },
    lifecycleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      flex: 1,
    },
    btnStart: {
      backgroundColor: colors.primary,
    },
    btnStartText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    btnStop: {
      backgroundColor: '#f59e0b',
    },
    btnStopText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    btnEnd: {
      backgroundColor: colors.accent,
    },
    btnEndText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    btnRestart: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    btnRestartText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.foreground,
      letterSpacing: 0.5,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '90%',
      paddingBottom: spacing.lg,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    modalTitle: {
      fontFamily: typography.serif.bold,
      fontSize: 18,
      color: colors.foreground,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    modalScroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
    },
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
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    pickerTriggerText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.foreground,
      marginLeft: spacing.xs,
    },
    reminderConfigBox: {
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.sm,
      gap: spacing.xs,
    },
    reminderOptionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.xs,
    },
    radioCircle: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 2,
      borderColor: colors.mutedForeground,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioCircleActive: {
      borderColor: colors.accent,
    },
    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
    },
    reminderOptionText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    reminderOptionTextActive: {
      fontFamily: typography.sans.semibold,
      color: colors.foreground,
    },
    timeBadgeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.accent + '15',
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderRadius: radii.md,
      marginLeft: 'auto',
    },
    timeBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 12,
      color: colors.accent,
    },
    textArea: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    modalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
  });

export default TasksScreen;
