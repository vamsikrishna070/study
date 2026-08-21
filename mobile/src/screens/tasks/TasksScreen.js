import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, FlatList, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, RefreshControl } from 'react-native';
import { ListChecks, Plus, X, Check, CalendarIcon, ClockIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getTasks, createTask, updateTask, deleteTask } from '../../api/tasks';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const TasksScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  // Params
  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [visible, setVisible] = useState(paramOpenCreate);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);
  
  const loadTasks = async () => {
    try {
      setError(null);
      const res = await getTasks();
      // If we are filtering by subject context, filter them locally or backend (if supported)
      // Since `getTasks` doesn't currently take params, we'll filter here if paramSubjectId exists
      let data = res.data || res;
      if (paramSubjectId) {
        data = data.filter(t => t.subject?._id === paramSubjectId || t.subject === paramSubjectId);
      }
      setTasks(data);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else if (e.request && !e.response) {
        setError('Unable to connect to server.');
      } else {
        setError('Failed to load tasks.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadTasks(); }, [paramSubjectId]);
  
  useEffect(() => {
    if (paramOpenCreate) setVisible(true);
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadTasks(); }, []);

  const handleCreate = async () => {
    if (!title) return;
    setSubmitting(true);
    try {
      const payload = { 
        title, 
        description, 
        dueDate: dueDate.toISOString(),
        subjectId: paramSubjectId 
      };
      const res = await createTask(payload);
      setVisible(false); setTitle(''); setDescription(''); setDueDate(new Date());
      
      if (res.data) {
        setTasks(prev => [res.data, ...prev]);
      } else {
        await loadTasks();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleComplete = async (task) => {
    try {
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, completed: !task.completed } : t));
      await updateTask(task._id, { completed: !task.completed });
    } catch (e) {
      Alert.alert('Error', 'Failed to update task.');
      loadTasks();
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Task', 'Are you sure you want to remove this task?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteTask(id);
          loadTasks();
        } catch (e) {
          Alert.alert('Error', 'Failed to delete task.');
        }
      }}
    ]);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(dueDate);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDueDate(newDate);
    }
  };

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(dueDate);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setDueDate(newDate);
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={tasks}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyExtractor={item => item._id || Math.random().toString()}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <PageHeading 
              eyebrow={paramSubjectId ? "Subject Tasks" : "Workflow"} 
              title="Tasks" 
              detail="Track your assignments and pending work."
              action={
                <Button onPress={() => setVisible(true)}>
                  <Plus size={18} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Add Task
                </Button>
              }
            />
            <QueryState error={error} onRetry={loadTasks} label="Tasks" />
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState 
              icon={ListChecks} 
              title="No tasks" 
              detail="You don't have any pending tasks right now. Take a break or add a new one!" 
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={[styles.card, item.completed && styles.cardCompleted]}>
            <View style={styles.cardHeader}>
              <TouchableOpacity 
                style={[styles.checkbox, item.completed && styles.checkboxChecked]} 
                onPress={() => toggleComplete(item)}
                activeOpacity={0.8}
              >
                {item.completed && <Check size={14} color={colors.primaryForeground} />}
              </TouchableOpacity>
              <View style={styles.cardTitleContainer}>
                <Text style={[styles.cardTitle, item.completed && styles.textCompleted]}>{item.title}</Text>
                {!!item.description && <Text style={[styles.cardDetail, item.completed && styles.textCompleted]}>{item.description}</Text>}
              </View>
            </View>
            
            <View style={styles.cardActions}>
              <Text style={styles.dateText}>{item.dueDate ? `Due: ${new Date(item.dueDate).toLocaleString()}` : ''}</Text>
              <Button variant="danger" onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
                Delete
              </Button>
            </View>
          </Card>
        )}
      />

      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Field label="Task Title">
                <Input value={title} onChangeText={setTitle} placeholder="Enter task title" />
              </Field>
              <Field label="Description">
                <Input value={description} onChangeText={setDescription} placeholder="Add task details" />
              </Field>
              
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Field label="Due Date">
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                      <Text style={styles.pickerButtonText}>{dueDate.toLocaleDateString()}</Text>
                      <CalendarIcon size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
                <View style={styles.halfField}>
                  <Field label="Due Time">
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                      <Text style={styles.pickerButtonText}>{dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      <ClockIcon size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
              </View>

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
            </ScrollView>
            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Button variant="quiet" style={styles.modalBtn} onPress={() => setVisible(false)}>Cancel</Button>
              <Button style={styles.modalBtn} onPress={handleCreate} loading={submitting}>Save</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = useStyles(({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md, padding: spacing.md },
  cardCompleted: { opacity: 0.7, backgroundColor: `${colors.muted}40` },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.mutedForeground, marginRight: spacing.md, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontFamily: typography.sans.bold, fontSize: 16, color: colors.foreground, marginBottom: 2 },
  textCompleted: { textDecorationLine: 'line-through', color: colors.mutedForeground },
  cardDetail: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.cardBorder },
  dateText: { fontFamily: typography.mono.medium, fontSize: 11, color: colors.mutedForeground, letterSpacing: 0.5 },
  deleteBtn: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 12 },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,32,49,0.48)' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  modalTitle: { fontFamily: typography.serif.medium, fontSize: 24, color: colors.foreground },
  closeBtn: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8 },
  modalScroll: { padding: spacing.lg },
  row: { flexDirection: 'row', gap: spacing.md },
  halfField: { flex: 1 },
  pickerButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: radii.md, paddingHorizontal: spacing.md, height: 48 },
  pickerButtonText: { fontFamily: typography.sans.regular, fontSize: 16, color: colors.foreground },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: `${colors.muted}33` },
  modalBtn: { minWidth: 100 }
}));

export default TasksScreen;
