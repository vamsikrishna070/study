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
  Image,
} from 'react-native';
import {
  Library,
  Plus,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  ExternalLink,
  X,
  Star,
  Mic,
  UploadCloud,
} from 'lucide-react-native';
import { viewDocument } from '../../utils/documentViewer';
import { getResources, createResource, deleteResource, updateResource } from '../../api/resources';
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
import { RatingInput } from '../../components/ui/RatingInput';
import { AttachmentCard } from '../../components/ui/AttachmentCard';
import { VoiceRecorderModal } from '../../components/ui/VoiceRecorderModal';
import { pickAndUploadDocument, pickAndUploadImage } from '../../utils/fileUploader';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useStyles } from '../../theme/theme';

const RESOURCE_TYPES = [
  { label: 'Web Link', value: 'link' },
  { label: 'YouTube Video', value: 'youtube' },
  { label: 'File Upload', value: 'file' },
  { label: 'Voice Recording', value: 'recording' },
];

const WATCHED_OPTIONS = [
  { label: 'To explore', value: 'false' },
  { label: 'Completed', value: 'true' },
];

const ResourceIcon = ({ type, mimeType, color }) => {
  let IconComponent = ExternalLink;
  let iconColor = color || '#293656';

  if (type === 'youtube' || mimeType?.includes('youtube')) {
    IconComponent = Video; // Fallback since Youtube icon is not available
    iconColor = '#ff0000';
  } else if (type === 'recording' || mimeType?.includes('audio')) {
    IconComponent = Music;
    iconColor = '#8d6b8d';
  } else if (type === 'image' || mimeType?.includes('image')) {
    IconComponent = ImageIcon;
    iconColor = '#b58a4a';
  } else if (type === 'video' || mimeType?.includes('video')) {
    IconComponent = Video;
    iconColor = '#4b8f8b';
  } else if (type === 'file' || mimeType?.includes('pdf') || mimeType?.includes('document')) {
    IconComponent = FileText;
    iconColor = color || '#df6b47';
  }

  // Safety fallback: ensure IconComponent is valid
  if (!IconComponent) {
    IconComponent = ExternalLink;
    iconColor = color || '#293656';
  }

  return <IconComponent size={20} color={iconColor} />;
};

const ResourcesScreen = ({ route, navigation }) => {
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

  // Modal State
  const [modalVisible, setModalVisible] = useState(paramOpenCreate);
  const [resourceType, setResourceType] = useState('link');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [subjectId, setSubjectId] = useState(paramSubjectId || '');
  const [topic, setTopic] = useState('');
  const [description, setDescription] = useState('');
  const [rating, setRating] = useState(0);
  const [watched, setWatched] = useState('false');
  const [tagsInput, setTagsInput] = useState('');
  const [fileData, setFileData] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Voice recording modal
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      const [resRes, subsRes] = await Promise.all([
        getResources(paramSubjectId),
        getSubjects(),
      ]);

      setData(resRes.data || resRes || []);
      setSubjects(subsRes.data || subsRes || []);
    } catch (e) {
      if (e.response && e.response.status === 401) {
        setError('Session expired. Please log in again.');
        logout();
      } else {
        setError('Failed to load resources.');
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

  const handlePickDocument = async () => {
    try {
      setUploadingFile(true);
      const uploaded = await pickAndUploadDocument();
      if (uploaded) {
        setFileData(uploaded);
        if (!title.trim()) {
          setTitle(uploaded.originalName?.replace(/\.[^.]+$/, '') || 'Resource File');
        }
      }
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload file.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handlePickImage = async () => {
    try {
      setUploadingFile(true);
      const uploaded = await pickAndUploadImage();
      if (uploaded) {
        setFileData(uploaded);
        if (!title.trim()) {
          setTitle(uploaded.originalName?.replace(/\.[^.]+$/, '') || 'Resource Image');
        }
      }
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload image.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleVoiceSave = (recording) => {
    setFileData(recording);
    setRecordingDuration(recording.duration || 0);
    if (!title.trim()) {
      setTitle(recording.originalName || 'Voice Recording');
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      showError('Validation Error', 'Resource title is required.');
      return;
    }

    const isLinkType = resourceType === 'link' || resourceType === 'youtube';
    if (isLinkType && !url.trim()) {
      showError('Validation Error', 'URL is required for web / video links.');
      return;
    }
    if ((resourceType === 'file' || resourceType === 'recording') && !fileData) {
      showError('Validation Error', 'Please upload or record a file for this resource.');
      return;
    }

    setSubmitting(true);
    try {
      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload = {
        title: title.trim(),
        resourceType,
        url: isLinkType ? url.trim() : (fileData?.url || ''),
        subjectId: subjectId || null,
        topic: topic.trim(),
        description: description.trim(),
        rating: Number(rating) || 0,
        watched: watched === 'true',
        tags: parsedTags,
        fileData: fileData
          ? {
              url: fileData.url,
              publicId: fileData.publicId,
              originalName: fileData.originalName,
              mimeType: fileData.mimeType,
              size: fileData.size,
              duration: fileData.duration || recordingDuration || undefined,
            }
          : undefined,
      };

      const res = await createResource(payload);
      setModalVisible(false);
      setTitle('');
      setUrl('');
      setTopic('');
      setDescription('');
      setRating(0);
      setWatched('false');
      setTagsInput('');
      setFileData(null);
      setRecordingDuration(0);

      if (res.data) {
        setData((prev) => [res.data, ...prev]);
      } else {
        await loadData();
      }
    } catch (e) {
      showError('Error', e?.response?.data?.message || 'Failed to save resource.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    showDeleteConfirm({
      title: 'Delete Resource',
      message: 'Are you sure you want to remove this resource? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await deleteResource(id);
          setData((prev) => prev.filter((item) => (item._id || item.id) !== id));
        } catch (e) {
          showError('Error', 'Failed to delete resource.');
        }
      },
    });
  };

  const handleToggleWatched = async (item) => {
    const itemId = item._id || item.id;
    const nextWatched = !item.watched;

    setData((prev) =>
      prev.map((r) => ((r._id || r.id) === itemId ? { ...r, watched: nextWatched } : r))
    );

    try {
      await updateResource(itemId, { watched: nextWatched });
    } catch (err) {
      loadData();
    }
  };

  const handleOpenResource = async (item) => {
    const targetUrl = (item.fileData && item.fileData.url) || item.url;
    if (!targetUrl) {
      showError('Error', 'No URL or file available for this resource.');
      return;
    }

    await viewDocument(targetUrl, item.title || 'Resource');
  };

  const subjectOptions = [
    { label: 'No specific subject', value: '' },
    ...subjects.map((s) => ({
      label: `${s.name} (${s.code})`,
      value: s._id || s.id,
    })),
  ];

  const isLinkType = resourceType === 'link' || resourceType === 'youtube';
  const isFileType = resourceType === 'file';
  const isRecordingType = resourceType === 'recording';

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={data}
        keyExtractor={(item, idx) => item._id || item.id || idx.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow="A considered library"
              title="Resources"
              detail="Keep the best explanations close, not scattered across twenty tabs."
              action={
                <Button size="sm" onPress={() => setModalVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Save resource
                </Button>
              }
            />
            <QueryState error={error} onRetry={loadData} label="Resources" />
          </>
        }
        ListEmptyComponent={
          !error && !loading ? (
            <EmptyState
              title="Your library is empty"
              detail="Save videos, articles, docs, and problem sets as you find them."
              icon={Library}
              action={
                <Button onPress={() => setModalVisible(true)}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Save first resource
                </Button>
              }
            />
          ) : null
        }
        renderItem={({ item }) => {
          const resId = item._id || item.id;
          const isFile = !!item.fileData;
          const targetUrl = isFile ? item.fileData?.url : item.url;
          const isImg = item.fileData?.mimeType?.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(targetUrl || '');

          return (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <ResourceIcon
                    type={item.resourceType}
                    mimeType={item.fileData?.mimeType}
                    color={colors.primary}
                  />
                </View>
                <TouchableOpacity
                  style={[styles.badge, item.watched ? styles.badgeWatched : null]}
                  onPress={() => handleToggleWatched(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.badgeText, item.watched ? styles.badgeTextWatched : null]}>
                    {item.watched ? 'completed' : 'to explore'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.cardTitle}>{item.title}</Text>

              {/* Subject chip & Rating */}
              <View style={styles.metaRow}>
                {!!(item.subject?.name || item.subject) && (
                  <Text style={styles.subjectChip}>
                    {item.subject?.name || item.subject}
                  </Text>
                )}
                {item.rating > 0 && (
                  <View style={styles.ratingBox}>
                    <Star size={13} color="#eab308" fill="#eab308" />
                    <Text style={styles.ratingText}>{item.rating}/5</Text>
                  </View>
                )}
              </View>

              {!!item.description && (
                <Text style={styles.cardPreview} numberOfLines={2}>
                  {item.description}
                </Text>
              )}

              {/* Image thumbnail preview if image */}
              {isImg && targetUrl && (
                <Image
                  source={{ uri: targetUrl }}
                  style={styles.cardImagePreview}
                  resizeMode="cover"
                />
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

              <View style={styles.cardFooter}>
                <TouchableOpacity
                  style={styles.openBtn}
                  onPress={() => handleOpenResource(item)}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={14} color={colors.accent} />
                  <Text style={styles.openBtnText}>
                    {isFile ? 'View File' : 'Open Resource'}
                  </Text>
                </TouchableOpacity>
                <Button
                  variant="danger"
                  onPress={() => handleDelete(resId)}
                  style={styles.deleteBtn}
                >
                  Delete
                </Button>
              </View>
            </View>
          );
        }}
      />

      {/* Save Resource Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Save a Resource</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={() => setModalVisible(false)}>
                <X size={20} color={colors.foreground} />
              </Button>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <View style={styles.gridRow}>
                <Field label="Resource Type" style={{ flex: 1 }}>
                  <SelectPicker
                    value={resourceType}
                    onValueChange={(val) => {
                      setResourceType(val);
                      setFileData(null);
                    }}
                    options={RESOURCE_TYPES}
                  />
                </Field>
                <Field label="Subject" style={{ flex: 1.2 }}>
                  <SelectPicker
                    value={subjectId}
                    onValueChange={setSubjectId}
                    options={subjectOptions}
                    placeholder="Optional"
                  />
                </Field>
              </View>

              <Field label="Title">
                <Input value={title} onChangeText={setTitle} placeholder="Enter resource title" />
              </Field>

              {/* Conditional Input based on Resource Type */}
              {isLinkType && (
                <Field label={resourceType === 'youtube' ? 'YouTube URL' : 'Web Link URL'}>
                  <Input
                    value={url}
                    onChangeText={setUrl}
                    placeholder="Paste a link"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </Field>
              )}

              {isFileType && (
                <Field label="Upload File">
                  {fileData ? (
                    <AttachmentCard
                      attachment={fileData}
                      onRemove={() => setFileData(null)}
                    />
                  ) : (
                    <View style={styles.uploadRow}>
                      <TouchableOpacity
                        style={[styles.uploadBox, uploadingFile && styles.disabled]}
                        onPress={handlePickDocument}
                        disabled={uploadingFile}
                        activeOpacity={0.7}
                      >
                        <UploadCloud size={20} color={colors.accent} />
                        <Text style={styles.uploadBoxText}>Pick Document (PDF/DOCX)</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.uploadBox, uploadingFile && styles.disabled]}
                        onPress={handlePickImage}
                        disabled={uploadingFile}
                        activeOpacity={0.7}
                      >
                        <ImageIcon size={20} color={colors.accent} />
                        <Text style={styles.uploadBoxText}>Pick Image</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </Field>
              )}

              {isRecordingType && (
                <Field label="Voice Recording">
                  {fileData ? (
                    <AttachmentCard
                      attachment={{
                        type: 'recording',
                        originalName: fileData.originalName || 'Voice Recording',
                        mimeType: 'audio/m4a',
                        duration: recordingDuration,
                        url: fileData.url,
                      }}
                      onRemove={() => {
                        setFileData(null);
                        setRecordingDuration(0);
                      }}
                    />
                  ) : (
                    <TouchableOpacity
                      style={styles.recordAudioBox}
                      onPress={() => setVoiceModalVisible(true)}
                      activeOpacity={0.7}
                    >
                      <Mic size={22} color={colors.accent} />
                      <Text style={styles.recordAudioText}>Tap to Record Audio</Text>
                    </TouchableOpacity>
                  )}
                </Field>
              )}

              <View style={styles.gridRow}>
                <Field label="Rating" style={{ flex: 1.2 }}>
                  <RatingInput value={rating} onValueChange={setRating} showLabel={false} />
                </Field>
                <Field label="Status" style={{ flex: 1 }}>
                  <SelectPicker
                    value={watched}
                    onValueChange={setWatched}
                    options={WATCHED_OPTIONS}
                  />
                </Field>
              </View>

              <Field label="Topic / Concept (Optional)">
                <Input value={topic} onChangeText={setTopic} placeholder="Enter topic" />
              </Field>

              <Field label="Tags (Comma separated)">
                <Input value={tagsInput} onChangeText={setTagsInput} placeholder="Add tags" />
              </Field>

              <Field label="Description (Optional)">
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe this resource"
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
                disabled={!title.trim() || submitting || uploadingFile}
              >
                Save Resource
              </Button>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Voice Recorder Modal */}
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
      alignItems: 'center',
      marginBottom: spacing.xs,
    },
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: colors.muted + '80',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.round,
    },
    badgeWatched: {
      backgroundColor: colors.accent + '20',
    },
    badgeText: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      textTransform: 'uppercase',
      color: colors.mutedForeground,
    },
    badgeTextWatched: {
      color: colors.accent,
      fontFamily: typography.mono.bold,
    },
    cardTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 20,
      color: colors.foreground,
      marginTop: spacing.xs,
      marginBottom: 2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginVertical: 4,
    },
    subjectChip: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.primary,
      backgroundColor: `${colors.primary}1A`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    ratingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    ratingText: {
      fontFamily: typography.mono.medium,
      fontSize: 11,
      color: colors.foreground,
    },
    cardPreview: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
      marginTop: spacing.xs,
      marginBottom: spacing.sm,
    },
    cardImagePreview: {
      height: 120,
      width: '100%',
      borderRadius: radii.lg,
      marginVertical: spacing.xs,
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginVertical: spacing.xs,
    },
    tagText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.accent,
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
    openBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 4,
    },
    openBtnText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 13,
      color: colors.accent,
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
    gridRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    uploadRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    uploadBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    disabled: { opacity: 0.5 },
    uploadBoxText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.foreground,
    },
    recordAudioBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.accent + '60',
      backgroundColor: colors.accent + '10',
      borderRadius: radii.lg,
      paddingVertical: spacing.md,
    },
    recordAudioText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 13,
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

export default ResourcesScreen;
