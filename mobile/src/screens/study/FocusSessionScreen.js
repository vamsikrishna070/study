import React, { useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { 
  Pause, 
  Play, 
  CircleCheck, 
  X, 
  BookOpen, 
  Target, 
  Flame, 
  Sparkles 
} from 'lucide-react-native';
import { StudySessionContext } from '../../context/StudySessionContext';
import { useAppDialog } from '../../components/ui/AppDialog';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

export default function FocusSessionScreen({ navigation }) {
  const { colors, typography, spacing, radii, isDark } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showDialog } = useAppDialog();

  const {
    activeSession,
    elapsedSeconds,
    pauseSession,
    resumeSession,
    endSession,
    discardSession,
  } = useContext(StudySessionContext);

  // If no active session, return to StartSession
  useEffect(() => {
    if (!activeSession) {
      navigation.replace('StartSession');
    }
  }, [activeSession, navigation]);

  // Intercept hardware back button to prevent accidental exit
  useEffect(() => {
    const onBackPress = () => {
      handleCancelPrompt();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [activeSession]);

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

  const handleEnd = () => {
    const finalData = endSession();
    if (finalData) {
      navigation.replace('EndSession', { sessionSummary: finalData });
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

      {/* Top Bar with Cancel / Exit */}
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

      {/* Main Focus Card */}
      <View style={styles.focusCenter}>
        {/* Status Chip */}
        <View style={[styles.statusBadge, isPaused && styles.statusBadgePaused]}>
          <View style={[styles.statusDot, isPaused && styles.statusDotPaused]} />
          <Text style={[styles.statusText, isPaused && styles.statusTextPaused]}>
            {isPaused ? 'SESSION PAUSED' : 'FOCUS SESSION'}
          </Text>
        </View>

        {/* Large Digital Timer */}
        <View style={styles.timerWrapper}>
          <Text style={styles.timerText}>{formatTimer(elapsedSeconds)}</Text>
        </View>

        {/* Subject & Topic Card */}
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
        </View>
      </View>

      {/* Bottom Action Controls */}
      <View style={styles.bottomControls}>
        <View style={styles.controlsRow}>
          {/* Pause / Resume Button */}
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

          {/* End Session Button */}
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
    </SafeAreaView>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    brandText: {
      fontFamily: typography.mono.bold,
      fontSize: 12,
      letterSpacing: 2,
      color: colors.mutedForeground,
    },
    cancelBtn: {
      width: 36,
      height: 36,
      borderRadius: radii.round,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    focusCenter: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.xl,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderColor: colors.accent,
      borderWidth: 1,
      borderRadius: radii.round,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      marginBottom: spacing.xxl,
    },
    statusBadgePaused: {
      borderColor: colors.mutedForeground,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
      marginRight: 8,
    },
    statusDotPaused: {
      backgroundColor: colors.mutedForeground,
    },
    statusText: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    statusTextPaused: {
      color: colors.mutedForeground,
    },
    timerWrapper: {
      marginVertical: spacing.lg,
      alignItems: 'center',
    },
    timerText: {
      fontFamily: typography.mono.bold,
      fontSize: 58,
      letterSpacing: 2,
      color: colors.foreground,
    },
    subjectCard: {
      width: '100%',
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.lg,
      marginTop: spacing.xl,
      alignItems: 'center',
      gap: spacing.xs,
    },
    subjectHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    subjectName: {
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
    },
    topicText: {
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    goalRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    goalText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    bottomControls: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
    },
    controlsRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    actionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.lg,
      borderRadius: radii.xl,
      gap: spacing.sm,
    },
    pauseBtn: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
    },
    pauseBtnText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 16,
      color: colors.foreground,
    },
    resumeBtn: {
      backgroundColor: colors.accent,
    },
    resumeBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: colors.primaryForeground,
    },
    endBtn: {
      backgroundColor: colors.primary,
    },
    endBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 16,
      color: colors.primaryForeground,
    },
  });
