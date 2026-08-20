import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Text, TouchableOpacity, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { FileText, Plus, X } from 'lucide-react-native';
import { getNotes, createNote, deleteNote } from '../../api/notes';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../theme/theme';

const NotesScreen = ({ route, navigation }) => {
  const insets = useSafeAreaInsets();

  // Subject context passed from SubjectDetailScreen
  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modal State
  const [visible, setVisible] = useState(paramOpenCreate);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      const res = await getNotes(paramSubjectId);
      setData(res.data || res);
    } catch (e) {
      setError('Failed to load notes.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [paramSubjectId]);

  useEffect(() => {
    if (paramOpenCreate) setVisible(true);
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

  const handleCreate = async () => {
    if (!title || !content) {
      Alert.alert('Error', 'Please enter both title and content.');
      return;
    }
    if (!subjectId) {
      Alert.alert('Error', 'A subject is required. Please provide a subject ID.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await createNote({ title, content, subjectId });
      setVisible(false);
      setTitle('');
      setContent('');
      if (res.data) {
        setData(prev => [res.data, ...prev]);
      } else {
        await loadData();
      }
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to create note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    Alert.alert('Delete Note', 'Are you sure you want to remove this note?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteNote(id);
          setData(prev => prev.filter(item => item._id !== id && item.id !== id));
        } catch (e) {
          Alert.alert('Error', 'Failed to delete note.');
        }
      }}
    ]);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      activeOpacity={0.7}
      onLongPress={() => handleDelete(item._id || item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <FileText size={20} color={colors.secondary} />
        </View>
        {item.priority && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.priority}</Text>
          </View>
        )}
      </View>
      <Text style={styles.cardTitle}>{item.title}</Text>
      {!!item.subject?.name && <Text style={styles.subjectChip}>{item.subject.name}</Text>}
      <Text style={styles.cardPreview} numberOfLines={2}>
        {item.content || 'No content preview available.'}
      </Text>
      <View style={styles.cardFooter}>
        <Text style={styles.cardDate}>
          {new Date(item.createdAt || item.date || Date.now()).toLocaleDateString()}
        </Text>
        <Button variant="danger" onPress={() => handleDelete(item._id || item.id)} style={styles.deleteBtn}>
          Delete
        </Button>
      </View>
    </TouchableOpacity>
  );

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
        data={data}
        keyExtractor={(item, idx) => item._id || item.id || idx.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        ListHeaderComponent={
          <>
            <PageHeading 
              eyebrow={paramSubjectId ? "Subject Notes" : "Your knowledge base"} 
              title="Notes" 
              detail="Capture ideas, explanations, formulas, and key concepts."
              action={
                <Button size="sm" onPress={() => setVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} /> 
                  New note
                </Button>
              }
            />
            <QueryState error={error} onRetry={loadData} label="Notes" />
          </>
        }
        ListEmptyComponent={
          !error && !loading ? (
            <EmptyState 
              title="No notes yet"
              detail="Start building your knowledge base by creating your first note."
              icon={FileText}
              action={
                <Button onPress={() => setVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} /> 
                  Create note
                </Button>
              }
            />
          ) : null
        }
      />

      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContainer}>
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Note</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>
            <ScrollView style={styles.modalScroll}>
              <Field label="Note Title">
                <Input value={title} onChangeText={setTitle} placeholder="Enter note title" />
              </Field>
              <Field label="Content">
                <Input 
                  value={content} 
                  onChangeText={setContent} 
                  placeholder="Write your notes here..." 
                  multiline
                  style={{ minHeight: 120, alignItems: 'flex-start' }}
                  textAlignVertical="top"
                />
              </Field>
              {!paramSubjectId && (
                <Field label="Subject ID">
                  <Input 
                    value={subjectId} 
                    onChangeText={setSubjectId} 
                    placeholder="Select subject" 
                  />
                </Field>
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
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.accent + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    backgroundColor: colors.muted,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.round,
  },
  badgeText: {
    fontFamily: typography.mono.regular,
    fontSize: 9,
    textTransform: 'uppercase',
    color: colors.mutedForeground,
  },
  cardTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    marginBottom: spacing.xs,
  },
  subjectChip: {
    fontFamily: typography.sans.medium,
    fontSize: 11,
    color: colors.primary,
    backgroundColor: `${colors.primary}1A`,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.sm,
    marginBottom: spacing.xs,
  },
  cardPreview: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    lineHeight: 20,
    marginBottom: spacing.md,
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
  cardDate: {
    fontFamily: typography.mono.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    textTransform: 'uppercase',
  },
  deleteBtn: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 12 },
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

export default NotesScreen;
