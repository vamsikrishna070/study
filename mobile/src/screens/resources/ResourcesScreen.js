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
  Linking,
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
  CloudUpload,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react-native';
import { viewDocument } from '../../utils/documentViewer';
import { getAttachmentKind, getKindLabel, getOpenLabel, openAttachment } from '../../utils/attachmentHelper';
import { formatFileSize } from '../../components/ui/AttachmentCard';
import { globalAudioPlayer } from '../../services/audioPlayerService';
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
    IconComponent = Video;
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

  if (!IconComponent) {
    IconComponent = ExternalLink;
    iconColor = color || '#293656';
  }

  return <IconComponent size={20} color={iconColor} />;
};

const ResourceAudioBar = ({ url, title, resourceId }) => {
  const { colors, typography, radii } = useAppTheme();
  const [playbackState, setPlaybackState] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleToggle = async () => {
    if (!url) {
      setErrorMsg('No audio URL found for this resource.');
      return;
    }

    if (playbackState === 'playing') {
      await globalAudioPlayer.pause();
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      await globalAudioPlayer.resume();
      setPlaybackState('playing');
    } else {
      setErrorMsg('');
      setPlaybackState('loading');
      await globalAudioPlayer.play(url, (update) => {
        if (update.status === 'error') {
          setPlaybackState('error');
          setErrorMsg(update.error || 'Failed to play audio');
        } else {
          setPlaybackState(update.status);
        }
      });
    }
  };

  return (
    <View style={{ marginTop: 8, marginBottom: 4 }}>
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: playbackState === 'playing' ? colors.primary : `${colors.primary}14`,
          borderRadius: radii.md,
          paddingVertical: 9,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: playbackState === 'playing' ? colors.primary : `${colors.primary}30`,
        }}
        onPress={handleToggle}
        activeOpacity={0.7}
      >
        {playbackState === 'loading' ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
        ) : playbackState === 'playing' ? (
          <Pause size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />
        ) : playbackState === 'paused' ? (
          <Play size={16} color={colors.primary} style={{ marginRight: 8 }} />
        ) : playbackState === 'finished' ? (
          <RotateCcw size={16} color={colors.primary} style={{ marginRight: 8 }} />
        ) : (
          <Play size={16} color={colors.primary} style={{ marginRight: 8 }} />
        )}

        <Text
          style={{
            fontFamily: typography.sans.bold,
            fontSize: 13,
            color: playbackState === 'playing' ? colors.primaryForeground : colors.primary,
          }}
        >
          {playbackState === 'loading'
            ? 'Loading...'
            : playbackState === 'playing'
            ? 'Pause'
            : playbackState === 'paused'
            ? 'Resume'
            : playbackState === 'finished'
            ? 'Play Again'
            : 'Play Voice Note'}
        </Text>
      </TouchableOpacity>
      {Boolean(errorMsg) && (
        <Text style={{ color: colors.destructive, fontSize: 11, textAlign: 'center', marginTop: 4 }}>
          {errorMsg}
        </Text>
      )}
    </View>
  );
};

const ResourcesScreen = ({ route, navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const { showError, showDeleteConfirm, showSuccess } = useAppDialog();

  const paramSubjectId = route?.params?.subjectId || null;
  const paramOpenCreate = route?.params?.openCreate || false;

  const [data, setData] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const [modalVisible, setModalVisible] = useState(paramOpenCreate);
  const [editingId, setEditingId] = useState(null);
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
  const [attachments, setAttachments] = useState([]);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [uploadingFile, setUploadingFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const closeAndResetModal = () => {
    setModalVisible(false);
    setEditingId(null);
    setTitle('');
    setUrl('');
    setTopic('');
    setDescription('');
    setRating(0);
    setWatched('false');
    setTagsInput('');
    setFileData(null);
    setAttachments([]);
    setRecordingDuration(0);
  };

  const handleEdit = (item) => {
    setEditingId(item._id || item.id);
    setTitle(item.title || '');
    setResourceType(item.resourceType || 'file');
    setUrl(item.url || item.fileData?.url || '');
    setSubjectId(item.subject?._id || item.subject?.id || item.subject || '');
    setTopic(item.topic || '');
    setDescription(item.description || '');
    setRating(item.rating || 0);
    setWatched(item.watched ? 'true' : 'false');
    setTagsInput((item.tags || []).join(', '));

    let atts = item.attachments || [];
    if (atts.length === 0 && item.fileData && item.resourceType !== 'link' && item.resourceType !== 'youtube') {
      atts = [{
        id: item.fileData.publicId || 'legacy',
        name: item.fileData.originalName || item.title,
        url: item.fileData.url,
        mimeType: item.fileData.mimeType,
        type: item.resourceType || 'file',
        size: item.fileData.size
      }];
    }
    setAttachments(atts);
    setFileData(null);
    setRecordingDuration(0);
    setModalVisible(true);
  };

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
    return () => {
      globalAudioPlayer.stop();
    };
  }, [paramSubjectId]);

  useEffect(() => {
    if (paramOpenCreate) setModalVisible(true);
  }, [paramOpenCreate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [paramSubjectId]);

  const addAttachment = (item) => {
    const newAtt = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
      publicId: item.publicId,
      url: item.url,
      originalName: item.originalName || item.name,
      name: item.originalName || item.name,
      mimeType: item.mimeType,
      type: item.mimeType?.startsWith('image/') ? 'image' : item.mimeType?.startsWith('audio/') ? 'audio' : 'file',
      size: item.size,
      duration: item.duration,
    };
    setAttachments((prev) => [...prev, newAtt]);
    setFileData(newAtt);
    if (!title.trim()) {
      setTitle(item.originalName?.replace(/\.[^.]+$/, '') || 'Resource File');
    }
  };

  const handlePickDocument = async () => {
    try {
      setUploadingFile(true);
      const uploaded = await pickAndUploadDocument();
      if (uploaded) addAttachment(uploaded);
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
      if (uploaded) addAttachment(uploaded);
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload image.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleVoiceSave = (recording) => {
    addAttachment({
      ...recording,
      mimeType: recording.mimeType || 'audio/m4a',
      originalName: recording.originalName || 'Voice Recording',
    });
    setRecordingDuration(recording.duration || 0);
  };

  const removeAttachment = (idx) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
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

    const finalAttachments = attachments.length > 0 ? attachments : fileData ? [fileData] : [];

    if ((resourceType === 'file' || resourceType === 'recording') && finalAttachments.length === 0) {
      showError('Validation Error', 'Please upload or record at least one file for this resource.');
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
        url: isLinkType ? url.trim() : (finalAttachments[0]?.url || ''),
        subjectId: subjectId || null,
        topic: topic.trim(),
        description: description.trim(),
        rating: Number(rating) || 0,
        watched: watched === 'true',
        tags: parsedTags,
        attachments: finalAttachments,
        fileData: finalAttachments[0]
          ? {
              url: finalAttachments[0].url,
              publicId: finalAttachments[0].publicId,
              originalName: finalAttachments[0].originalName || finalAttachments[0].name,
              mimeType: finalAttachments[0].mimeType,
              size: finalAttachments[0].size,
              duration: finalAttachments[0].duration || recordingDuration || undefined,
            }
          : undefined,
      };

      if (editingId) {
        await updateResource(editingId, payload);
        closeAndResetModal();
        await loadData();
      } else {
        const res = await createResource(payload);
        closeAndResetModal();
        if (res.data) {
          setData((prev) => [res.data, ...prev]);
        } else {
          await loadData();
        }
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

    try {
      await viewDocument(targetUrl, item.title || 'Resource');
    } catch (e) {
      showError('Couldn’t Open Document', e?.message || 'Unable to open this document.');
    }
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
          const isLink = item.resourceType === 'link' || item.resourceType === 'youtube';
          const attList = isLink ? [] : (item.attachments && item.attachments.length > 0)
            ? item.attachments
            : (item.fileData?.url || item.url)
            ? [{
                id: item.fileData?.publicId || 'legacy',
                name: item.fileData?.originalName || item.title,
                url: item.fileData?.url || item.url,
                mimeType: item.fileData?.mimeType || 'application/pdf',
                type: item.resourceType || 'file',
                size: item.fileData?.size || 0
              }]
            : [];

          const handleRemoveSingleAttachment = (attIdx) => {
            const attToDelete = attList[attIdx];
            showDeleteConfirm({
              title: 'Delete File?',
              message: `Are you sure you want to delete:\n\n"${attToDelete.name || attToDelete.originalName || 'Attachment'}"`,
              onConfirm: async () => {
                const updatedAtts = attList.filter((_, idx) => idx !== attIdx);
                try {
                  await updateResource(resId, { attachments: updatedAtts });
                  setData((prev) =>
                    prev.map((r) => ((r._id || r.id) === resId ? { ...r, attachments: updatedAtts } : r))
                  );
                  showSuccess('Deleted', 'File has been deleted successfully.');
                } catch (e) {
                  showError('Error', 'Failed to remove attachment.');
                }
              }
            });
          };

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

              <View style={styles.metaRow}>
                {!!(item.subjectCode ? `${item.subjectCode} - ${item.subject}` : (item.subject?.name || item.subject)) && (
                  <Text style={styles.subjectChip}>
                    {item.subjectCode ? `${item.subjectCode} - ${item.subject}` : (item.subject?.name || item.subject)}
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

              {attList.length > 0 && (
                <View style={{ marginTop: 10, gap: 8 }}>
                  <Text style={{ fontFamily: typography.mono.bold, fontSize: 10, color: colors.mutedForeground, letterSpacing: 0.8 }}>
                    ATTACHMENTS ({attList.length})
                  </Text>
                  {attList.map((att, attIdx) => {
                    const attUrl = att.url;
                    const kind = getAttachmentKind(att);
                    const kindLabel = getKindLabel(kind);
                    const openLabel = getOpenLabel(kind);
                    const isAudioKind = kind === 'audio';
                    const isImageKind = kind === 'image';
                    const sizeText = formatFileSize(att.size);

                    const KindIcon = kind === 'pdf' ? FileText
                      : kind === 'image' ? ImageIcon
                      : kind === 'audio' ? Music
                      : kind === 'video' ? Video
                      : FileText;
                    const iconColor = kind === 'pdf' ? colors.accent
                      : kind === 'image' ? '#b58a4a'
                      : kind === 'audio' ? '#8d6b8d'
                      : kind === 'video' ? '#4b8f8b'
                      : colors.mutedForeground;

                    const handleOpen = async () => {
                      if (!attUrl) return;
                      try {
                        await openAttachment(att);
                      } catch (e) {
                        showError('Could not open', e?.message || 'Unable to open this file.');
                      }
                    };

                    return (
                      <View
                        key={att.id || att._id || attIdx}
                        style={{
                          backgroundColor: colors.background,
                          borderRadius: radii.md,
                          padding: 12,
                          borderWidth: 1,
                          borderColor: colors.cardBorder,
                        }}
                      >

                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{
                            width: 34, height: 34, borderRadius: radii.sm,
                            backgroundColor: `${iconColor}18`,
                            alignItems: 'center', justifyContent: 'center', marginRight: 10,
                          }}>
                            <KindIcon size={18} color={iconColor} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontFamily: typography.sans.medium, fontSize: 13, color: colors.foreground }} numberOfLines={1}>
                              {att.name || att.originalName || 'Attachment'}
                            </Text>
                            <Text style={{ fontFamily: typography.mono.regular, fontSize: 11, color: colors.mutedForeground, marginTop: 1 }}>
                              {kindLabel}{sizeText ? ` • ${sizeText}` : ''}
                            </Text>
                          </View>
                        </View>

                        {isImageKind && attUrl && (
                          <Image
                            source={{ uri: attUrl }}
                            style={{ height: 100, borderRadius: radii.sm, marginTop: 8 }}
                            resizeMode="cover"
                          />
                        )}

                        {isAudioKind && attUrl && (
                          <ResourceAudioBar url={attUrl} title={att.name || item.title} />
                        )}

                        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 10, gap: 10 }}>
                          {!isAudioKind && attUrl && (
                            <TouchableOpacity
                              onPress={handleOpen}
                              activeOpacity={0.7}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              style={{
                                flexDirection: 'row', alignItems: 'center',
                                paddingVertical: 6, paddingHorizontal: 14,
                                backgroundColor: `${colors.accent}15`,
                                borderRadius: radii.sm, borderWidth: 1, borderColor: `${colors.accent}30`,
                              }}
                            >
                              <ExternalLink size={14} color={colors.accent} style={{ marginRight: 5 }} />
                              <Text style={{ fontFamily: typography.sans.semiBold, fontSize: 12, color: colors.accent }}>{openLabel}</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={() => handleRemoveSingleAttachment(attIdx)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={{
                              flexDirection: 'row', alignItems: 'center',
                              paddingVertical: 6, paddingHorizontal: 14,
                              backgroundColor: `${colors.destructive}12`,
                              borderRadius: radii.sm, borderWidth: 1, borderColor: `${colors.destructive}25`,
                            }}
                          >
                            <X size={14} color={colors.destructive} style={{ marginRight: 5 }} />
                            <Text style={{ fontFamily: typography.sans.semiBold, fontSize: 12, color: colors.destructive }}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {isLink && (item.url || item.fileData?.url) && (
                <View style={{ marginTop: 10, padding: 12, backgroundColor: colors.muted + '20', borderRadius: radii.md, borderWidth: 1, borderColor: colors.cardBorder }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <ExternalLink size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={{ fontFamily: typography.sans.semiBold, fontSize: 14, color: colors.foreground }}>Link</Text>
                  </View>
                  <Text style={{ fontFamily: typography.sans.regular, fontSize: 13, color: colors.primary, marginBottom: 8 }} numberOfLines={2}>
                    {item.url || item.fileData?.url}
                  </Text>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, backgroundColor: colors.accent + '15', borderRadius: radii.sm }}
                    onPress={() => Linking.openURL(item.url || item.fileData?.url).catch(() => viewDocument(item.url || item.fileData?.url, item.title))}
                  >
                    <Text style={{ fontFamily: typography.sans.medium, fontSize: 13, color: colors.accent }}>Open Link</Text>
                  </TouchableOpacity>
                </View>
              )}

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
                <View style={{ flexDirection: 'row', gap: 12, marginLeft: 'auto' }}>
                  <Button
                    variant="quiet"
                    onPress={() => handleEdit(item)}
                    style={[styles.deleteBtn, { backgroundColor: 'transparent' }]}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    onPress={() => handleDelete(resId)}
                    style={styles.deleteBtn}
                  >
                    Delete Resource
                  </Button>
                </View>
              </View>
            </View>
          );
        }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeAndResetModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalBackdrop} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingId ? 'Edit Resource' : 'Save a Resource'}</Text>
              <Button variant="quiet" style={styles.closeBtn} onPress={closeAndResetModal}>
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

              {(isFileType || isRecordingType) && (
                <Field label={`Attachments (${attachments.length})`}>
                  {attachments.length > 0 && (
                    <View style={{ gap: 6, marginBottom: 8 }}>
                      {attachments.map((att, idx) => (
                        <AttachmentCard
                          key={att.id || idx}
                          attachment={att}
                          onRemove={() => removeAttachment(idx)}
                        />
                      ))}
                    </View>
                  )}

                  <View style={styles.uploadRow}>
                    <TouchableOpacity
                      style={[styles.uploadBox, uploadingFile && styles.disabled]}
                      onPress={handlePickDocument}
                      disabled={uploadingFile}
                      activeOpacity={0.7}
                    >
                      <CloudUpload size={18} color={colors.accent} />
                      <Text style={styles.uploadBoxText}>+ PDF / Doc</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.uploadBox, uploadingFile && styles.disabled]}
                      onPress={handlePickImage}
                      disabled={uploadingFile}
                      activeOpacity={0.7}
                    >
                      <ImageIcon size={18} color={colors.accent} />
                      <Text style={styles.uploadBoxText}>+ Image</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.uploadBox, uploadingFile && styles.disabled]}
                      onPress={() => setVoiceModalVisible(true)}
                      disabled={uploadingFile}
                      activeOpacity={0.7}
                    >
                      <Mic size={18} color={colors.accent} />
                      <Text style={styles.uploadBoxText}>+ Voice</Text>
                    </TouchableOpacity>
                  </View>
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

              <Field label="Topic / Concept (optional)">
                <Input value={topic} onChangeText={setTopic} placeholder="Enter topic" />
              </Field>

              <Field label="Tags (optional)">
                <Input value={tagsInput} onChangeText={setTagsInput} placeholder="Add tags (optional)" />
              </Field>

              <Field label="Description (optional)">
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add description (optional)"
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
              <Button variant="quiet" style={styles.modalBtn} onPress={closeAndResetModal}>
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
