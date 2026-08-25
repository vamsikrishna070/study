import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  ExternalLink,
  Trash2,
  File,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react-native';
import { viewDocument } from '../../utils/documentViewer';
import { getAttachmentKind, openAttachment } from '../../utils/attachmentHelper';
import { globalAudioPlayer } from '../../services/audioPlayerService';
import { useAppTheme, useStyles } from '../../theme/theme';

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

export function AttachmentCard({
  attachment,
  onRemove,
  style,
  readonly = false,
  screenName = 'AttachmentCard',
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const [playbackState, setPlaybackState] = useState('idle'); // 'idle' | 'loading' | 'playing' | 'paused' | 'finished' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  if (!attachment) return null;

  // Normalize properties across all backend schemas and client picker formats
  const rawUrl =
    attachment.url ||
    attachment.uri ||
    attachment.fileUrl ||
    attachment.audioUrl ||
    attachment.fileData?.url ||
    attachment.path ||
    '';

  const rawMimeType = attachment.mimeType || attachment.fileData?.mimeType || '';
  const rawType = attachment.type || attachment.resourceType || '';
  const originalName = attachment.originalName || attachment.name || '';
  const size = attachment.size || attachment.fileData?.size || 0;
  const duration = attachment.duration || attachment.fileData?.duration || 0;

  const kind = getAttachmentKind(attachment);
  const isImage = kind === 'image';
  const isAudio = kind === 'audio';
  const isVideo = kind === 'video';
  const isPdf = kind === 'pdf';
  const isYouTube = kind === 'link' && (/youtube\.com|youtu\.be/i.test(rawUrl) || rawType === 'youtube');

  // Handle Play/Pause/Resume for Audio
  const handleToggleAudio = async () => {
    if (!rawUrl) {
      setErrorMessage('Audio reference is missing or unavailable.');
      return;
    }

    if (playbackState === 'playing') {
      await globalAudioPlayer.pause();
      setPlaybackState('paused');
    } else if (playbackState === 'paused') {
      await globalAudioPlayer.resume();
      setPlaybackState('playing');
    } else {
      setErrorMessage('');
      setPlaybackState('loading');
      await globalAudioPlayer.play(rawUrl, (update) => {
        if (update.status === 'error') {
          setPlaybackState('error');
          setErrorMessage(update.error || 'Failed to play audio');
        } else {
          setPlaybackState(update.status);
        }
      });
    }
  };

  const handleOpenGeneral = async () => {
    if (rawUrl) {
      try {
        await openAttachment(attachment);
      } catch (e) {
        if (__DEV__) console.warn('openAttachment error:', e);
        // Fallback to viewDocument just in case, though openAttachment handles it
        try {
          await viewDocument(rawUrl, originalName || 'Attachment');
        } catch (innerE) {
          console.warn('Fallback viewDocument error:', innerE);
        }
      }
    }
  };

  const displayName =
    originalName ||
    (isYouTube ? 'YouTube Link' : isAudio ? 'Voice Note' : rawUrl) ||
    'Attachment';
  const sizeText = formatFileSize(size);

  // ─── AUDIO ATTACHMENT VIEW ──────────────────────────────────────────────────
  if (isAudio) {
    return (
      <View style={[styles.card, styles.audioCard, style]}>
        <View style={styles.audioMainCol}>
          <View style={styles.audioTopRow}>
            <View style={[styles.iconBox, { backgroundColor: `${colors.primary}18` }]}>
              <Music size={18} color={colors.primary} />
            </View>
            <View style={styles.audioInfoCol}>
              <Text style={styles.nameText} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.metaText}>Voice Note</Text>
                {!!duration && <Text style={styles.metaText}>• {formatTime(duration)}</Text>}
                {!!sizeText && <Text style={styles.metaText}>• {sizeText}</Text>}
              </View>
            </View>

            {!readonly && onRemove && (
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={onRemove}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={16} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>

          {/* Inline Play / Pause Button Bar */}
          <TouchableOpacity
            style={[
              styles.audioPlayBar,
              playbackState === 'playing' && styles.audioPlayBarActive,
            ]}
            onPress={handleToggleAudio}
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
              style={[
                styles.audioPlayText,
                playbackState === 'playing' && styles.audioPlayTextActive,
              ]}
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

          {Boolean(errorMessage) && (
            <Text style={styles.errorText}>{errorMessage}</Text>
          )}
        </View>
      </View>
    );
  }

  // ─── GENERAL / DOCUMENT / IMAGE / VIDEO ATTACHMENT VIEW ────────────────────
  const getIcon = () => {
    if (isYouTube) return <Video size={20} color="#ff0000" />;
    if (isPdf) return <FileText size={20} color={colors.accent} />;
    if (isVideo) return <Video size={20} color="#4b8f8b" />;
    if (isImage) return <ImageIcon size={20} color="#b58a4a" />;
    if (rawType === 'link') return <ExternalLink size={20} color={colors.primary} />;
    return <File size={20} color={colors.mutedForeground} />;
  };

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={handleOpenGeneral}
        activeOpacity={rawUrl ? 0.7 : 1}
      >
        <View style={styles.iconBox}>{getIcon()}</View>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.metaRow}>
            {isYouTube && <Text style={styles.metaText}>YouTube</Text>}
            {sizeText ? <Text style={styles.metaText}>{sizeText}</Text> : null}
            {rawUrl && !isYouTube && (
              <Text style={styles.linkText} numberOfLines={1}>
                Tap to view
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isImage && rawUrl && (
        <Image source={{ uri: rawUrl }} style={styles.thumbnail} resizeMode="cover" />
      )}

      {!readonly && onRemove && (
        <TouchableOpacity
          style={styles.removeBtn}
          onPress={onRemove}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={colors.destructive} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.sm,
      marginVertical: spacing.xs,
    },
    audioCard: {
      flexDirection: 'column',
      alignItems: 'stretch',
    },
    audioMainCol: {
      width: '100%',
    },
    audioTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    audioInfoCol: {
      flex: 1,
    },
    audioPlayBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: `${colors.primary}14`,
      borderRadius: radii.md,
      paddingVertical: 9,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: `${colors.primary}30`,
    },
    audioPlayBarActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    audioPlayText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.primary,
    },
    audioPlayTextActive: {
      color: colors.primaryForeground,
    },
    cardContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      overflow: 'hidden',
    },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: radii.md,
      backgroundColor: colors.muted + '80',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.sm,
    },
    infoContainer: {
      flex: 1,
      marginRight: spacing.xs,
    },
    nameText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.foreground,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    metaText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    linkText: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.accent,
    },
    thumbnail: {
      width: 36,
      height: 36,
      borderRadius: radii.sm,
      marginRight: spacing.sm,
    },
    removeBtn: {
      padding: spacing.xs,
      marginLeft: spacing.xs,
    },
    errorText: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.destructive,
      marginTop: 4,
      textAlign: 'center',
    },
  });
