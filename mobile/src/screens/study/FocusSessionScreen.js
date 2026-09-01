import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  SafeAreaView,
  StatusBar,
  Modal,
  ScrollView,
} from 'react-native';
import {
  Pause,
  Play,
  CircleCheck,
  X,
  BookOpen,
  Target,
  Sparkles,
  Plus
} from 'lucide-react-native';
import { StudySessionContext } from '../../context/StudySessionContext';
import { StudyTopicSelector } from '../../components/study/StudyTopicSelector';
import { getSubjects } from '../../api/subjects';
import { useAppDialog } from '../../components/ui/AppDialog';
import { Button } from '../../components/ui/Button';
import { useAppTheme, useStyles } from '../../theme/theme';

export default function FocusSessionScreen({ navigation }) {
  const { colors, isDark } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showDialog } = useAppDialog();
  const isEndingRef = useRef(false);

  const {
    activeSession,
    elapsedSeconds,
    pauseSession,
    resumeSession,
    endSession,
    discardSession,
    updateActiveSessionData,
  } = useContext(StudySessionContext);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [tempStudyType, setTempStudyType] = useState('syllabus');
  const [tempSubjects, setTempSubjects] = useState([]);
  const [tempOutside, setTempOutside] = useState([]);

  useEffect(() => {
    if (!activeSession) {
      navigation.replace('StartSession');
    }
  }, [activeSession, navigation]);

  useEffect(() => {
    const onBackPress = () => {
      handleCancelPrompt();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [activeSession]);

  useEffect(() => {
    getSubjects()
      .then((res) => setAvailableSubjects(res.data || res || []))
      .catch(() => setAvailableSubjects([]));
  }, []);

  const formatTimer = (totalSec) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  };

  const handleOpenTopicModal = () => {
    if (!activeSession) return;
    setTempStudyType(activeSession.studyType || 'syllabus');
    setTempSubjects(activeSession.subjects || []);
    setTempOutside(activeSession.outsideSyllabus || []);
    setEditModalVisible(true);
  };

  const handleSaveLiveTopics = () => {
    let summarySubName = activeSession.subjectName || 'General Study';
    let summaryTopic = activeSession.topic || '';

    if (tempStudyType === 'syllabus' && tempSubjects.length > 0) {
      summarySubName = tempSubjects[0].subjectName || summarySubName;
      const allTopNames = tempSubjects.flatMap(s => (s.topics || []).map(t => t.topicName)).filter(Boolean);
      if (allTopNames.length > 0) summaryTopic = allTopNames.join(', ');
    } else if (tempStudyType === 'outside_syllabus' && tempOutside.length > 0) {
      summarySubName = tempOutside[0].area || 'Outside Syllabus';
      const allTopNames = tempOutside.flatMap(o => (o.topics || []).map(t => t.name)).filter(Boolean);
      if (allTopNames.length > 0) summaryTopic = allTopNames.join(', ');
    }

    updateActiveSessionData({
      studyType: tempStudyType,
      subjects: tempSubjects,
      outsideSyllabus: tempOutside,
      subjectName: summarySubName,
      topic: summaryTopic,
    });

    setEditModalVisible(false);
  };

  const handleEnd = () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    const finalData = endSession();
    if (finalData) {
      navigation.replace('EndSession', { sessionSummary: finalData });
    } else {
      isEndingRef.current = false;
    }
  };

  const handleCancelPrompt = () => {
    showDialog({
      type: 'destructive',
      title: 'Discard Study Session?',
      message: 'Are you sure you want to stop? This study time will not be recorded in your history.',
      confirmText: 'Discard Session',
      cancelText: 'Keep Studying',
      onConfirm: () => {
        discardSession();
        navigation.replace('HomeDrawer');
      },
    });
  };

  if (!activeSession) return null;

  const isPaused = activeSession.status === 'paused';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Sparkles size={16} color={colors.accent} style={{ marginRight: 6 }} />
          <Text style={styles.brandText}>STUDYARENA</Text>
        </View>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={handleCancelPrompt}
          activeOpacity={0.7}
        >
          <X size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <View style={styles.focusCenter}>
        <View style={[styles.statusBadge, isPaused && styles.statusBadgePaused]}>
          <View style={[styles.statusDot, isPaused && styles.statusDotPaused]} />
          <Text style={[styles.statusText, isPaused && styles.statusTextPaused]}>
            {isPaused ? 'SESSION PAUSED' : 'FOCUS SESSION'}
          </Text>
        </View>

        <View style={styles.timerWrapper}>
          <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
        </View>

        <View style={styles.subjectCard}>
          <View style={styles.subjectHeader}>
            <BookOpen size={16} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.subjectName} numberOfLines={1}>
              {activeSession.subjectName || 'General Study'}
            </Text>
          </View>

          {Boolean(activeSession.topic) && (
            <Text style={styles.topicText} numberOfLines={2}>
              {activeSession.topic}
            </Text>
          )}

          {Boolean(activeSession.goal) && (
            <View style={styles.goalRow}>
              <Target size={14} color={colors.mutedForeground} style={{ marginRight: 6 }} />
              <Text style={styles.goalText} numberOfLines={2}>
                Goal: {activeSession.goal}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.addTopicBtn}
            onPress={handleOpenTopicModal}
            activeOpacity={0.7}
          >
            <Plus size={14} color={colors.accent} style={{ marginRight: 4 }} />
            <Text style={styles.addTopicBtnText}>Add / Edit Topics</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          {isPaused ? (
            <TouchableOpacity
              style={[styles.actionBtn, styles.resumeBtn]}
              onPress={resumeSession}
              activeOpacity={0.8}
            >
              <Play size={22} color={colors.primaryForeground} fill={colors.primaryForeground} />
              <Text style={styles.resumeBtnText}>Resume</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.actionBtn, styles.pauseBtn]}
              onPress={pauseSession}
              activeOpacity={0.8}
            >
              <Pause size={22} color={colors.foreground} />
              <Text style={styles.pauseBtnText}>Pause</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.actionBtn, styles.endBtn]}
            onPress={handleEnd}
            activeOpacity={0.8}
          >
            <CircleCheck size={22} color={colors.primaryForeground} />
            <Text style={styles.endBtnText}>End Session</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add / Edit Live Topics</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <X size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingVertical: 10 }} keyboardShouldPersistTaps="handled">
              <StudyTopicSelector
                studyType={tempStudyType}
                onStudyTypeChange={setTempStudyType}
                availableSubjects={availableSubjects}
                selectedSubjects={tempSubjects}
                onSelectedSubjectsChange={setTempSubjects}
                outsideSyllabus={tempOutside}
                onOutsideSyllabusChange={setTempOutside}
                showCompletionCheckboxes={false}
              />
            </ScrollView>

            <Button onPress={handleSaveLiveTopics} style={{ marginTop: 10 }}>
              Update Session Topics
            </Button>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    topBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    brandText: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 1.2,
      color: theme.colors.accent,
    },
    cancelBtn: {
      padding: 8,
    },
    focusCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.lg,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 20,
      marginBottom: theme.spacing.xl,
    },
    statusBadgePaused: {
      borderColor: '#F59E0B',
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: '#10B981',
      marginRight: 8,
    },
    statusDotPaused: {
      backgroundColor: '#F59E0B',
    },
    statusText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1,
      color: theme.colors.foreground,
    },
    statusTextPaused: {
      color: '#F59E0B',
    },
    timerWrapper: {
      marginBottom: theme.spacing.xl,
    },
    timerText: {
      fontSize: 56,
      fontWeight: '300',
      fontVariant: ['tabular-nums'],
      color: theme.colors.foreground,
      letterSpacing: 1,
    },
    subjectCard: {
      width: '100%',
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.xl,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.lg,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    subjectHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    subjectName: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    topicText: {
      fontSize: 14,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
    goalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },
    goalText: {
      fontSize: 12,
      color: theme.colors.mutedForeground,
      fontStyle: 'italic',
    },
    addTopicBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    addTopicBtnText: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.accent,
    },
    bottomControls: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
    },
    controlsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
    },
    actionBtn: {
      flex: 1,
      height: 56,
      borderRadius: theme.radii.xl,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 8,
    },
    pauseBtn: {
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    pauseBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    resumeBtn: {
      backgroundColor: theme.colors.primary,
    },
    resumeBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primaryForeground,
    },
    endBtn: {
      backgroundColor: theme.colors.accent,
    },
    endBtnText: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.primaryForeground,
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
      maxHeight: '85%',
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
  });
