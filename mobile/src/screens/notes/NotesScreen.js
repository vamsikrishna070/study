import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import {
  FileText,
  Plus,
  X,
  Search,
  SlidersHorizontal,
  Mic,
  Pencil,
} from 'lucide-react-native';
import { getNotes, createNote, updateNote, deleteNote } from '../../api/notes';
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
import { AttachmentUploader } from '../../components/ui/AttachmentUploader';
import { AttachmentCard } from '../../components/ui/AttachmentCard';
import { VoiceRecorderModal } from '../../components/ui/VoiceRecorderModal';
import { globalAudioPlayer } from '../../services/audioPlayerService';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useStyles } from '../../theme/theme';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
  { label: 'Exam essential', value: 'exam' },
];

const FILTER_PRIORITY_OPTIONS = [
  { label: 'All priorities', value: '' },
  ...PRIORITY_OPTIONS,
];

const NotesScreen = ({ route, navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const { showError, showDeleteConfirm } = useAppDialog();

  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [data, setData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [filterSubjectId, setFilterSubjectId] = useState(paramSubjectId || '');
  const [filterPriority, setFilterPriority] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Note Modal State
  const [modalVisible, setModalVisible] = useState(paramOpenCreate);
  const [editingId, setEditingId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [customSubject, setCustomSubject] = useState('');
  const [customSubjectError, setCustomSubjectError] = useState('');
  const [topic, setTopic] = useState('');
  const [priority, setPriority] = useState('medium');
  const [tagsInput, setTagsInput] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Voice recording modal
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      const [notesRes, subsRes] = await Promise.all([
        getNotes(filterSubjectId || paramSubjectId),
        getSubjects(),
      ]);

      const notesList = notesRes.data || notesRes || [];
      const subsList = subsRes.data || subsRes || [];
      setData(notesList);
      setSubjects(subsList);

      if (!subjectId && subsList.length > 0) {
        setSubjectId(subsList[0]._id || subsList[0].id);
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else {
        setError('Failed to load notes.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => {
      globalAudioPlayer.stop();
    };
  }, [paramSubjectId, filterSubjectId]);

  useEffect(() => {
    if (paramOpenCreate) {
      openCreateModal();
    }
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [filterSubjectId]);

  const openCreateModal = () => {
    setEditingId(null);
    setTitle('');
    setContent('');
    setSubjectId(paramSubjectId || (subjects.length > 0 ? (subjects[0]._id || subjects[0].id) : 'other'));
    setCustomSubject('');
    setCustomSubjectError('');
    setTopic('');
    setPriority('medium');
    setTagsInput('');
    setAttachments([]);
    setModalVisible(true);
  };

  const openEditModal = (item) => {
    setEditingId(item._id || item.id);
    setTitle(item.title || '');
    setContent(item.content || '');
    const isCustom = !!item.customSubject || !item.subjectId;
    if (isCustom) {
      setSubjectId('other');
      setCustomSubject(item.customSubject || (typeof item.subject === 'string' && item.subject !== 'Unassigned' ? item.subject : ''));
    } else {
      setSubjectId(item.subjectId);
      setCustomSubject('');
    }
    setCustomSubjectError('');
    setTopic(item.topic || '');
    setPriority(item.priority || 'medium');
    setTagsInput((item.tags || []).join(', '));
    setAttachments(item.attachments || []);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      showError('Validation Error', 'Please enter a note title.');
      return;
    }
    if (!subjectId) {
      showError('Validation Error', 'Please select a subject for this note.');
      return;
    }

    if (subjectId === 'other') {
      const trimmedCustom = customSubject.trim();
      if (!trimmedCustom) {
        setCustomSubjectError('Please enter a subject name.');
        return;
      }
    }

    setSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        content: content.trim(),
        subjectId: subjectId === 'other' ? undefined : subjectId,
        customSubject: subjectId === 'other' ? customSubject.trim() : '',
        topic: topic.trim(),
        priority,
        tags: parsedTags,
        attachments,
      };

      if (editingId) {
        const res = await updateNote(editingId, payload);
        const updated = res.data || res;
        setData((prev) =>
          prev.map((item) =>
            (item._id || item.id) === editingId ? { ...item, ...updated } : item
          )
        );
      } else {
        const res = await createNote(payload);
        const created = res.data || res;
        if (created) {
          setData((prev) => [created, ...prev]);
        } else {
          await loadData();
        }
      }

      setModalVisible(false);
      setEditingId(null);
      setTitle('');
      setContent('');
      setTopic('');
      setPriority('medium');
      setTagsInput('');
      setAttachments([]);
      setCustomSubject('');
      setCustomSubjectError('');
    } catch (e) {
      showError('Error', e?.response?.data?.message || 'Failed to save note.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    showDeleteConfirm({
      title: 'Delete Note',
      message: 'Are you sure you want to remove this note? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteNote(id);
          setData((prev) => prev.filter((item) => (item._id || item.id) !== id));
        } catch (e) {
          showError('Delete Failed', 'Failed to delete note. Please try again.');
        }
      },
    });
  };

  const handleVoiceSave = (recording) => {
    setAttachments((prev) => [...prev, { type: 'recording', ...recording }]);
  };

  // Filter notes locally for search and priority
  const filteredNotes = data.filter((item) => {
    const subjectDisplayName = item.customSubject || item.subject?.name || item.subject || '';
    const matchesSearch =
      !search ||
      `${item.title} ${item.content} ${subjectDisplayName} ${item.topic || ''} ${(item.tags || []).join(' ')}`
        .toLowerCase()
        .includes(search.toLowerCase());

    const matchesPriority = !filterPriority || item.priority === filterPriority;

    return matchesSearch && matchesPriority;
  });

  const subjectOptions = [
    ...subjects.map((s) => ({
      label: `${s.name} (${s.code})`,
      value: s._id || s.id,
    })),
    { label: 'Other', value: 'other' },
  ];

  const filterSubjectOptions = [
    { label: 'All subjects', value: '' },
    ...subjects.map((s) => ({
      label: `${s.name} (${s.code})`,
      value: s._id || s.id,
    })),
  ];

  const getPriorityBadgeColor = (p) => {
    switch (p) {
      case 'exam':
        return colors.destructive;
      case 'high':
        return colors.accent;
      case 'medium':
        return '#b58a4a';
      case 'low':
      default:
        return colors.mutedForeground;
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={filteredNotes}
        keyExtractor={(item, idx) => item._id || item.id || idx.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow={paramSubjectId ? 'Subject Notes' : 'Your knowledge base'}
              title="Notes"
              detail="Capture ideas, explanations, formulas, and key concepts."
              action={
                <Button size="sm" onPress={openCreateModal}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  New note
                </Button>
              }
            />

            {/* Search & Filter Header */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputContainer}>
                <Search size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
                <Input
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search notes..."
                  style={styles.searchField}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <X size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.filterToggleBtn,
                  (filterPriority || filterSubjectId) && styles.filterToggleActive,
                ]}
                onPress={() => setShowFilters(!showFilters)}
                activeOpacity={0.7}
              >
                <SlidersHorizontal
                  size={18}
                  color={
                    filterPriority || filterSubjectId
                      ? colors.accent
                      : colors.mutedForeground
                  }
                />
              </TouchableOpacity>
            </View>

            {/* Expandable Filter Box */}
            {showFilters && (
              <View style={styles.filterBox}>
                <Field label="Filter by Subject">
                  <SelectPicker
                    value={filterSubjectId}
                    onValueChange={setFilterSubjectId}
                    options={filterSubjectOptions}
                    placeholder="All subjects"
                  />
                </Field>
                <Field label="Filter by Priority">
                  <SelectPicker
                    value={filterPriority}
                    onValueChange={setFilterPriority}
                    options={FILTER_PRIORITY_OPTIONS}
                    placeholder="All priorities"
                  />
                </Field>
              </View>
            )}

            <QueryState error={error} onRetry={loadData} label="Notes" />
          </>
        }
        ListEmptyComponent={
          !error && !loading ? (
            <EmptyState
              title={search || filterPriority ? 'No notes match filters' : 'No notes yet'}
              detail={
                search || filterPriority
                  ? 'Try adjusting your search query or priority filters.'
                  : 'Start building your knowledge base by creating your first note.'
              }
              icon={FileText}
              action={
                <Button onPress={openCreateModal}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Create note
                </Button>
              }
            />
          ) : null
        }
        renderItem={({ item }) => {
          const noteId = item._id || item.id;
          const priorityColor = getPriorityBadgeColor(item.priority);
          const atts = item.attachments || [];
          const displaySubject = item.customSubject || item.subject?.name || item.subject;

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <FileText size={20} color={colors.accent} />
                </View>
                {item.priority && (
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: priorityColor + '20', borderColor: priorityColor },
                    ]}
                  >
                    <Text style={[styles.badgeText, { color: priorityColor }]}>
                      {item.priority}
                    </Text>
                  </View>
                )}
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>

              {/* Subject and Topic Chips */}
              <View style={styles.chipRow}>
                {!!displaySubject && (
                  <Text style={styles.subjectChip}>
                    {displaySubject}
                  </Text>
                )}
                {!!item.topic && (
                  <Text style={styles.topicChip}>{item.topic}</Text>
                )}
              </View>

              {!!item.content && (
                <Text style={styles.cardPreview} numberOfLines={3}>
                  {item.content}
                </Text>
              )}

              {/* Tags */}
              {item.tags?.length > 0 && (
                <View style={styles.tagsRow}>
                  {item.tags.map((tag, i) => (
                    <Text key={i} style={styles.tagText}>
                      #{tag}
                    </Text>
                  ))}
                </View>
              )}

              {/* Attachments Preview */}
              {atts.length > 0 && (
                <View style={styles.attachmentsContainer}>
                  {atts.map((att, i) => (
                    <AttachmentCard key={i} attachment={att} readonly />
                  ))}
                </View>
              )}

              <View style={styles.cardFooter}>
                <Text style={styles.cardDate}>
                  {new Date(item.createdAt || item.updatedAt || Date.now()).toLocaleDateString()}
                </Text>
                <View style={styles.cardActionButtons}>
                  <Button
                    variant="outline"
                    onPress={() => openEditModal(item)}
                    style={styles.editBtn}
                  >
                    <Pencil size={13} color={colors.foreground} style={{ marginRight: 4 }} />
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => handleDelete(noteId)}
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

      {/* Note Create / Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Note' : 'New Note'}</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Field label="Title *">
                <Input value={title} onChangeText={setTitle} placeholder="Note title" />
              </Field>

              <View style={styles.gridRow}>
                <Field label="Subject *" style={{ flex: 1 }}>
                  <SelectPicker
                    value={subjectId}
                    onValueChange={(val) => {
                      setSubjectId(val);
                      if (val !== 'other') {
                        setCustomSubject('');
                        setCustomSubjectError('');
                      }
                    }}
                    options={subjectOptions}
                    placeholder="Select your subject"
                  />
                </Field>
                <Field label="Priority" style={{ width: 140 }}>
                  <SelectPicker
                    value={priority}
                    onValueChange={setPriority}
                    options={PRIORITY_OPTIONS}
                  />
                </Field>
              </View>

              {/* Custom Subject Input (when Other is selected) */}
              {subjectId === 'other' && (
                <Field label="Custom Subject *" error={customSubjectError}>
                  <Input
                    value={customSubject}
                    onChangeText={(text) => {
                      setCustomSubject(text);
                      if (text.trim().length > 0) {
                        setCustomSubjectError('');
                      }
                    }}
                    placeholder="Enter subject name"
                    autoFocus
                  />
                </Field>
              )}

              <Field label="Topic / Unit (optional)">
                <Input
                  value={topic}
                  onChangeText={setTopic}
                  placeholder="Enter topic"
                />
              </Field>

              <Field label="Tags (optional)">
                <Input
                  value={tagsInput}
                  onChangeText={setTagsInput}
                  placeholder="Add tags (comma separated)"
                />
              </Field>

              <Field label="Content (optional)">
                <Input
                  value={content}
                  onChangeText={setContent}
                  placeholder="Write your notes here (optional)"
                  multiline
                  style={{ minHeight: 140, alignItems: 'flex-start' }}
                  textAlignVertical="top"
                />
              </Field>

              {/* Attachments Section */}
              <Field label="Attachments & Media">
                <View style={styles.voiceBtnContainer}>
                  <TouchableOpacity
                    style={styles.recordVoiceBtn}
                    onPress={() => setVoiceModalVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Mic size={16} color={colors.accent} />
                    <Text style={styles.recordVoiceText}>Record Voice Note</Text>
                  </TouchableOpacity>
                </View>
                <AttachmentUploader
                  attachments={attachments}
                  onAttachmentsChange={setAttachments}
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
                onPress={handleSave}
                loading={submitting}
                disabled={
                  !title.trim() ||
                  !subjectId ||
                  (subjectId === 'other' && !customSubject.trim()) ||
                  submitting
                }
              >
                {editingId ? 'Update Note' : 'Save Note'}
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Voice Recording Modal */}
      <VoiceRecorderModal
        visible={voiceModalVisible}
        onClose={() => setVoiceModalVisible(false)}
        onSave={handleVoiceSave}
      />
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    searchInputContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.xl,
      paddingHorizontal: spacing.md,
      minHeight: 44,
    },
    searchField: {
      flex: 1,
      borderWidth: 0,
      minHeight: 40,
      paddingHorizontal: 0,
      backgroundColor: 'transparent',
    },
    filterToggleBtn: {
      width: 44,
      height: 44,
      borderRadius: radii.xl,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterToggleActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accent + '15',
    },
    filterBox: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
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
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: colors.accent + '20',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      paddingHorizontal: spacing.sm,
      paddingVertical: 3,
      borderRadius: radii.round,
      borderWidth: 1,
    },
    badgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      textTransform: 'uppercase',
    },
    cardTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 20,
      color: colors.foreground,
      marginBottom: spacing.xs,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: spacing.sm,
    },
    subjectChip: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.primary,
      backgroundColor: `${colors.primary}1A`,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
    },
    topicChip: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
    },
    cardPreview: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: spacing.sm,
    },
    tagText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.accent,
    },
    attachmentsContainer: {
      marginVertical: spacing.xs,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
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
    cardActionButtons: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    editBtn: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 12 },
    deleteBtn: { minHeight: 32, paddingVertical: 4, paddingHorizontal: 12 },
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
    voiceBtnContainer: {
      marginBottom: spacing.sm,
    },
    recordVoiceBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: colors.accent + '15',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.accent + '40',
    },
    recordVoiceText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 12,
      color: colors.accent,
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

export default NotesScreen;
