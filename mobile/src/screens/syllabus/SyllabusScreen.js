import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  BookOpen,
  CircleCheck,
  Circle,
  Upload,
  ChevronRight,
  ChevronDown,
  Sparkles,
  Layers,
  CloudUpload,
} from 'lucide-react-native';
import {
  extractSyllabus,
  updateTopicCompletion,
  getUnits,
  getTopics,
} from '../../api/syllabus';
import { getSubjects, updateSubject } from '../../api/subjects';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { SyllabusReviewModal } from '../../components/subjects/SyllabusReviewModal';
import { DocumentPreviewCard } from '../../components/ui/DocumentPreviewCard';
import { pickAndUploadDocument } from '../../utils/fileUploader';
import { useAppDialog } from '../../components/ui/AppDialog';
import { useAppTheme, useStyles } from '../../theme/theme';

const SyllabusScreen = ({ route, navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showSuccess, showError, showDeleteConfirm, showDialog } = useAppDialog();

  const passedSubject = route?.params?.subject;
  const passedSubjectId = route?.params?.subjectId || passedSubject?._id || passedSubject?.id;

  const [subjectId, setSubjectId] = useState(passedSubjectId || '');
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [units, setUnits] = useState([]);
  const [topics, setTopics] = useState([]);
  const [error, setError] = useState(null);
  const [expandedUnits, setExpandedUnits] = useState({});

  // Extraction Review Modal state
  const [reviewVisible, setReviewVisible] = useState(false);
  const [parsedUnits, setParsedUnits] = useState([]);
  const [extracting, setExtracting] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const loadData = async () => {
    try {
      setError(null);

      // Load all subjects for selector
      const subsRes = await getSubjects();
      const subsData = subsRes.data || subsRes || [];
      setAllSubjects(subsData);

      const targetId = subjectId || (subsData.length > 0 ? (subsData[0]._id || subsData[0].id) : null);

      if (!subjectId && targetId) {
        setSubjectId(targetId);
      }

      if (!targetId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [unitsRes, topicsRes] = await Promise.all([
        getUnits(targetId),
        getTopics(targetId),
      ]);

      const unitsData = unitsRes.data || unitsRes || [];
      const topicsData = topicsRes.data || topicsRes || [];
      setUnits(unitsData);
      setTopics(topicsData);

      if (unitsData.length > 0) {
        setExpandedUnits({ [unitsData[0]._id || unitsData[0].id]: true });
      }
    } catch (e) {
      setError('Failed to load syllabus.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [subjectId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [subjectId]);

  const currentSubject = allSubjects.find((s) => (s._id || s.id) === subjectId);
  const subjectColor = currentSubject?.color || colors.accent;

  const handleUploadAndExtract = async () => {
    if (!subjectId) {
      showError('Required Field', 'Please select a subject first.');
      return;
    }

    try {
      setUploadingPdf(true);
      const uploaded = await pickAndUploadDocument({
        type: [
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/docx',
          'text/plain',
        ],
      });

      if (!uploaded || !uploaded.url) return;

      // Update subject
      await updateSubject(subjectId, {
        syllabusFile: {
          url: uploaded.url,
          publicId: uploaded.publicId,
          originalName: uploaded.originalName,
          mimeType: uploaded.mimeType,
          size: uploaded.size,
        },
      });

      setExtracting(true);
      const res = await extractSyllabus(
        subjectId,
        uploaded.url,
        uploaded.mimeType,
        uploaded.originalName
      );
      const extracted = res.data?.units || res.units || res.data || [];

      if (extracted.length > 0) {
        setParsedUnits(extracted);
        setReviewVisible(true);
      } else {
        showDialog({
          type: 'info',
          title: 'Syllabus Uploaded',
          message: 'Syllabus document was uploaded successfully. Text extraction could not detect units automatically, but the document is saved.',
          confirmText: 'OK',
        });
      }
      loadData();
    } catch (e) {
      showError('Extraction Failed', e?.response?.data?.message || e.message || 'Failed to extract syllabus.');
    } finally {
      setUploadingPdf(false);
      setExtracting(false);
    }
  };

  const handleExtractExisting = async () => {
    if (!currentSubject?.syllabusFile?.url) return;
    setExtracting(true);
    try {
      const res = await extractSyllabus(
        subjectId,
        currentSubject.syllabusFile.url,
        currentSubject.syllabusFile.mimeType,
        currentSubject.syllabusFile.originalName
      );
      const extracted = res.data?.units || res.units || res.data || [];
      if (extracted.length > 0) {
        setParsedUnits(extracted);
        setReviewVisible(true);
      } else {
        showDialog({
          type: 'info',
          title: 'Extraction Notice',
          message: 'Could not detect structured units from this PDF.',
          confirmText: 'OK',
        });
      }
    } catch (err) {
      showError('Extraction Failed', err?.response?.data?.message || 'Failed to extract syllabus.');
    } finally {
      setExtracting(false);
    }
  };

  const handleRemoveSyllabus = async () => {
    if (!subjectId) return;
    showDeleteConfirm({
      title: 'Remove Syllabus',
      message: 'Are you sure you want to remove the syllabus PDF?',
      confirmText: 'Remove',
      onConfirm: async () => {
        try {
          await updateSubject(subjectId, {
            syllabusFile: { url: '', publicId: '', originalName: '', mimeType: '', size: 0 },
          });
          showSuccess('Removed', 'Syllabus PDF has been removed.');
          loadData();
        } catch (err) {
          showError('Error', 'Failed to remove syllabus PDF.');
        }
      },
    });
  };

  const toggleTopic = async (topic) => {
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
    } catch (e) {
      // Revert on error
      setTopics((prev) =>
        prev.map((t) =>
          (t._id || t.id) === (topic._id || topic.id)
            ? { ...t, status: topic.status, completed: topic.completed }
            : t
        )
      );
      showError('Update Failed', 'Failed to update topic status.');
    }
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  const subjectOptions = allSubjects.map((s) => ({
    label: `${s.name} (${s.code})`,
    value: s._id || s.id,
  }));

  const totalTopics = topics.length;
  const completedTopics = topics.filter((t) => t.status === 'completed' || t.completed).length;
  const progressPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
        contentContainerStyle={styles.scroll}
      >
        <PageHeading
          eyebrow="The curriculum"
          title="Syllabus"
          detail={
            currentSubject
              ? `Tracking curriculum & topics for ${currentSubject.name}`
              : 'Select a subject and upload a PDF syllabus.'
          }
          action={
            subjectId ? (
              <Button
                onPress={handleUploadAndExtract}
                variant="outline"
                size="sm"
                loading={extracting || uploadingPdf}
                disabled={extracting || uploadingPdf}
              >
                <Sparkles size={16} color={subjectColor} style={{ marginRight: 6 }} />
                {extracting ? 'Extracting...' : uploadingPdf ? 'Uploading...' : 'Upload PDF'}
              </Button>
            ) : null
          }
        />

        {/* Subject Selector Dropdown */}
        {allSubjects.length > 0 && (
          <View style={styles.pickerSection}>
            <SelectPicker
              label="Select Subject"
              value={subjectId}
              onValueChange={(val) => {
                setSubjectId(val);
                setUnits([]);
                setTopics([]);
              }}
              options={subjectOptions}
              placeholder="Choose a subject"
            />
          </View>
        )}

        <QueryState error={error} onRetry={loadData} label="Syllabus" />

        {!error && !subjectId && (
          <EmptyState
            title="Select a Subject"
            detail={
              allSubjects.length === 0
                ? 'Create a subject first, then upload its syllabus.'
                : 'Choose a subject above to view or upload its syllabus.'
            }
          />
        )}

        {subjectId && !error && (
          <View style={styles.content}>
            {/* Attached Syllabus Document Card */}
            {currentSubject?.syllabusFile?.url ? (
              <DocumentPreviewCard
                file={currentSubject.syllabusFile}
                title="Syllabus Document"
                unitCount={units.length}
                topicCount={totalTopics}
                isExtracting={extracting}
                onReplace={handleUploadAndExtract}
                onRemove={handleRemoveSyllabus}
                onExtract={units.length === 0 ? handleExtractExisting : null}
                accentColor={subjectColor}
              />
            ) : (
              <TouchableOpacity
                style={styles.uploadPromptCard}
                onPress={handleUploadAndExtract}
                disabled={uploadingPdf}
                activeOpacity={0.75}
              >
                <CloudUpload size={24} color={subjectColor} style={{ marginBottom: 6 }} />
                <Text style={styles.uploadPromptTitle}>Attach Syllabus Document</Text>
                <Text style={styles.uploadPromptSub}>
                  Upload PDF, DOCX, or TXT to extract units & topics
                </Text>
              </TouchableOpacity>
            )}

            {/* Overall Syllabus Progress */}
            {totalTopics > 0 && (
              <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                  <Text style={styles.progressLabel}>Overall Completion</Text>
                  <Text style={[styles.progressPercent, { color: subjectColor }]}>
                    {progressPercent}%
                  </Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${progressPercent}%`, backgroundColor: subjectColor },
                    ]}
                  />
                </View>
                <Text style={styles.progressSubtext}>
                  {completedTopics} of {totalTopics} topics completed
                </Text>
              </View>
            )}

            {/* Units & Topics List */}
            {units.length === 0 ? (
              <View style={styles.emptyUnitsBox}>
                <Layers size={32} color={colors.mutedForeground} />
                <Text style={styles.emptyUnitsTitle}>No Units Extracted</Text>
                <Text style={styles.emptyUnitsDetail}>
                  {currentSubject?.syllabusFile?.url
                    ? 'Extract units and topics from your attached syllabus document.'
                    : 'Upload a PDF, DOCX, or TXT syllabus to track each unit and topic.'}
                </Text>
                {currentSubject?.syllabusFile?.url && (
                  <Button
                    onPress={handleExtractExisting}
                    loading={extracting}
                    style={{ marginTop: spacing.md }}
                  >
                    <Sparkles size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                    Extract Topics from Document
                  </Button>
                )}
              </View>
            ) : (
              <View style={styles.unitsSection}>
                {units.map((unit, index) => {
                  const uId = unit._id || unit.id || String(index);
                  const isExpanded = !!expandedUnits[uId];
                  const unitTopics = topics.filter(
                    (t) => (t.unit?._id || t.unit) === uId || t.unit === unit.title
                  );
                  const completedInUnit = unitTopics.filter((t) => t.status === 'completed' || t.completed).length;

                  return (
                    <View key={uId} style={styles.unitCard}>
                      <TouchableOpacity
                        style={styles.unitHeader}
                        onPress={() => toggleUnit(uId)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.unitBadge, { backgroundColor: `${subjectColor}1A` }]}>
                          <Text style={[styles.unitBadgeText, { color: subjectColor }]}>
                            {(unit.title || unit.name || '').toLowerCase().includes('laboratory') ? 'LAB' : `U${index + 1}`}
                          </Text>
                        </View>
                        <View style={styles.unitHeaderTextContainer}>
                          <Text style={styles.unitTitle} numberOfLines={1}>
                            {unit.title || unit.name || `Unit ${index + 1}`}
                          </Text>
                          <Text style={styles.unitTopicCount}>
                            {completedInUnit} / {unitTopics.length} completed
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronDown size={18} color={colors.mutedForeground} />
                        ) : (
                          <ChevronRight size={18} color={colors.mutedForeground} />
                        )}
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.topicsList}>
                          {unitTopics.length === 0 ? (
                            <Text style={styles.noTopicsText}>No topics in this unit.</Text>
                          ) : (
                            unitTopics.map((topic, tIdx) => {
                              const isDone = topic.status === 'completed' || topic.completed;

                              return (
                                <TouchableOpacity
                                  key={topic._id || topic.id || tIdx}
                                  style={styles.topicRow}
                                  onPress={() => toggleTopic(topic)}
                                  activeOpacity={0.7}
                                >
                                  <View style={styles.checkboxContainer}>
                                    {isDone ? (
                                      <CircleCheck size={20} color={subjectColor} />
                                    ) : (
                                      <Circle size={20} color={colors.mutedForeground} />
                                    )}
                                  </View>
                                  <Text
                                    style={[
                                      styles.topicName,
                                      isDone && styles.topicNameDone,
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
        )}
      </ScrollView>

      {/* Review Modal */}
      <SyllabusReviewModal
        visible={reviewVisible}
        subjectId={subjectId}
        parsedUnits={parsedUnits}
        onClose={() => setReviewVisible(false)}
        onSuccess={() => {
          setReviewVisible(false);
          loadData();
        }}
      />
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scroll: { padding: spacing.md, paddingBottom: spacing.xxl },
    pickerSection: { marginBottom: spacing.md },
    content: { gap: spacing.md },

    uploadPromptCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      alignItems: 'center',
    },
    uploadPromptTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    uploadPromptSub: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },

    progressCard: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
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
    progressPercent: {
      fontFamily: typography.mono.bold,
      fontSize: 15,
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
    progressSubtext: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 4,
    },

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

    unitsSection: {
      gap: spacing.sm,
    },
    unitCard: {
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
    unitHeaderTextContainer: { flex: 1 },
    unitTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
    },
    unitTopicCount: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    topicsList: {
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.background + '80',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
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
    topicName: {
      flex: 1,
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.foreground,
      lineHeight: 20,
    },
    topicNameDone: {
      textDecorationLine: 'line-through',
      color: colors.mutedForeground,
      opacity: 0.7,
    },
  });

export default SyllabusScreen;
