import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  BookOpen,
  NotebookText,
  FolderOpen,
  ListChecks,
  CalendarClock,
  ChevronRight,
  ChevronDown,
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Circle,
  FileText,
  Sparkles,
  Layers,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { DocumentPreviewCard } from '../../components/ui/DocumentPreviewCard';
import { SyllabusReviewModal } from '../../components/subjects/SyllabusReviewModal';
import { getUnits, getTopics, updateTopicCompletion, extractSyllabus } from '../../api/syllabus';
import { updateSubject, getSubjects } from '../../api/subjects';
import { pickAndUploadDocument } from '../../utils/fileUploader';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const SubjectDetailScreen = ({ route, navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  const routeId = route.params?.id;
  const initialSubject = route.params?.subject || {};

  const [subject, setSubject] = useState(initialSubject);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [collapsedUnits, setCollapsedUnits] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Review modal state
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [parsedUnits, setParsedUnits] = useState([]);

  const subjectId = subject._id || subject.id || routeId;
  const accentColor = subject.color || colors.accent;

  const loadData = useCallback(async (isRefresh = false) => {
    if (!subjectId) return;
    try {
      const [unitsRes, topicsRes, allSubsRes] = await Promise.all([
        getUnits(subjectId),
        getTopics(subjectId),
        getSubjects(),
      ]);

      const freshUnits = unitsRes.data || unitsRes || [];
      const freshTopics = topicsRes.data || topicsRes || [];
      setUnits(freshUnits);
      setTopics(freshTopics);

      const allSubs = allSubsRes.data || allSubsRes || [];
      const current = allSubs.find((s) => (s._id || s.id) === subjectId);
      if (current) {
        setSubject(current);
      }
    } catch (err) {
      console.error('Failed to load subject details:', err);
    } finally {
      setLoading(false);
      if (isRefresh) setRefreshing(false);
    }
  }, [subjectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const toggleUnitCollapse = (unitId) => {
    setCollapsedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  // ─── Topic Completion Toggle ──────────────────────────────────────────────────

  const handleToggleTopic = async (topic) => {
    const isCompleted = topic.status === 'completed' || topic.completed;
    const newStatus = isCompleted ? 'not-started' : 'completed';

    // Optimistic update
    setTopics((prev) =>
      prev.map((t) =>
        (t._id || t.id) === (topic._id || topic.id)
          ? { ...t, status: newStatus, completed: !isCompleted }
          : t
      )
    );

    try {
      await updateTopicCompletion(topic._id || topic.id, !isCompleted);
    } catch (err) {
      // Revert on error
      setTopics((prev) =>
        prev.map((t) =>
          (t._id || t.id) === (topic._id || topic.id)
            ? { ...t, status: topic.status, completed: topic.completed }
            : t
        )
      );
      Alert.alert('Update Failed', 'Could not update topic status.');
    }
  };

  // ─── Syllabus Upload / Replace / Remove ────────────────────────────────────────

  const handleUploadOrReplaceSyllabus = async () => {
    try {
      setUploadingPdf(true);
      setUploadProgress(10);
      const uploaded = await pickAndUploadDocument({
        type: 'application/pdf',
        onProgress: (p) => setUploadProgress(p),
      });

      if (uploaded && uploaded.url) {
        setUploadProgress(100);
        // Patch subject with syllabusFile
        await updateSubject(subjectId, {
          syllabusFile: {
            url: uploaded.url,
            publicId: uploaded.publicId,
            originalName: uploaded.originalName,
            mimeType: uploaded.mimeType,
            size: uploaded.size,
          },
        });

        // Trigger extraction automatically
        setExtracting(true);
        try {
          const extractRes = await extractSyllabus(
            subjectId,
            uploaded.url,
            uploaded.mimeType,
            uploaded.originalName
          );
          const parsed = extractRes.data || extractRes || [];
          setParsedUnits(parsed);
          setReviewModalVisible(true);
        } catch (extractErr) {
          Alert.alert(
            'Syllabus Uploaded',
            'Syllabus PDF was uploaded successfully. Text extraction could not detect units automatically, but you can view the PDF anytime.'
          );
        } finally {
          setExtracting(false);
        }

        loadData();
      }
    } catch (err) {
      Alert.alert('Upload Failed', err.message || 'Could not upload syllabus PDF.');
    } finally {
      setUploadingPdf(false);
      setUploadProgress(0);
    }
  };

  const handleExtractExisting = async () => {
    if (!subject.syllabusFile?.url) return;
    setExtracting(true);
    try {
      const extractRes = await extractSyllabus(
        subjectId,
        subject.syllabusFile.url,
        subject.syllabusFile.mimeType,
        subject.syllabusFile.originalName
      );
      const parsed = extractRes.data || extractRes || [];
      setParsedUnits(parsed);
      setReviewModalVisible(true);
    } catch (err) {
      Alert.alert(
        'Extraction Failed',
        err?.response?.data?.message || 'Could not extract syllabus units from this PDF.'
      );
    } finally {
      setExtracting(false);
    }
  };

  const handleRemoveSyllabus = async () => {
    try {
      await updateSubject(subjectId, {
        syllabusFile: {
          url: '',
          publicId: '',
          originalName: '',
          mimeType: '',
          size: 0,
        },
      });
      setSubject((prev) => ({ ...prev, syllabusFile: null }));
      Alert.alert('Syllabus Removed', 'Syllabus PDF has been detached from this subject.');
      loadData();
    } catch (err) {
      Alert.alert('Error', 'Failed to remove syllabus.');
    }
  };

  // ─── Metrics ──────────────────────────────────────────────────────────────────

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === 'completed' || t.completed).length;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  const modules = [
    {
      title: 'Notes',
      desc: 'Subject notes and attachments',
      icon: NotebookText,
      route: 'Notes',
      params: { subjectId },
    },
    {
      title: 'Resources',
      desc: 'Subject resources & recordings',
      icon: FolderOpen,
      route: 'Resources',
      params: { subjectId },
    },
    {
      title: 'Tasks',
      desc: 'Pending tasks & assignments',
      icon: ListChecks,
      route: 'Tasks',
      params: { subjectId },
    },
    {
      title: 'Exams',
      desc: 'Subject exam preparation',
      icon: CalendarClock,
      route: 'Exams',
      params: { subjectId },
    },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {subject.name || 'Subject Details'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={accentColor}
          />
        }
      >
        {/* Hero Card */}
        <View style={styles.heroCard}>
          <View style={[styles.heroAccentBar, { backgroundColor: accentColor }]} />
          <View style={styles.heroContent}>
            <View style={styles.heroTopRow}>
              <Text style={[styles.heroCode, { color: accentColor }]}>{subject.code}</Text>
              <View style={[styles.creditsBadge, { backgroundColor: `${accentColor}1A` }]}>
                <Text style={[styles.creditsText, { color: accentColor }]}>
                  {subject.credits} CREDITS
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{subject.name}</Text>

            <View style={styles.metaRow}>
              <Text style={styles.metaText}>Semester {subject.semester || 1}</Text>
              {!!subject.faculty && <Text style={styles.metaDot}>•</Text>}
              {!!subject.faculty && (
                <Text style={styles.metaText}>Faculty: {subject.faculty}</Text>
              )}
            </View>

            {!!subject.description && (
              <Text style={styles.heroDesc}>{subject.description}</Text>
            )}

            {/* Progress Section */}
            <View style={styles.progressContainer}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Syllabus Command</Text>
                <Text style={[styles.progressValue, { color: accentColor }]}>
                  {progressPercent}%
                </Text>
              </View>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${progressPercent}%`, backgroundColor: accentColor },
                  ]}
                />
              </View>
              <Text style={styles.progressSubtext}>
                {completedTopics} of {totalTopics} topics completed
              </Text>
            </View>
          </View>
        </View>

        {/* Syllabus Document Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Syllabus Document</Text>
          </View>

          {subject.syllabusFile?.url ? (
            <DocumentPreviewCard
              file={subject.syllabusFile}
              title="Official Syllabus"
              unitCount={units.length}
              topicCount={totalTopics}
              isExtracting={extracting}
              onReplace={handleUploadOrReplaceSyllabus}
              onRemove={handleRemoveSyllabus}
              onExtract={units.length === 0 ? handleExtractExisting : null}
              accentColor={accentColor}
            />
          ) : (
            <View style={styles.noSyllabusCard}>
              <View style={[styles.noSyllabusIconBox, { backgroundColor: `${accentColor}15` }]}>
                <BookOpen size={28} color={accentColor} />
              </View>
              <Text style={styles.noSyllabusTitle}>No Syllabus PDF Attached</Text>
              <Text style={styles.noSyllabusDetail}>
                Upload your course syllabus PDF to automatically extract units, topics, and track progress.
              </Text>
              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: accentColor }]}
                onPress={handleUploadOrReplaceSyllabus}
                disabled={uploadingPdf}
                activeOpacity={0.85}
              >
                {uploadingPdf ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <UploadCloud size={18} color="#ffffff" style={{ marginRight: 8 }} />
                    <Text style={styles.uploadBtnText}>Upload Syllabus PDF</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Units & Topics Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Units & Topics</Text>
            {units.length > 0 && (
              <Text style={styles.unitTopicCountText}>
                {units.length} Units • {totalTopics} Topics
              </Text>
            )}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color={accentColor} style={{ marginVertical: spacing.lg }} />
          ) : units.length === 0 ? (
            <View style={styles.emptyUnitsBox}>
              <Layers size={32} color={colors.mutedForeground} />
              <Text style={styles.emptyUnitsTitle}>No Units or Topics Yet</Text>
              <Text style={styles.emptyUnitsDetail}>
                {subject.syllabusFile?.url
                  ? 'Extract syllabus topics from your uploaded PDF with a single tap.'
                  : 'Upload a syllabus PDF above to automatically generate your topic checklist.'}
              </Text>
              {subject.syllabusFile?.url && (
                <Button
                  onPress={handleExtractExisting}
                  loading={extracting}
                  style={{ marginTop: spacing.md }}
                >
                  <Sparkles size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Extract Topics from PDF
                </Button>
              )}
            </View>
          ) : (
            <View style={styles.unitsList}>
              {units.map((unit, uIdx) => {
                const uId = unit._id || unit.id || String(uIdx);
                const unitTopics = topics.filter(
                  (t) => (t.unit?._id || t.unit) === uId || t.unit === unit.title
                );
                const isCollapsed = !!collapsedUnits[uId];
                const unitDone = unitTopics.filter((t) => t.status === 'completed' || t.completed).length;

                return (
                  <View key={uId} style={styles.unitAccordion}>
                    {/* Unit Accordion Header */}
                    <TouchableOpacity
                      style={styles.unitHeader}
                      onPress={() => toggleUnitCollapse(uId)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.unitBadge, { backgroundColor: `${accentColor}1A` }]}>
                        <Text style={[styles.unitBadgeText, { color: accentColor }]}>
                          U{uIdx + 1}
                        </Text>
                      </View>

                      <View style={styles.unitHeaderInfo}>
                        <Text style={styles.unitTitle} numberOfLines={1}>
                          {unit.title || unit.name || `Unit ${uIdx + 1}`}
                        </Text>
                        <Text style={styles.unitStats}>
                          {unitDone} of {unitTopics.length} completed
                        </Text>
                      </View>

                      {isCollapsed ? (
                        <ChevronRight size={18} color={colors.mutedForeground} />
                      ) : (
                        <ChevronDown size={18} color={colors.mutedForeground} />
                      )}
                    </TouchableOpacity>

                    {/* Unit Topics Checklist */}
                    {!isCollapsed && (
                      <View style={styles.topicsContainer}>
                        {unitTopics.length === 0 ? (
                          <Text style={styles.noTopicsText}>No topics listed for this unit.</Text>
                        ) : (
                          unitTopics.map((topic, tIdx) => {
                            const isDone = topic.status === 'completed' || topic.completed;

                            return (
                              <TouchableOpacity
                                key={topic._id || topic.id || tIdx}
                                style={styles.topicRow}
                                onPress={() => handleToggleTopic(topic)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.checkboxContainer}>
                                  {isDone ? (
                                    <CheckCircle2 size={20} color={accentColor} />
                                  ) : (
                                    <Circle size={20} color={colors.mutedForeground} />
                                  )}
                                </View>
                                <Text
                                  style={[
                                    styles.topicTitle,
                                    isDone && styles.topicTitleDone,
                                  ]}
                                >
                                  {topic.title || topic.name}
                                </Text>
                              </TouchableOpacity>
                            );
                          })
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Workspace Modules Row */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subject Workspace</Text>
          <View style={styles.moduleList}>
            {modules.map((m, i) => (
              <TouchableOpacity
                key={i}
                style={styles.moduleItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate(m.route, m.params)}
              >
                <View style={[styles.moduleIconBox, { backgroundColor: `${colors.primary}1A` }]}>
                  <m.icon size={22} color={colors.primary} />
                </View>
                <View style={styles.moduleTextContainer}>
                  <Text style={styles.moduleTitle}>{m.title}</Text>
                  <Text style={styles.moduleDesc}>{m.desc}</Text>
                </View>
                <ChevronRight size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Syllabus Review Modal */}
      <SyllabusReviewModal
        visible={reviewModalVisible}
        subjectId={subjectId}
        parsedUnits={parsedUnits}
        onClose={() => setReviewModalVisible(false)}
        onSuccess={() => {
          setReviewModalVisible(false);
          loadData();
        }}
      />
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
    },
    scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },

    // Hero Card
    heroCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xxl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
      marginBottom: spacing.xl,
    },
    heroAccentBar: {
      height: 6,
      width: '100%',
    },
    heroContent: {
      padding: spacing.xl,
    },
    heroTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.xs,
    },
    heroCode: {
      fontFamily: typography.mono.bold,
      fontSize: 13,
      letterSpacing: 0.5,
    },
    creditsBadge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radii.sm,
    },
    creditsText: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
    },
    heroTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 26,
      color: colors.foreground,
      marginVertical: spacing.xs,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    metaText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    metaDot: {
      marginHorizontal: 6,
      color: colors.mutedForeground,
    },
    heroDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
      lineHeight: 20,
      marginVertical: spacing.xs,
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
      fontSize: 13,
      color: colors.foreground,
    },
    progressValue: {
      fontFamily: typography.mono.bold,
      fontSize: 15,
    },
    progressBarBg: {
      height: 8,
      backgroundColor: colors.cardBorder,
      borderRadius: radii.pill,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: '100%',
      borderRadius: radii.pill,
    },
    progressSubtext: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 4,
    },

    // Section Headers
    section: {
      marginBottom: spacing.xl,
    },
    sectionHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 20,
      color: colors.foreground,
    },
    unitTopicCountText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.mutedForeground,
    },

    // No Syllabus State
    noSyllabusCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      padding: spacing.xl,
      alignItems: 'center',
      textAlign: 'center',
    },
    noSyllabusIconBox: {
      width: 56,
      height: 56,
      borderRadius: radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    noSyllabusTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: colors.foreground,
      marginBottom: 4,
    },
    noSyllabusDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: spacing.lg,
      paddingHorizontal: spacing.md,
    },
    uploadBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
      paddingVertical: spacing.md,
      borderRadius: radii.lg,
    },
    uploadBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: '#ffffff',
    },

    // Units Accordion
    emptyUnitsBox: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    emptyUnitsTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: colors.foreground,
      marginTop: spacing.xs,
    },
    emptyUnitsDetail: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 18,
      paddingHorizontal: spacing.md,
    },
    unitsList: {
      gap: spacing.md,
    },
    unitAccordion: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      overflow: 'hidden',
    },
    unitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.md,
    },
    unitBadge: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.sm,
      marginRight: spacing.md,
    },
    unitBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 12,
    },
    unitHeaderInfo: {
      flex: 1,
    },
    unitTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
    },
    unitStats: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    topicsContainer: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.background + '80',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    noTopicsText: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      paddingVertical: spacing.sm,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder + '60',
    },
    checkboxContainer: {
      marginRight: spacing.md,
    },
    topicTitle: {
      flex: 1,
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    topicTitleDone: {
      textDecorationLine: 'line-through',
      color: colors.mutedForeground,
      opacity: 0.7,
    },

    // Modules List
    moduleList: {
      gap: spacing.sm,
    },
    moduleItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      padding: spacing.md,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    moduleIconBox: {
      width: 44,
      height: 44,
      borderRadius: radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    moduleTextContainer: { flex: 1 },
    moduleTitle: { fontFamily: typography.sans.bold, fontSize: 15, color: colors.foreground },
    moduleDesc: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
  });

export default SubjectDetailScreen;
