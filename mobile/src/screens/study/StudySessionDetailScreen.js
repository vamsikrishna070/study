import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import {
  RotateCcw,
  Play,
  PenLine,
  Trash2,
  X,
  Smile,
  Meh,
  Frown,
  Check,
  CheckCircle2,
  Globe,
  Clock,
  Calendar,
  BookOpen,
  Sparkles,
  Layers,
  ArrowLeft,
  ListOrdered,
  Award,
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { QueryState } from '../../components/ui/QueryState';
import { EmptyState } from '../../components/ui/EmptyState';
import { StudyTopicSelector } from '../../components/study/StudyTopicSelector';
import { useAppDialog } from '../../components/ui/AppDialog';
import {
  getStudySession,
  deleteStudySession,
  updateStudySession,
} from '../../api/studySessions';
import { getSubjects } from '../../api/subjects';
import { useAppTheme, useStyles } from '../../theme/theme';

export default function StudySessionDetailScreen({ route, navigation }) {
  const { colors } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showDialog, showSuccess, showError } = useAppDialog();

  const { sessionId, id, session: initialSession } = route.params || {};
  const currentSessionId = sessionId || id || initialSession?._id || initialSession?.id;

  const [session, setSession] = useState(initialSession || null);
  const [loading, setLoading] = useState(!initialSession);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Edit modal states
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [editStudyType, setEditStudyType] = useState('syllabus');
  const [editSubjects, setEditSubjects] = useState([]);
  const [editOutside, setEditOutside] = useState([]);
  const [editNotes, setEditNotes] = useState('');
  const [editDuration, setEditDuration] = useState('45');
  const [editProductivity, setEditProductivity] = useState('productive');
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchSession = useCallback(async () => {
    if (!currentSessionId) {
      setError('No session ID provided.');
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      setError(null);
      const res = await getStudySession(currentSessionId);
      const data = res?.data || res;
      if (data) {
        setSession(data);
      } else {
        setError('Study session not found.');
      }
    } catch (err) {
      console.error('[StudySessionDetail] Error loading session:', err);
      if (!session) {
        setError('Unable to load study session details. Please check your connection.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentSessionId, session]);

  useEffect(() => {
    fetchSession();
    getSubjects()
      .then((res) => setAvailableSubjects(res.data || res || []))
      .catch(() => setAvailableSubjects([]));
  }, [currentSessionId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSession();
  };

  const handleOpenEdit = () => {
    if (!session) return;
    setEditStudyType(
      session.studyType || (session.outsideSyllabus?.length ? 'outside_syllabus' : 'syllabus')
    );
    setEditSubjects(session.subjects || []);
    setEditOutside(session.outsideSyllabus || []);
    setEditNotes(session.notes || '');
    setEditDuration(String(session.durationMinutes || 45));
    setEditProductivity(session.productivity || 'productive');
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!session || savingEdit) return;
    const durMins = parseInt(editDuration, 10);
    if (!durMins || durMins <= 0) {
      showError('Invalid Duration', 'Please enter a valid study duration in minutes.');
      return;
    }

    try {
      setSavingEdit(true);
      const sId = session._id || session.id;

      let primarySubjectName = 'General Study';
      let primaryTopic = 'General Study';

      if (editStudyType === 'syllabus' && editSubjects.length > 0) {
        primarySubjectName = editSubjects[0].subjectName || primarySubjectName;
        if (editSubjects[0].topics && editSubjects[0].topics.length > 0) {
          primaryTopic = editSubjects[0].topics.map((t) => t.topicName).join(', ');
        }
      } else if (editStudyType === 'outside_syllabus' && editOutside.length > 0) {
        primarySubjectName = editOutside[0].area || 'Outside Syllabus';
        if (editOutside[0].topics && editOutside[0].topics.length > 0) {
          primaryTopic = editOutside[0].topics.map((t) => t.name).join(', ');
        }
      }

      const payload = {
        studyType: editStudyType,
        subjects: editSubjects,
        outsideSyllabus: editOutside,
        subjectName: primarySubjectName,
        topic: primaryTopic,
        notes: editNotes.trim(),
        durationMinutes: durMins,
        productivity: editProductivity,
      };

      const updated = await updateStudySession(sId, payload);
      const updatedItem = updated.data || updated;

      setSession((prev) => ({ ...prev, ...updatedItem }));
      setEditModalVisible(false);
      showSuccess('Log Updated', 'Study session and syllabus completion updated.');
    } catch (err) {
      console.error('[StudySessionDetail] Save edit error:', err);
      showError('Update Failed', 'Failed to update study session. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = () => {
    if (!session) return;
    showDialog({
      type: 'destructive',
      title: 'Delete Study Session?',
      message: 'This will permanently remove this session and recalculate your syllabus progress.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteStudySession(session._id || session.id);
          showSuccess('Session Deleted', 'Study session removed.');
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('StudyHistory');
          }
        } catch (err) {
          showError('Delete Failed', 'Failed to delete study session.');
        }
      },
    });
  };

  const formatDuration = (minutes = 0) => {
    if (minutes < 60) return `${minutes} min`;
    const hrs = Math.floor(minutes / 60);
    const rem = minutes % 60;
    if (rem === 0) return `${hrs} hr`;
    return `${hrs} hr ${rem} min`;
  };

  const getProductivityBadge = (rating) => {
    switch (rating) {
      case 'productive':
        return { label: 'Productive Session', color: '#10B981', icon: Smile };
      case 'average':
        return { label: 'Average Focus', color: colors.mutedForeground, icon: Meh };
      case 'difficult':
        return { label: 'Challenging / Difficult', color: '#F59E0B', icon: Frown };
      default:
        return null;
    }
  };

  if (loading && !session) {
    return (
      <View style={styles.container}>
        <Header showBack={true} />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>Loading session details...</Text>
        </View>
      </View>
    );
  }

  if (error && !session) {
    return (
      <View style={styles.container}>
        <Header showBack={true} />
        <View style={styles.centered}>
          <QueryState error={error} onRetry={fetchSession} label="Study Session" />
          <Button
            variant="outline"
            style={{ marginTop: 16 }}
            onPress={() => navigation.navigate('StudyHistory')}
          >
            Go to Study History
          </Button>
        </View>
      </View>
    );
  }

  const subName = session.subjectName || session.subject?.name || 'General Study';
  const subCode = session.subject?.code || session.subjectCode || '';
  const subColor = session.subject?.color || session.subjectColor || colors.accent;
  const prodBadge = getProductivityBadge(session.productivity);

  const startDate = session.startedAt ? new Date(session.startedAt) : new Date();
  const formattedDate = startDate.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = startDate.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.container}>
      <Header showBack={true} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <PageHeading
          eyebrow="Study Session Details"
          title={subName}
          detail={subCode ? `${subCode} • ${formattedDate}` : formattedDate}
          action={
            <Button
              variant="outline"
              size="sm"
              onPress={() => navigation.navigate('StudyHistory')}
            >
              All Sessions
            </Button>
          }
        />

        {/* Hero Duration & Type Card */}
        <Card style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View>
              <Text style={styles.heroLabel}>Time Studied</Text>
              <Text style={styles.heroDuration}>
                {formatDuration(session.durationMinutes || 0)}
              </Text>
            </View>
            <View style={styles.badgeColumn}>
              <View style={[styles.typeBadge, { backgroundColor: `${colors.accent}20` }]}>
                <Sparkles size={12} color={colors.accent} style={{ marginRight: 4 }} />
                <Text style={[styles.typeBadgeText, { color: colors.accent }]}>
                  {session.sessionType === 'manual' ? 'Manual Log' : 'Focus Timer'}
                </Text>
              </View>
              {session.studyType === 'revision' && (
                <View style={[styles.typeBadge, { backgroundColor: `${colors.accent}15`, marginTop: 6 }]}>
                  <RotateCcw size={12} color={colors.accent} style={{ marginRight: 4 }} />
                  <Text style={[styles.typeBadgeText, { color: colors.accent }]}>Revision</Text>
                </View>
              )}
              {session.studyType === 'outside_syllabus' && (
                <View style={[styles.typeBadge, { backgroundColor: '#3B82F620', marginTop: 6 }]}>
                  <Globe size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                  <Text style={[styles.typeBadgeText, { color: '#3B82F6' }]}>Outside Syllabus</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaGrid}>
            <View style={styles.metaItem}>
              <Calendar size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
              <Text style={styles.metaText}>{formattedDate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Clock size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
              <Text style={styles.metaText}>{formattedTime}</Text>
            </View>
          </View>

          {prodBadge && (
            <View style={[styles.prodBox, { borderColor: `${prodBadge.color}40`, backgroundColor: `${prodBadge.color}10` }]}>
              <prodBadge.icon size={16} color={prodBadge.color} style={{ marginRight: 8 }} />
              <Text style={[styles.prodText, { color: prodBadge.color }]}>
                {prodBadge.label}
              </Text>
            </View>
          )}
        </Card>

        {/* Subjects & Topics Covered Card */}
        <Card style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <BookOpen size={18} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={styles.cardTitle}>Syllabus & Topics Covered</Text>
          </View>

          {Array.isArray(session.subjects) && session.subjects.length > 0 ? (
            session.subjects.map((sub, sIdx) => (
              <View key={`subj_${sIdx}`} style={styles.subjectBlock}>
                <View style={styles.subjectTitleRow}>
                  <View style={[styles.subjectIndicator, { backgroundColor: subColor }]} />
                  <Text style={styles.subjectBlockName}>{sub.subjectName || subName}</Text>
                </View>
                {Array.isArray(sub.topics) && sub.topics.length > 0 ? (
                  sub.topics.map((top, tIdx) => (
                    <View key={`top_${tIdx}`} style={styles.topicRow}>
                      <CheckCircle2
                        size={16}
                        color={top.completed ? '#10B981' : colors.mutedForeground}
                        style={{ marginRight: 8, marginTop: 1 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.topicName, top.completed && styles.topicDone]}>
                          {top.topicName}
                        </Text>
                        {top.completed && (
                          <Text style={styles.topicCompletedLabel}>Marked as completed in syllabus</Text>
                        )}
                      </View>
                    </View>
                  ))
                ) : (
                  <Text style={styles.noTopicText}>General subject study</Text>
                )}
              </View>
            ))
          ) : Array.isArray(session.outsideSyllabus) && session.outsideSyllabus.length > 0 ? (
            session.outsideSyllabus.map((out, oIdx) => (
              <View key={`out_${oIdx}`} style={styles.subjectBlock}>
                <View style={styles.subjectTitleRow}>
                  <Globe size={16} color={colors.accent} style={{ marginRight: 8 }} />
                  <Text style={styles.subjectBlockName}>{out.area || 'Outside Syllabus'}</Text>
                </View>
                {Array.isArray(out.topics) && out.topics.length > 0 ? (
                  out.topics.map((top, tIdx) => (
                    <View key={`out_top_${tIdx}`} style={styles.topicRow}>
                      <CheckCircle2
                        size={16}
                        color={top.completed ? '#10B981' : colors.mutedForeground}
                        style={{ marginRight: 8, marginTop: 1 }}
                      />
                      <Text style={[styles.topicName, top.completed && styles.topicDone]}>
                        {top.name}
                      </Text>
                    </View>
                  ))
                ) : null}
              </View>
            ))
          ) : Boolean(session.topic) ? (
            <View style={styles.singleTopicRow}>
              <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 8 }} />
              <Text style={styles.topicName}>{session.topic}</Text>
            </View>
          ) : (
            <Text style={styles.noTopicText}>General study logged for this session.</Text>
          )}
        </Card>

        {/* Goal Card if available */}
        {Boolean(session.goal) && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Sparkles size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Session Goal</Text>
            </View>
            <Text style={styles.bodyText}>{session.goal}</Text>
          </Card>
        )}

        {/* Notes / Reflection Card */}
        {Boolean(session.notes) && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <PenLine size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Notes & Reflection</Text>
            </View>
            <Text style={styles.bodyText}>{session.notes}</Text>
          </Card>
        )}

        {/* Linked Task or Exam */}
        {(session.task?.title || session.exam?.name) && (
          <Card style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Layers size={18} color={colors.accent} style={{ marginRight: 8 }} />
              <Text style={styles.cardTitle}>Linked Items</Text>
            </View>
            {session.task?.title && (
              <View style={styles.linkedRow}>
                <Text style={styles.linkedLabel}>Task:</Text>
                <Text style={styles.linkedValue}>{session.task.title}</Text>
              </View>
            )}
            {session.exam?.name && (
              <View style={styles.linkedRow}>
                <Text style={styles.linkedLabel}>Exam:</Text>
                <Text style={styles.linkedValue}>{session.exam.name}</Text>
              </View>
            )}
          </Card>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            variant="default"
            onPress={handleOpenEdit}
            style={styles.actionBtn}
          >
            <PenLine size={16} color={colors.primaryForeground} style={{ marginRight: 8 }} />
            Edit Session
          </Button>

          <Button
            variant="destructive"
            onPress={handleDelete}
            style={styles.actionBtn}
          >
            <Trash2 size={16} color={colors.destructiveForeground} style={{ marginRight: 8 }} />
            Delete Session
          </Button>
        </View>

        <View style={styles.footerActions}>
          <Button
            variant="outline"
            onPress={() => navigation.navigate('StartSession')}
            style={{ flex: 1, marginRight: 8 }}
          >
            <Play size={16} color={colors.foreground} style={{ marginRight: 6 }} />
            Study Again
          </Button>
          <Button
            variant="outline"
            onPress={() => navigation.navigate('StudyHistory')}
            style={{ flex: 1, marginLeft: 8 }}
          >
            <ListOrdered size={16} color={colors.foreground} style={{ marginRight: 6 }} />
            Study History
          </Button>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Study Session</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <StudyTopicSelector
                studyType={editStudyType}
                onStudyTypeChange={setEditStudyType}
                availableSubjects={availableSubjects}
                selectedSubjects={editSubjects}
                onSelectedSubjectsChange={setEditSubjects}
                outsideSyllabus={editOutside}
                onOutsideSyllabusChange={setEditOutside}
                showCompletionCheckboxes={true}
              />

              <Field label="Duration (Minutes)">
                <Input
                  keyboardType="numeric"
                  value={editDuration}
                  onChangeText={setEditDuration}
                  placeholder="e.g. 45"
                />
              </Field>

              <Field label="Productivity Rating">
                <View style={styles.prodSelectorRow}>
                  {[
                    { key: 'productive', label: 'Productive', icon: Smile, color: '#10B981' },
                    { key: 'average', label: 'Average', icon: Meh, color: colors.mutedForeground },
                    { key: 'difficult', label: 'Difficult', icon: Frown, color: '#F59E0B' },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.key}
                      style={[
                        styles.prodOption,
                        editProductivity === p.key && {
                          borderColor: p.color,
                          backgroundColor: `${p.color}15`,
                        },
                      ]}
                      onPress={() => setEditProductivity(p.key)}
                    >
                      <p.icon
                        size={18}
                        color={editProductivity === p.key ? p.color : colors.mutedForeground}
                      />
                      <Text
                        style={[
                          styles.prodOptionText,
                          editProductivity === p.key && { color: p.color, fontWeight: '700' },
                        ]}
                      >
                        {p.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>

              <Field label="Notes / Reflection">
                <Input
                  multiline
                  numberOfLines={3}
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Add details about what was studied..."
                  style={styles.notesInput}
                />
              </Field>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
                onPress={() => setEditModalVisible(false)}
              >
                Cancel
              </Button>
              <Button
                style={{ flex: 1, marginLeft: 8 }}
                onPress={handleSaveEdit}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Changes'}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (colors, typography) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    loadingText: {
      marginTop: 12,
      fontSize: 14,
      fontFamily: typography.sans.medium,
      color: colors.mutedForeground,
    },
    scroll: {
      padding: 16,
      paddingBottom: 40,
    },
    heroCard: {
      padding: 18,
      marginBottom: 16,
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    heroLabel: {
      fontSize: 12,
      fontFamily: typography.sans.medium,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    heroDuration: {
      fontSize: 32,
      fontFamily: typography.sans.bold,
      color: colors.foreground,
      marginTop: 4,
    },
    badgeColumn: {
      alignItems: 'flex-end',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 8,
    },
    typeBadgeText: {
      fontSize: 12,
      fontFamily: typography.sans.bold,
    },
    divider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 14,
    },
    metaGrid: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      flexWrap: 'wrap',
      gap: 16,
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    metaText: {
      fontSize: 13,
      fontFamily: typography.sans.regular,
      color: colors.mutedForeground,
    },
    prodBox: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
    },
    prodText: {
      fontSize: 13,
      fontFamily: typography.sans.bold,
    },
    card: {
      padding: 16,
      marginBottom: 16,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
    },
    cardTitle: {
      fontSize: 15,
      fontFamily: typography.sans.bold,
      color: colors.foreground,
    },
    subjectBlock: {
      marginBottom: 12,
      paddingBottom: 10,
      borderBottomWidth: 1,
      borderBottomColor: `${colors.cardBorder}60`,
    },
    subjectTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    subjectIndicator: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginRight: 8,
    },
    subjectBlockName: {
      fontSize: 14,
      fontFamily: typography.sans.bold,
      color: colors.foreground,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingVertical: 4,
      paddingLeft: 16,
    },
    topicName: {
      fontSize: 13,
      fontFamily: typography.sans.regular,
      color: colors.foreground,
    },
    topicDone: {
      color: '#10B981',
      fontFamily: typography.sans.medium,
    },
    topicCompletedLabel: {
      fontSize: 11,
      fontFamily: typography.sans.regular,
      color: '#10B981',
      marginTop: 2,
    },
    singleTopicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 4,
    },
    noTopicText: {
      fontSize: 13,
      fontFamily: typography.sans.regular,
      color: colors.mutedForeground,
      fontStyle: 'italic',
    },
    bodyText: {
      fontSize: 14,
      fontFamily: typography.sans.regular,
      color: colors.foreground,
      lineHeight: 20,
    },
    linkedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
    },
    linkedLabel: {
      fontSize: 13,
      fontFamily: typography.sans.medium,
      color: colors.mutedForeground,
      width: 60,
    },
    linkedValue: {
      fontSize: 13,
      fontFamily: typography.sans.bold,
      color: colors.foreground,
      flex: 1,
    },
    actionButtons: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    actionBtn: {
      flex: 1,
    },
    footerActions: {
      flexDirection: 'row',
      marginTop: 4,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: '85%',
      padding: 20,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: typography.sans.bold,
      color: colors.foreground,
    },
    closeBtn: {
      padding: 4,
    },
    modalScroll: {
      marginBottom: 16,
    },
    prodSelectorRow: {
      flexDirection: 'row',
      gap: 8,
    },
    prodOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.background,
    },
    prodOptionText: {
      fontSize: 12,
      fontFamily: typography.sans.medium,
      color: colors.foreground,
    },
    notesInput: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    modalFooter: {
      flexDirection: 'row',
    },
  });
