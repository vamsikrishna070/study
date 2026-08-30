import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  BookOpen,
  Plus,
  X,
  FileText,
  Eye,
  ListOrdered,
  ChevronRight,
  Trash2,
  Sparkles,
  Pencil,
  CloudUpload,
} from 'lucide-react-native';
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../../api/subjects';
import { extractSyllabus } from '../../api/syllabus';
import { AuthContext } from '../../context/AuthContext';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { formatSemester } from '../../utils/semester';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Field } from '../../components/ui/Field';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { ColorPicker, SUBJECT_COLORS } from '../../components/ui/ColorPicker';
import { AttachmentCard } from '../../components/ui/AttachmentCard';
import { pickAndUploadDocument } from '../../utils/fileUploader';
import { viewDocument } from '../../utils/documentViewer';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useStyles } from '../../theme/theme';

const SEMESTER_OPTIONS = Array.from({ length: 12 }, (_, i) => ({
  label: `Semester ${i + 1}`,
  value: String(i + 1),
}));

const SubjectsScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();
  const { logout } = useContext(AuthContext);
  const { showSuccess, showError, showDeleteConfirm } = useAppDialog();

  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [visible, setVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('4');
  const [faculty, setFaculty] = useState('');
  const [semester, setSemester] = useState('1');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [syllabusFile, setSyllabusFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
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

  useEffect(() => {
    loadSubjects();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadSubjects();
  }, []);

  const openCreateModal = () => {
    setEditingSubject(null);
    setName('');
    setCode('');
    setCredits('4');
    setFaculty('');
    setSemester('1');
    setDescription('');
    setColor(SUBJECT_COLORS[0]);
    setSyllabusFile(null);
    setUploadProgress(0);
    setVisible(true);
  };

  const openEditModal = (subject) => {
    setEditingSubject(subject);
    setName(subject.name || '');
    setCode(subject.code || '');
    setCredits(String(subject.credits || '4'));
    setFaculty(subject.faculty || '');
    setSemester(String(subject.semester || '1'));
    setDescription(subject.description || '');
    setColor(subject.color || SUBJECT_COLORS[0]);
    setSyllabusFile(subject.syllabusFile || null);
    setUploadProgress(0);
    setVisible(true);
  };

  const handlePickSyllabus = async () => {
    try {
      setUploadingFile(true);
      setUploadProgress(15);
      const uploaded = await pickAndUploadDocument({
        type: 'application/pdf',
        onProgress: (p) => setUploadProgress(p),
      });
      if (uploaded) {
        setUploadProgress(100);
        setSyllabusFile(uploaded);
      }
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload syllabus PDF.');
    } finally {
      setUploadingFile(false);
    }
  };

  const handleQuickUploadSyllabus = async (subject) => {
    const subId = subject._id || subject.id;
    try {
      const uploaded = await pickAndUploadDocument({ type: 'application/pdf' });
      if (uploaded && uploaded.url) {
        await updateSubject(subId, {
          syllabusFile: {
            url: uploaded.url,
            publicId: uploaded.publicId,
            originalName: uploaded.originalName,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
          },
        });
        showSuccess('Syllabus Uploaded', 'Syllabus PDF has been attached to this subject.');
        loadSubjects();
      }
    } catch (err) {
      showError('Upload Failed', err.message || 'Could not upload syllabus.');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !code.trim()) {
      showError('Required Fields', 'Please enter a subject name and code.');
      return;
    }

    setSubmitting(true);
    const payload = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      credits: Number(credits) || 4,
      faculty: faculty.trim(),
      semester: Number(semester) || 1,
      description: description.trim(),
      color,
      syllabusFile: syllabusFile || undefined,
    };

    try {
      if (editingSubject) {
        const subId = editingSubject._id || editingSubject.id;
        const res = await updateSubject(subId, payload);
        const updated = res.data || res;
        setSubjects((prev) =>
          prev.map((s) => ((s._id || s.id) === subId ? updated : s))
        );
      } else {
        const res = await createSubject(payload);
        const created = res.data || res;
        setSubjects((prev) => [created, ...prev]);

        // If syllabus was attached during creation, trigger background extraction
        if (created._id && syllabusFile?.url) {
          try {
            await extractSyllabus(
              created._id,
              syllabusFile.url,
              syllabusFile.mimeType,
              syllabusFile.originalName
            );
          } catch (_) {
            // Extraction can be retried anytime in SubjectDetail
          }
        }
      }
      setVisible(false);
    } catch (e) {
      showError('Error', e?.response?.data?.message || 'Failed to save subject.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id, subName) => {
    showDeleteConfirm({
      title: 'Delete Subject',
      message: `Are you sure you want to delete "${subName || 'this subject'}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteSubject(id);
          setSubjects((prev) => prev.filter((item) => (item._id || item.id) !== id));
        } catch (e) {
          showError('Delete Failed', 'Failed to delete subject. Please try again.');
        }
      },
    });
  };

  const handleViewSyllabus = async (file) => {
    if (!file?.url) {
      showError('Error', 'Syllabus document URL is not available.');
      return;
    }
    try {
      await viewDocument(file.url, file.originalName || 'Syllabus.pdf');
    } catch (e) {
      showError('Couldn’t Open Document', e?.message || 'Unable to open PDF document.');
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={subjects}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow="The curriculum"
              title="Subjects"
              detail="Your semester, structured into clear goals and tracked milestones."
              action={
                <Button onPress={openCreateModal}>
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
              title="A blank semester"
              detail="Add your first subject to start organizing your workload and syllabus."
              action={
                <Button onPress={openCreateModal}>
                  <Plus size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Add Subject
                </Button>
              }
            />
          ) : null
        }
        renderItem={({ item }) => {
          const subjectColor = item.color || colors.accent;
          const subId = item._id || item.id;
          const progress = Number(item.progress) || 0;
          const hasSyllabus = Boolean(item.syllabusFile?.url);

          return (
            <Card
              key={subId}
              style={styles.card}
              onPress={() => navigation.navigate('SubjectDetail', { id: subId, subject: item })}
            >
              {/* Header Accent Bar */}
              <View style={[styles.cardAccentBar, { backgroundColor: subjectColor }]}>
                <Text style={styles.cardAccentCode}>{item.code}</Text>
                <View style={styles.cardAccentBadge}>
                  <Text style={styles.cardAccentBadgeText}>{item.credits} CREDITS</Text>
                </View>
                <View style={styles.cardAccentBadge}>
                  <Text style={styles.cardAccentBadgeText}>{formatSemester(item.semester)}</Text>
                </View>
              </View>

              {/* Card Body */}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {!!item.faculty && (
                  <Text style={styles.cardFaculty}>Faculty: {item.faculty}</Text>
                )}

                {!!item.description && (
                  <Text style={styles.cardDescription} numberOfLines={2}>
                    {item.description}
                  </Text>
                )}

                {/* Progress Track */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressLabel}>Progress</Text>
                    <Text style={[styles.progressValue, { color: subjectColor }]}>
                      {progress}%
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          width: `${Math.min(100, Math.max(0, progress))}%`,
                          backgroundColor: subjectColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Syllabus Document Snippet */}
                <View style={styles.syllabusSnippetContainer}>
                  {hasSyllabus ? (
                    <View style={styles.syllabusAttachedBox}>
                      <View style={styles.syllabusFileRow}>
                        <View style={[styles.pdfIconBox, { backgroundColor: `${subjectColor}1A` }]}>
                          <FileText size={18} color={subjectColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.syllabusFileName} numberOfLines={1}>
                            {item.syllabusFile.originalName || 'Syllabus.pdf'}
                          </Text>
                          <Text style={styles.syllabusFileSubtitle}>Official Syllabus PDF</Text>
                        </View>
                      </View>

                      {/* Touch-Friendly Action Buttons */}
                      <View style={styles.syllabusActionsRow}>
                        <TouchableOpacity
                          style={[styles.syllabusActionBtn, { borderColor: subjectColor }]}
                          onPress={() => handleViewSyllabus(item.syllabusFile)}
                          activeOpacity={0.7}
                        >
                          <Eye size={14} color={subjectColor} style={{ marginRight: 4 }} />
                          <Text style={[styles.syllabusActionText, { color: subjectColor }]}>
                            View PDF
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.syllabusActionBtn, styles.syllabusActionBtnFilled, { backgroundColor: subjectColor }]}
                          onPress={() => navigation.navigate('SubjectDetail', { id: subId, subject: item })}
                          activeOpacity={0.7}
                        >
                          <ListOrdered size={14} color="#ffffff" style={{ marginRight: 4 }} />
                          <Text style={[styles.syllabusActionText, { color: '#ffffff' }]}>
                            Topics
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.noSyllabusBox}
                      onPress={() => handleQuickUploadSyllabus(item)}
                      activeOpacity={0.7}
                    >
                      <BookOpen size={16} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                      <Text style={styles.noSyllabusText}>No syllabus attached</Text>
                      <Text style={[styles.quickUploadLink, { color: subjectColor }]}>
                        + Upload PDF
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Card Footer Actions */}
                <View style={styles.cardFooter}>
                  <TouchableOpacity
                    style={styles.manageBtn}
                    onPress={() => navigation.navigate('SubjectDetail', { id: subId, subject: item })}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.manageBtnText}>Subject Details</Text>
                    <ChevronRight size={14} color={colors.foreground} />
                  </TouchableOpacity>

                  <View style={styles.cardOptionsRow}>
                    <TouchableOpacity
                      style={styles.iconOptionBtn}
                      onPress={() => openEditModal(item)}
                      activeOpacity={0.7}
                    >
                      <Pencil size={15} color={colors.mutedForeground} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.iconOptionBtn}
                      onPress={() => handleDelete(subId, item.name)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={15} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Card>
          );
        }}
      />

      {/* Add / Edit Subject Modal */}
      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setVisible(false)} />
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingSubject ? 'Edit Subject' : 'Add Subject'}
              </Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setVisible(false)}>
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll} keyboardShouldPersistTaps="handled">
              <Field label="Subject Name">
                <Input value={name} onChangeText={setName} placeholder="Enter subject name" />
              </Field>

              <View style={styles.gridRow}>
                <Field label="Subject Code" style={{ flex: 1 }}>
                  <Input value={code} onChangeText={setCode} placeholder="Enter subject code" autoCapitalize="characters" />
                </Field>
                <Field label="Credits" style={{ width: 100 }}>
                  <Input
                    value={credits}
                    onChangeText={setCredits}
                    keyboardType="numeric"
                    placeholder="Enter credits"
                  />
                </Field>
              </View>

              <View style={styles.gridRow}>
                <Field label="Semester" style={{ flex: 1 }}>
                  <SelectPicker
                    value={semester}
                    onValueChange={setSemester}
                    options={SEMESTER_OPTIONS}
                  />
                </Field>
                <Field label="Faculty" style={{ flex: 1.4 }}>
                  <Input value={faculty} onChangeText={setFaculty} placeholder="Enter faculty name" />
                </Field>
              </View>

              <Field label="Color Theme">
                <ColorPicker value={color} onValueChange={setColor} />
              </Field>

              <Field label="Description (Optional)">
                <Input
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Add subject description"
                  multiline
                  numberOfLines={2}
                />
              </Field>

              <Field label="Syllabus PDF (Optional)">
                {syllabusFile ? (
                  <AttachmentCard
                    file={syllabusFile}
                    onRemove={() => setSyllabusFile(null)}
                  />
                ) : (
                  <TouchableOpacity
                    style={styles.uploadBox}
                    onPress={handlePickSyllabus}
                    disabled={uploadingFile}
                    activeOpacity={0.7}
                  >
                    {uploadingFile ? (
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.uploadingText}>
                          Uploading PDF... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <CloudUpload size={24} color={colors.primary} style={{ marginBottom: 6 }} />
                        <Text style={styles.uploadBoxTitle}>Upload Syllabus PDF</Text>
                        <Text style={styles.uploadBoxSub}>Supported: PDF documents up to 15 MB</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </Field>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button variant="outline" onPress={() => setVisible(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onPress={handleSubmit} loading={submitting}>
                {editingSubject ? 'Save Changes' : 'Create Subject'}
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
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },

    // Redesigned Subject Card
    card: {
      padding: 0,
      borderRadius: radii.xxl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      marginBottom: spacing.xl,
      overflow: 'hidden',
    },
    cardAccentBar: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: 8,
      gap: spacing.sm,
    },
    cardAccentCode: {
      fontFamily: typography.mono.bold,
      fontSize: 13,
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    cardAccentBadge: {
      backgroundColor: 'rgba(255,255,255,0.22)',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    cardAccentBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: '#ffffff',
    },
    cardBody: {
      padding: spacing.lg,
    },
    cardTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 22,
      color: colors.foreground,
      marginTop: 2,
    },
    cardFaculty: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 4,
    },
    cardDescription: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
      marginTop: 6,
    },

    // Progress Section
    progressContainer: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    progressLabel: {
      fontFamily: typography.sans.semiBold,
      fontSize: 12,
      color: colors.foreground,
    },
    progressValue: {
      fontFamily: typography.mono.bold,
      fontSize: 14,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: colors.cardBorder,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: radii.pill,
    },

    // Syllabus Snippet
    syllabusSnippetContainer: {
      marginTop: spacing.md,
    },
    syllabusAttachedBox: {
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      gap: spacing.sm,
    },
    syllabusFileRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    pdfIconBox: {
      width: 38,
      height: 38,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    syllabusFileName: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    syllabusFileSubtitle: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    syllabusActionsRow: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: 2,
    },
    syllabusActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 34,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    syllabusActionBtnFilled: {
      borderWidth: 0,
    },
    syllabusActionText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
    },
    noSyllabusBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      paddingVertical: 10,
      paddingHorizontal: spacing.md,
    },
    noSyllabusText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      flex: 1,
    },
    quickUploadLink: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
    },

    // Card Footer
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
    },
    manageBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    manageBtnText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 13,
      color: colors.foreground,
    },
    cardOptionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconOptionBtn: {
      padding: 6,
      borderRadius: radii.sm,
    },

    // Modal
    modalContainer: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(24,32,49,0.55)',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '90%',
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
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
      fontFamily: typography.serif.medium,
      fontSize: 20,
      color: colors.foreground,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    modalScroll: {
      padding: spacing.lg,
    },
    gridRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    uploadBox: {
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      borderRadius: radii.xl,
      padding: spacing.xl,
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    uploadBoxTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    uploadBoxSub: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    uploadingText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.primary,
    },
    modalFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.muted + '20',
    },
  });

export default SubjectsScreen;
