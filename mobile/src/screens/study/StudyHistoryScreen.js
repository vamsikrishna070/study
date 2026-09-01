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
  Clock,
  Trash2,
  X,
  Target,
  Sparkles,
  Smile,
  Meh,
  Frown,
  CircleCheck,
  CalendarDays,
} from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { useAppDialog } from '../../components/ui/AppDialog';
import { getStudySessions, deleteStudySession } from '../../api/studySessions';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function StudyHistoryScreen({ navigation }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showDialog, showSuccess, showError } = useAppDialog();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

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
  }, [loadSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleDeletePrompt = (session) => {
    showDialog({
      type: 'destructive',
      title: 'Delete Study Session?',
      message: 'This will remove the session from your history and recalculate your study time.',
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
        return { label: 'Difficult', color: '#f59e0b', icon: Frown };
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
                  <TouchableOpacity
                    style={styles.chartIconBtn}
                    onPress={() => navigation.navigate('StudyAnalytics')}
                    activeOpacity={0.7}
                  >
                    <BarChart2 size={18} color={colors.accent} />
                  </TouchableOpacity>
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
                          {subName}
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
                activeOpacity={0.7}
              >
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedSession && (
              <ScrollView style={styles.modalScroll}>
                <View style={styles.modalDetailItem}>
                  <Text style={styles.modalLabel}>Subject</Text>
                  <Text style={styles.modalValue}>
                    {selectedSession.subject?.name || selectedSession.subjectName || 'General Study'}
                  </Text>
                </View>

                {Boolean(selectedSession.topic) && (
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalLabel}>Topic</Text>
                    <Text style={styles.modalValue}>{selectedSession.topic}</Text>
                  </View>
                )}

                <View style={styles.modalDetailItem}>
                  <Text style={styles.modalLabel}>Duration</Text>
                  <Text style={styles.modalValue}>
                    {formatDuration(selectedSession.durationMinutes || 0)}
                  </Text>
                </View>

                <View style={styles.modalDetailItem}>
                  <Text style={styles.modalLabel}>Started At</Text>
                  <Text style={styles.modalValue}>
                    {new Date(selectedSession.startedAt).toLocaleString()}
                  </Text>
                </View>

                {Boolean(selectedSession.goal) && (
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalLabel}>Session Goal</Text>
                    <Text style={styles.modalValue}>{selectedSession.goal}</Text>
                  </View>
                )}

                {Boolean(selectedSession.notes) && (
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalLabel}>Accomplishments & Notes</Text>
                    <Text style={styles.modalValue}>{selectedSession.notes}</Text>
                  </View>
                )}

                {Boolean(selectedSession.task?.title) && (
                  <View style={styles.modalDetailItem}>
                    <Text style={styles.modalLabel}>Linked Task</Text>
                    <Text style={styles.modalValue}>{selectedSession.task.title}</Text>
                  </View>
                )}

                <View style={styles.modalActions}>
                  <Button
                    variant="outline"
                    style={{ borderColor: '#ef4444' }}
                    onPress={() => handleDeletePrompt(selectedSession)}
                    icon={<Trash2 size={16} color="#ef4444" style={{ marginRight: 6 }} />}
                  >
                    <Text style={{ color: '#ef4444' }}>Delete Record</Text>
                  </Button>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xxl,
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    headerBtn: {
      paddingHorizontal: spacing.sm + 4,
    },
    chartIconBtn: {
      width: 40,
      height: 40,
      borderRadius: radii.round,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
      marginLeft: 4,
    },
    groupSection: {
      marginBottom: spacing.xl,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm,
      paddingHorizontal: 4,
    },
    groupTitle: {
      fontFamily: typography.mono.bold,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.accent,
    },
    groupSummary: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    sessionCard: {
      marginBottom: spacing.sm,
      padding: 0,
      overflow: 'hidden',
    },
    sessionMainRow: {
      flexDirection: 'row',
    },
    colorBar: {
      width: 5,
    },
    sessionInfo: {
      flex: 1,
      padding: spacing.md,
      gap: 4,
    },
    sessionTitleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sessionSubject: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
      flex: 1,
      marginRight: spacing.sm,
    },
    sessionDuration: {
      fontFamily: typography.mono.bold,
      fontSize: 14,
      color: colors.accent,
    },
    sessionTopic: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    sessionMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: 4,
    },
    typeBadge: {
      backgroundColor: colors.muted,
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    typeBadgeText: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      color: colors.mutedForeground,
    },
    prodBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      paddingHorizontal: spacing.xs + 2,
      paddingVertical: 2,
      borderRadius: radii.sm,
    },
    prodBadgeText: {
      fontFamily: typography.sans.medium,
      fontSize: 10,
    },
    timeText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginLeft: 'auto',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end',
    },
    modalCard: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '80%',
      padding: spacing.xl,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontFamily: typography.serif.medium,
      fontSize: 20,
      color: colors.foreground,
    },
    closeBtn: {
      padding: 4,
    },
    modalScroll: {
      gap: spacing.md,
    },
    modalDetailItem: {
      marginBottom: spacing.md,
    },
    modalLabel: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.mutedForeground,
      marginBottom: 2,
    },
    modalValue: {
      fontFamily: typography.sans.medium,
      fontSize: 15,
      color: colors.foreground,
    },
    modalActions: {
      marginTop: spacing.lg,
      marginBottom: spacing.xl,
    },
  });
