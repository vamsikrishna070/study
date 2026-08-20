import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { CalendarDays, Plus, X, CalendarIcon, ClockIcon } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getExams, createExam, deleteExam } from '../../api/exams';
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
import { colors, typography, spacing, radii } from '../../theme/theme';

const ExamsScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Params
  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [visible, setVisible] = useState(paramOpenCreate);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [date, setDate] = useState(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  const [submitting, setSubmitting] = useState(false);

  const loadExams = async () => {
    try {
      setError(null);
      const res = await getExams();
      let data = res.data || res;
      if (paramSubjectId) {
        data = data.filter(e => e.subject?._id === paramSubjectId || e.subject === paramSubjectId);
      }
      setExams(data);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else if (e.request && !e.response) {
        setError('Unable to connect to server.');
      } else {
        setError('Failed to load exams.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadExams(); }, [paramSubjectId]);
  
  useEffect(() => {
    if (paramOpenCreate) setVisible(true);
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadExams(); }, []);

  const handleCreate = async () => {
    if (!title || !subjectId) {
      Alert.alert('Error', 'Please provide a title and a subject ID.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = { 
        name: title, // backend uses 'name' for exam title
        subjectId: subjectId, 
        date: date.toISOString() 
      };
      const res = await createExam(payload);
      setVisible(false);
      setTitle(''); setSubjectId(paramSubjectId || ''); setDate(new Date());
      if (res.data) {
        setExams(prev => [res.data, ...prev]);
      } else {
        await loadExams();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to schedule exam.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Exam', 'Are you sure you want to remove this exam?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteExam(id);
          setExams(prev => prev.filter(item => item._id !== id && item.id !== id));
        } catch (e) {
          Alert.alert('Error', 'Failed to delete exam.');
        }
      }}
    ]);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
      setDate(newDate);
    }
  };

  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(false);
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setHours(selectedDate.getHours(), selectedDate.getMinutes(), 0, 0);
      setDate(newDate);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={exams}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyExtractor={item => item._id || Math.random().toString()}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <PageHeading 
              eyebrow={paramSubjectId ? "Subject Assessment" : "Assessment"} 
              title="Exams" 
              detail="Upcoming tests and evaluations."
              action={
                <Button onPress={() => setVisible(true)}>
                  <Plus size={18} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Add Exam
                </Button>
              }
            />
            <QueryState error={error} onRetry={loadExams} label="Exams" />
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState 
              icon={CalendarDays} 
              title="No upcoming exams" 
              detail="You have no exams scheduled at the moment. Enjoy the break!" 
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardTitle}>{item.name || item.title}</Text>
                {item.subject && <Text style={styles.cardDetail}>{item.subject.name || item.subject}</Text>}
              </View>
            </View>
            <View style={styles.cardActions}>
              <Text style={styles.dateText}>{item.date ? new Date(item.date).toLocaleString() : 'Date TBD'}</Text>
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
              <Text style={styles.modalTitle}>New Exam</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Field label="Exam Title">
                <Input value={title} onChangeText={setTitle} placeholder="Enter exam name" />
              </Field>
              <Field label="Subject ID">
                <Input value={subjectId} onChangeText={setSubjectId} placeholder="Select subject" editable={!paramSubjectId} />
              </Field>
              
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Field label="Exam Date">
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowDatePicker(true)}>
                      <Text style={styles.pickerButtonText}>{date.toLocaleDateString()}</Text>
                      <CalendarIcon size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
                <View style={styles.halfField}>
                  <Field label="Exam Time">
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowTimePicker(true)}>
                      <Text style={styles.pickerButtonText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                      <ClockIcon size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </Field>
                </View>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={onDateChange}
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={date}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md, padding: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md },
  cardTitleContainer: { flex: 1 },
  cardTitle: { fontFamily: typography.sans.bold, fontSize: 16, color: colors.foreground, marginBottom: 2 },
  cardDetail: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.cardBorder },
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
});

export default ExamsScreen;
