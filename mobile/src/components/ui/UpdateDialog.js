import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  BackHandler,
  Pressable,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sparkles, CloudDownload, TriangleAlert } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';

/**
 * Production-quality, responsive Update Dialog for StudyArena.
 * Displays version details and scrollable release notes with always-visible action buttons.
 */
export function UpdateDialog({
  visible = false,
  updateInfo,
  onUpdateNow,
  onDismiss,
  isDownloading = false,
  downloadError = '',
}) {
  const { colors, typography, spacing, radii, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles(createStyles);

  const animValue = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(animValue, {
        toValue: 1,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
  }, [visible]);

  // Android hardware back button handling
  useEffect(() => {
    const onBackPress = () => {
      if (visible && !isDownloading && !updateInfo?.isForced) {
        onDismiss?.();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [visible, isDownloading, updateInfo?.isForced, onDismiss]);

  if (!showModal) return null;

  const isForced = Boolean(updateInfo?.isForced);
  const version = updateInfo?.latestVersion || '1.0.1';
  const installedVersion = updateInfo?.installedVersion || '1.0.0';
  const releaseNotes = updateInfo?.releaseNotes || [];

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.6],
  });

  const cardScale = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.92, 1],
  });

  const cardOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const cardTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 0],
  });

  const handleBackdropPress = () => {
    if (!isDownloading && !isForced) {
      onDismiss?.();
    }
  };

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={handleBackdropPress}
      statusBarTranslucent
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleBackdropPress}>
          <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity: backdropOpacity }]} />
        </Pressable>

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardOpacity,
              transform: [{ scale: cardScale }, { translateY: cardTranslateY }],
            },
          ]}
        >
          {/* Top Icon Badge */}
          <View
            style={[
              styles.iconBadge,
              {
                backgroundColor: isForced ? `${colors.destructive}16` : `${colors.primary}16`,
              },
            ]}
          >
            {isForced ? (
              <TriangleAlert size={28} color={colors.destructive} />
            ) : (
              <Sparkles size={28} color={colors.primary} />
            )}
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isForced ? 'Update Required' : 'New Version Available'}
          </Text>

          {/* Subtitle */}
          <Text style={styles.subtitle}>
            {isForced
              ? `Your installed version (v${installedVersion}) is no longer supported.`
              : `StudyArena v${version} is now available.`}
          </Text>

          {/* Inner Surface: Scrollable Release Notes */}
          {releaseNotes.length > 0 && (
            <View style={styles.notesSurface}>
              <Text style={styles.notesHeader}>WHAT'S NEW</Text>

              <ScrollView
                style={styles.notesScroll}
                contentContainerStyle={styles.notesScrollContent}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                bounces={false}
              >
                {releaseNotes.map((note, idx) => (
                  <View key={idx} style={styles.bulletRow}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Download Error Notice if any */}
          {Boolean(downloadError) && (
            <Text style={styles.errorText}>{downloadError}</Text>
          )}

          {/* Bottom Action Row (Always Visible) */}
          <View style={styles.actionRow}>
            {!isForced && (
              <TouchableOpacity
                style={styles.laterButton}
                onPress={onDismiss}
                disabled={isDownloading}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Later"
              >
                <Text style={styles.laterButtonText}>Later</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.updateButton,
                isForced && styles.updateButtonFull,
                isDownloading && styles.updateButtonDisabled,
              ]}
              onPress={onUpdateNow}
              disabled={isDownloading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Update Now"
            >
              {isDownloading ? (
                <View style={styles.buttonContentRow}>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.updateButtonText}>Opening...</Text>
                </View>
              ) : (
                <View style={styles.buttonContentRow}>
                  <CloudDownload size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.updateButtonText}>Update Now</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const createStyles = ({ colors, typography, spacing, radii, isDark }) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    backdrop: {
      backgroundColor: '#000000',
    },
    card: {
      width: '90%',
      maxWidth: 420,
      maxHeight: '85%',
      backgroundColor: colors.card,
      borderRadius: radii.xxl,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.cardBorder,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: isDark ? 0.45 : 0.16,
      shadowRadius: 28,
      elevation: 24,
    },
    iconBadge: {
      width: 58,
      height: 58,
      borderRadius: radii.xl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    title: {
      fontFamily: typography.sans.bold,
      fontSize: 20,
      color: colors.foreground,
      textAlign: 'center',
      marginBottom: 4,
      letterSpacing: -0.2,
    },
    subtitle: {
      fontFamily: typography.sans.medium,
      fontSize: 14,
      color: colors.mutedForeground,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
    },
    notesSurface: {
      width: '100%',
      backgroundColor: colors.background,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginBottom: spacing.md,
    },
    notesHeader: {
      fontFamily: typography.sans.bold,
      fontSize: 11,
      color: colors.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    notesScroll: {
      maxHeight: 180,
    },
    notesScrollContent: {
      paddingBottom: 4,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 8,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.primary,
      marginTop: 7,
      marginRight: 10,
    },
    bulletText: {
      flex: 1,
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.foreground,
      lineHeight: 19,
    },
    errorText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.destructive,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      width: '100%',
      marginTop: spacing.xs,
    },
    laterButton: {
      flex: 1,
      height: 48,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    laterButtonText: {
      fontFamily: typography.sans.semiBold,
      fontSize: 14,
      color: colors.foreground,
    },
    updateButton: {
      flex: 1,
      height: 48,
      borderRadius: radii.lg,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 4,
    },
    updateButtonFull: {
      flex: 1,
    },
    updateButtonDisabled: {
      opacity: 0.8,
    },
    buttonContentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    updateButtonText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: '#FFFFFF',
    },
  });
