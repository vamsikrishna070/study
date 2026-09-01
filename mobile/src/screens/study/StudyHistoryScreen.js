import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native';
import {
  RotateCcw,
  Play,
  PenLine,
  BarChart2,
  BookOpen,
  Trash2,
  X,
  Smile,
  Meh,
  Frown,
  Check,
  Globe,
  Save
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Field } from '../../components/ui/Field';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { StudyTopicSelector } from '../../components/study/StudyTopicSelector';
import { useAppDialog } from '../../components/ui/AppDialog';
import { getStudySessions, deleteStudySession, updateStudySession } from '../../api/studySessions';
import { getSubjects } from '../../api/subjects';
import { useAppTheme, useStyles } from '../../theme/theme';

export default function StudyHistoryScreen({ navigation }) {
  const { colors } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showDialog, showSuccess, showError } = useAppDialog();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [editStudyType, setEditStudyType] = useState('syllabus');
  const [editSubjects, setEditSubjects] = useState([]);
  const [editOutside, setEditOutside] = useState([]);
  const [editNotes, setEditNotes] = useState('');
  const [editDuration, setEditDuration] = useState('45');
  const [editProductivity, setEditProductivity] = useState('productive');
  const [savingEdit, setSavingEdit] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const res = await getStudySessions({ limit: 100 });
      setSessions(res.data || []);
    } catch (err) {
      console.error('[StudyHistory] Error loading sessions:', err);
      setError('Unable to load study history. Please check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
    getSubjects()
      .then((res) => setAvailableSubjects(res.data || res || []))
      .catch(() => setAvailableSubjects([]));
  }, [loadSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleOpenEdit = (session) => {
    setEditingSession(session);
    setEditStudyType(session.studyType || (session.outsideSyllabus?.length ? 'outside_syllabus' : 'syllabus'));
    setEditSubjects(session.subjects || []);
    setEditOutside(session.outsideSyllabus || []);
    setEditNotes(session.notes || '');
    setEditDuration(String(session.durationMinutes || 45));
    setEditProductivity(session.productivity || 'productive');
    setSelectedSession(null);
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingSession || savingEdit) return;
    const durMins = parseInt(editDuration, 10);
    if (!durMins || durMins <= 0) {
      showError('Invalid Duration', 'Please enter a valid study duration in minutes.');
      return;
    }

    try {
      setSavingEdit(true);
      const sessionId = editingSession._id || editingSession.id;

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

      const updated = await updateStudySession(sessionId, payload);
      const updatedItem = updated.data || updated;

      setSessions((prev) =>
        prev.map((s) => ((s._id || s.id) === sessionId ? { ...s, ...updatedItem } : s))
      );

      setEditModalVisible(false);
      setEditingSession(null);
      showSuccess('Log Updated', 'Study session and syllabus completion updated.');
    } catch (err) {
      console.error('[StudyHistory] Save edit error:', err);
      showError('Update Failed', 'Failed to update study session. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePrompt = (session) => {
    showDialog({
      type: 'destructive',
      title: 'Delete Study Session?',
      message: 'This will remove the session from your history and recalculate your syllabus progress.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteStudySession(session._id || session.id);
          setSessions((prev) => prev.filter((s) => (s._id || s.id) !== (session._id || session.id)));
          if (selectedSession && (selectedSession._id || selectedSession.id) === (session._id || session.id)) {
            setSelectedSession(null);
          }
          showSuccess('Session Deleted', 'Study session removed from history.');
        } catch (err) {
          showError('Delete Failed', 'Failed to delete study session. Please try again.');
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

  const groupSessionsByDate = (list) => {
    const groups = {};
    const todayStr = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toDateString();

    list.forEach((session) => {
      const sDate = session.startedAt ? new Date(session.startedAt) : new Date();
      const dateStr = sDate.toDateString();
      let header = dateStr;

      if (dateStr === todayStr) {
        header = 'Today';
      } else if (dateStr === yesterdayStr) {
        header = 'Yesterday';
      } else {
        header = sDate.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: sDate.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });
      }

      if (!groups[header]) {
        groups[header] = [];
      }
      groups[header].push(session);
    });

    return Object.entries(groups).map(([title, data]) => ({ title, data }));
  };

  const groupedData = groupSessionsByDate(sessions);

  const getProductivityBadge = (rating) => {
    switch (rating) {
      case 'productive':
        return { label: 'Productive', color: colors.accent, icon: Smile };
      case 'average':
        return { label: 'Average', color: colors.mutedForeground, icon: Meh };
      case 'difficult':
        return { label: 'Difficult', color: '#F59E0B', icon: Frown };
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <Header />
      <FlatList
        data={groupedData}
        keyExtractor={(item) => item.title}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.scroll}
        ListHeaderComponent={
          <>
            <PageHeading
              eyebrow="Activity Record"
              title="Study History"
              detail="Every focused hour, tracked and organized by subject and topic."
              action={
                <View style={styles.headerActions}>
                  <Button
                    onPress={() => navigation.navigate('StartSession')}
                    style={styles.headerBtn}
                  >
                    <Play size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                    Start
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => navigation.navigate('LogSession')}
                    style={styles.headerBtn}
                  >
                    <PenLine size={16} color={colors.foreground} style={{ marginRight: 6 }} />
                    Log
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => navigation.navigate('StudyAnalytics')}
                    style={styles.headerBtn}
                  >
                    <BarChart2 size={16} color={colors.accent} style={{ marginRight: 6 }} />
                    Stats
                  </Button>
                </View>
              }
            />
            <QueryState error={error} onRetry={loadSessions} label="Study Sessions" />
          </>
        }
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState
              icon={RotateCcw}
              title="No study sessions yet"
              detail="Start a focus timer session or log your hours to see your study record here."
              action={
                <Button onPress={() => navigation.navigate('StartSession')}>
                  <Play size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                  Start Studying
                </Button>
              }
            />
          ) : null
        }
        renderItem={({ item: group }) => (
          <View style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <Text style={styles.groupSummary}>
                {group.data.length} session{group.data.length > 1 ? 's' : ''} •{' '}
                {formatDuration(group.data.reduce((sum, s) => sum + (s.durationMinutes || 0), 0))}
              </Text>
            </View>

            {group.data.map((session) => {
              const subName = session.subject?.name || session.subjectName || 'General Study';
              const subColor = session.subject?.color || colors.accent;
              const prodBadge = getProductivityBadge(session.productivity);
              const hasMultiSubs = Array.isArray(session.subjects) && session.subjects.length > 1;

              return (
                <Card
                  key={session._id || session.id || Math.random()}
                  style={styles.sessionCard}
                  onPress={() => setSelectedSession(session)}
                >
                  <View style={styles.sessionMainRow}>
                    <View style={[styles.colorBar, { backgroundColor: subColor }]} />
                    <View style={styles.sessionInfo}>
                      <View style={styles.sessionTitleRow}>
                        <Text style={styles.sessionSubject} numberOfLines={1}>
                          {subName} {hasMultiSubs ? `(+${session.subjects.length - 1} more)` : ''}
                        </Text>
                        <Text style={styles.sessionDuration}>
                          {formatDuration(session.durationMinutes || 0)}
                        </Text>
                      </View>

                      {Boolean(session.topic) && (
                        <Text style={styles.sessionTopic} numberOfLines={1}>
                          {session.topic}
                        </Text>
                      )}

                      <View style={styles.sessionMetaRow}>
                        <View style={styles.typeBadge}>
                          <Text style={styles.typeBadgeText}>
                            {session.sessionType === 'manual' ? 'Manual' : 'Timer'}
                          </Text>
                        </View>

                        {session.studyType === 'outside_syllabus' && (
                          <View style={styles.outsideBadge}>
                            <Globe size={11} color={colors.accent} style={{ marginRight: 4 }} />
                            <Text style={styles.outsideBadgeText}>Outside Syllabus</Text>
                          </View>
                        )}

                        {prodBadge && (
                          <View style={[styles.prodBadge, { borderColor: prodBadge.color + '40' }]}>
                            <prodBadge.icon size={12} color={prodBadge.color} style={{ marginRight: 4 }} />
                            <Text style={[styles.prodBadgeText, { color: prodBadge.color }]}>
                              {prodBadge.label}
                            </Text>
                          </View>
                        )}

                        <Text style={styles.timeText}>
                          {new Date(session.startedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Card>
              );
            })}
          </View>
        )}
      />

      <Modal
        visible={Boolean(selectedSession)}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedSession(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Session Details</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setSelectedSession(null)}
              >
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.detailCard}>
                  <Text style={styles.detailSubject}>
                    {selectedSession.subjectName || selectedSession.subject?.name || 'General Study'}
                  </Text>
                  {Boolean(selectedSession.topic) && (
                    <Text style={styles.detailTopic}>{selectedSession.topic}</Text>
                  )}
                  <Text style={styles.detailDuration}>
                    {formatDuration(selectedSession.durationMinutes || 0)}
                  </Text>
                </View>

                {Array.isArray(selectedSession.subjects) && selectedSession.subjects.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Subjects & Topics:</Text>
                    {selectedSession.subjects.map((sub, sIdx) => (
                      <View key={`det_sub_${sIdx}`} style={styles.detailSubBlock}>
                        <Text style={styles.detailSubTitle}>• {sub.subjectName || 'Subject'}</Text>
                        {(sub.topics || []).map((top, tIdx) => (
                          <View key={`det_top_${tIdx}`} style={styles.detailTopRow}>
                            <Check size={12} color={top.completed ? '#10B981' : colors.mutedForeground} style={{ marginRight: 6 }} />
                            <Text style={[styles.detailTopText, top.completed && { color: '#10B981', fontWeight: '600' }]}>
                              {top.topicName} {top.completed ? '(Completed)' : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {Array.isArray(selectedSession.outsideSyllabus) && selectedSession.outsideSyllabus.length > 0 && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Outside Syllabus Content:</Text>
                    {selectedSession.outsideSyllabus.map((out, oIdx) => (
                      <View key={`det_out_${oIdx}`} style={styles.detailSubBlock}>
                        <Text style={styles.detailSubTitle}>• {out.area || 'General Area'}</Text>
                        {(out.topics || []).map((top, tIdx) => (
                          <View key={`det_out_top_${tIdx}`} style={styles.detailTopRow}>
                            <Check size={12} color={top.completed ? '#10B981' : colors.mutedForeground} style={{ marginRight: 6 }} />
                            <Text style={[styles.detailTopText, top.completed && { color: '#10B981', fontWeight: '600' }]}>
                              {top.name} {top.completed ? '(Completed)' : ''}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                )}

                {Boolean(selectedSession.notes) && (
                  <View style={styles.detailSection}>
                    <Text style={styles.sectionHeader}>Notes / Reflection:</Text>
                    <Text style={styles.notesText}>{selectedSession.notes}</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Button
                    style={{ flex: 1 }}
                    onPress={() => handleOpenEdit(selectedSession)}
                  >
                    <PenLine size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
                    Edit Study Log
                  </Button>
                  <Button
                    variant="destructive"
                    style={{ flex: 1 }}
                    onPress={() => handleDeletePrompt(selectedSession)}
                  >
                    <Trash2 size={16} color={colors.destructiveForeground} style={{ marginRight: 6 }} />
                    Delete
                  </Button>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Study Log</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }} keyboardShouldPersistTaps="handled">
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
                  value={editDuration}
                  onChangeText={setEditDuration}
                  keyboardType="numeric"
                  placeholder="45"
                />
              </Field>

              <Field label="Productivity Rating">
                <View style={styles.prodRow}>
                  <TouchableOpacity
                    style={[styles.prodOption, editProductivity === 'productive' && styles.prodOptionActive]}
                    onPress={() => setEditProductivity('productive')}
                    activeOpacity={0.7}
                  >
                    <Smile size={18} color={editProductivity === 'productive' ? colors.accent : colors.mutedForeground} />
                    <Text style={[styles.prodText, editProductivity === 'productive' && styles.prodTextActive]}>
                      Productive
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.prodOption, editProductivity === 'average' && styles.prodOptionActive]}
                    onPress={() => setEditProductivity('average')}
                    activeOpacity={0.7}
                  >
                    <Meh size={18} color={editProductivity === 'average' ? colors.accent : colors.mutedForeground} />
                    <Text style={[styles.prodText, editProductivity === 'average' && styles.prodTextActive]}>
                      Average
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.prodOption, editProductivity === 'difficult' && styles.prodOptionActive]}
                    onPress={() => setEditProductivity('difficult')}
                    activeOpacity={0.7}
                  >
                    <Frown size={18} color={editProductivity === 'difficult' ? '#F59E0B' : colors.mutedForeground} />
                    <Text style={[styles.prodText, editProductivity === 'difficult' && styles.prodTextActive]}>
                      Difficult
                    </Text>
                  </TouchableOpacity>
                </View>
              </Field>

              <Field label="Notes / Reflection">
                <Input
                  value={editNotes}
                  onChangeText={setEditNotes}
                  placeholder="Notes..."
                  multiline
                  numberOfLines={3}
                  style={{ height: 70, textAlignVertical: 'top' }}
                />
              </Field>

              <Button
                onPress={handleSaveEdit}
                loading={savingEdit}
                style={{ marginTop: 14 }}
              >
                <Save size={18} color={colors.primaryForeground} style={{ marginRight: 8 }} />
                Save Log Changes
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scroll: {
      padding: theme.spacing.lg,
      paddingBottom: 40,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    headerBtn: {
      height: 38,
      paddingHorizontal: 12,
    },
    chartIconBtn: {
      width: 38,
      height: 38,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupSection: {
      marginBottom: theme.spacing.xl,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.sm,
    },
    groupTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    groupSummary: {
      fontSize: 12,
      color: theme.colors.mutedForeground,
    },
    sessionCard: {
      marginBottom: theme.spacing.sm,
      padding: theme.spacing.md,
    },
    sessionMainRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    colorBar: {
      width: 4,
      borderRadius: 2,
      marginRight: theme.spacing.md,
    },
    sessionInfo: {
      flex: 1,
      gap: 4,
    },
    sessionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionSubject: {
      fontSize: 15,
      fontWeight: '700',
      color: theme.colors.foreground,
      flex: 1,
      marginRight: 8,
    },
    sessionDuration: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    sessionTopic: {
      fontSize: 13,
      color: theme.colors.mutedForeground,
    },
    sessionMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    typeBadge: {
      backgroundColor: theme.colors.background,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
    },
    outsideBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: `${theme.colors.accent}12`,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
      borderWidth: 1,
      borderColor: `${theme.colors.accent}30`,
    },
    outsideBadgeText: {
      fontSize: 10,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    prodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: theme.radii.sm,
      borderWidth: 1,
    },
    prodBadgeText: {
      fontSize: 10,
      fontWeight: '600',
    },
    timeText: {
      fontSize: 11,
      color: theme.colors.mutedForeground,
      marginLeft: 'auto',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: theme.radii.xl,
      borderTopRightRadius: theme.radii.xl,
      padding: theme.spacing.lg,
      maxHeight: '88%',
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    closeBtn: {
      padding: 4,
    },
    modalScroll: {
      paddingVertical: 4,
    },
    detailCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
      alignItems: 'center',
    },
    detailSubject: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.foreground,
      textAlign: 'center',
    },
    detailTopic: {
      fontSize: 14,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
      marginTop: 4,
    },
    detailDuration: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.accent,
      marginTop: 8,
    },
    detailSection: {
      marginBottom: theme.spacing.md,
    },
    sectionHeader: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.mutedForeground,
      marginBottom: 6,
    },
    detailSubBlock: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.md,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: 6,
    },
    detailSubTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    detailTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: 12,
      marginVertical: 2,
    },
    detailTopText: {
      fontSize: 12,
      color: theme.colors.mutedForeground,
    },
    notesText: {
      fontSize: 14,
      color: theme.colors.foreground,
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modalActions: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.md,
    },
    prodRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    prodOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    },
    prodOptionActive: {
      borderColor: theme.colors.accent,
      backgroundColor: `${theme.colors.accent}12`,
    },
    prodText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
    },
    prodTextActive: {
      color: theme.colors.foreground,
    },
  });
