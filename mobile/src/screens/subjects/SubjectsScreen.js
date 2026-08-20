import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { BookOpen, Plus, X } from 'lucide-react-native';
import { getSubjects, createSubject, deleteSubject } from '../../api/subjects';
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

const SubjectsScreen = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('');
  const [faculty, setFaculty] = useState('');
  const [semester, setSemester] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  const loadSubjects = async () => {
    try {
      setError(null);
      const res = await getSubjects();
      setSubjects(res.data || res);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else if (e.request && !e.response) {
        setError('Unable to connect to server.');
      } else {
        setError('Failed to load subjects.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadSubjects(); }, []);
  const onRefresh = useCallback(() => { setRefreshing(true); loadSubjects(); }, []);

  const handleCreate = async () => {
    if (!name || !code) return;
    setSubmitting(true);
    try {
      const res = await createSubject({ name, code, credits: Number(credits), faculty, semester: Number(semester) });
      setVisible(false);
      setName(''); setCode(''); setCredits(''); setFaculty(''); setSemester('');
      
      // Update state immediately without relying on network delay
      if (res.data) {
        setSubjects(prev => [...prev, res.data]);
      } else {
        await loadSubjects();
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Subject', 'Are you sure you want to remove this subject?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteSubject(id);
          loadSubjects();
        } catch (e) {
          Alert.alert('Error', 'Failed to delete subject.');
        }
      }}
    ]);
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={subjects}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        keyExtractor={item => item._id || Math.random().toString()}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <PageHeading 
              eyebrow="Curriculum" 
              title="Subjects" 
              detail="Manage your courses and subjects for the semester."
              action={
                <Button onPress={() => setVisible(true)}>
                  <Plus size={18} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Add Subject
                </Button>
              }
            />
            <QueryState error={error} onRetry={loadSubjects} label="Subjects" />
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState 
              icon={BookOpen} 
              title="No subjects" 
              detail="You haven't added any subjects yet. Click the button above to add one." 
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card 
            key={item._id || Math.random().toString()} 
            style={styles.card} 
            onPress={() => navigation.navigate('SubjectDetail', { id: item._id, subject: item })}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardTitleContainer}>
                <Text style={styles.cardEyebrow}>{item.code}</Text>
                <Text style={styles.cardTitle}>{item.name}</Text>
              </View>
            </View>
            <View style={styles.cardDetails}>
              <Text style={styles.cardDetailText}>{item.credits} Credits</Text>
              <Text style={styles.cardDetailText}>•</Text>
              <Text style={styles.cardDetailText}>Sem {item.semester}</Text>
              <Text style={styles.cardDetailText}>•</Text>
              <Text style={styles.cardDetailText}>{item.faculty}</Text>
            </View>
            <View style={styles.cardActions}>
              <Button variant="danger" onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
                Remove
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
              <Text style={styles.modalTitle}>New Subject</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Field label="Subject Name">
                <Input value={name} onChangeText={setName} placeholder="e.g. Data Structures" />
              </Field>
              <Field label="Subject Code">
                <Input value={code} onChangeText={setCode} placeholder="e.g. CS201" />
              </Field>
              <Field label="Credits">
                <Input value={credits} onChangeText={setCredits} keyboardType="numeric" placeholder="e.g. 3" />
              </Field>
              <Field label="Faculty/Professor">
                <Input value={faculty} onChangeText={setFaculty} placeholder="e.g. Dr. Smith" />
              </Field>
              <Field label="Semester">
                <Input value={semester} onChangeText={setSemester} keyboardType="numeric" placeholder="e.g. 4" />
              </Field>
            </ScrollView>
            <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
              <Button variant="quiet" style={styles.modalBtn} onPress={() => setVisible(false)}>Cancel</Button>
              <Button style={styles.modalBtn} onPress={handleCreate} loading={submitting}>Create</Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md, padding: spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitleContainer: { flex: 1 },
  cardEyebrow: { fontFamily: typography.mono.medium, fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: colors.accent, marginBottom: 4 },
  cardTitle: { fontFamily: typography.serif.medium, fontSize: 22, color: colors.foreground, marginBottom: spacing.sm },
  cardDetails: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: spacing.lg },
  cardDetailText: { fontFamily: typography.sans.regular, fontSize: 13, color: colors.mutedForeground },
  cardActions: { borderTopWidth: 1, borderTopColor: colors.cardBorder, paddingTop: spacing.md, alignItems: 'flex-end' },
  deleteBtn: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,32,49,0.48)' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  modalTitle: { fontFamily: typography.serif.medium, fontSize: 24, color: colors.foreground },
  closeBtn: { minHeight: 40, paddingHorizontal: 10, paddingVertical: 8 },
  modalScroll: { padding: spacing.lg },
  modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.cardBorder, backgroundColor: `${colors.muted}33` },
  modalBtn: { minWidth: 100 }
});

export default SubjectsScreen;

