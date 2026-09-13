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
  Eye,
  Download,
  Share2,
  Check,
} from 'lucide-react-native';
import { viewDocument, downloadDocument, shareDocument } from '../../utils/documentViewer';
import {
  getAttachmentKind,
  getKindLabel,
  getOpenLabel,
  isLinkKind,
  openAttachment,
  resolveAttachmentFileName,
} from '../../utils/attachmentHelper';
import { globalAudioPlayer } from '../../services/audioPlayerService';
import { useAppTheme, useStyles } from '../../theme/theme';
import { useAppDialog } from './AppDialog';

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
  const { showError } = useAppDialog();

  const [playbackState, setPlaybackState] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isOpening, setIsOpening] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  if (!attachment) return null;

  const rawUrl =
    attachment.url ||
    attachment.uri ||
    attachment.fileUrl ||
    attachment.audioUrl ||
    attachment.fileData?.url ||
    attachment.path ||
    '';

  const kind = getAttachmentKind(attachment);
  const isImage = kind === 'image';
  const isAudio = kind === 'audio';
  const isVideo = kind === 'video';
  const isPdf = kind === 'pdf';
  const isPresentation = kind === 'presentation';
  const isDocument = kind === 'document';
  const isLink = isLinkKind(kind);

  const fileName = resolveAttachmentFileName(attachment);
  const size = attachment.size || attachment.fileData?.size || 0;
  const duration = attachment.duration || attachment.fileData?.duration || 0;
  const sizeText = !isLink ? formatFileSize(size) : '';
  const kindLabel = getKindLabel(kind);
  const openLabel = getOpenLabel(kind);

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
    if (!rawUrl || isOpening) return;
    setIsOpening(true);
    try {
      await openAttachment(attachment);
    } catch (e) {
      if (__DEV__) console.warn('openAttachment error:', e);
      try {
        await viewDocument(rawUrl, fileName);
      } catch (innerE) {
        showError('Couldn’t Open File', innerE?.message || 'Unable to open this file.');
      }
    } finally {
      setIsOpening(false);
    }
  };

  const handleDownload = async () => {
    if (!rawUrl || isDownloading || isLink) return;
    setIsDownloading(true);
    try {
      await downloadDocument(rawUrl, fileName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      showError('Download Failed', 'Could not download the file. Please check your connection.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!rawUrl || isSharing) return;
    setIsSharing(true);
    try {
      await shareDocument(rawUrl, fileName);
    } catch (err) {
      showError('Share Failed', 'Unable to share this file right now.');
    } finally {
      setIsSharing(false);
    }
  };

  const getIcon = () => {
    switch (kind) {
      case 'instagram_reel':
      case 'instagram_post':
        return <Video size={20} color="#e1306c" />;
      case 'linkedin_post':
        return <ExternalLink size={20} color="#0077b5" />;
      case 'youtube':
        return <Video size={20} color="#ff0000" />;
      case 'twitter':
        return <ExternalLink size={20} color="#1da1f2" />;
      case 'github':
        return <ExternalLink size={20} color={colors.foreground} />;
      case 'link':
        return <ExternalLink size={20} color={colors.mutedForeground} />;
      case 'pdf':
        return <FileText size={20} color={colors.accent} />;
      case 'presentation':
        return <File size={20} color="#e07a5f" />;
      case 'document':
        return <FileText size={20} color={colors.accent} />;
      case 'video':
        return <Video size={20} color="#4b8f8b" />;
      case 'image':
        return <ImageIcon size={20} color="#b58a4a" />;
      case 'audio':
        return <Music size={20} color={colors.primary} />;
      default:
        return <File size={20} color={colors.mutedForeground} />;
    }
  };

  const getActionIcon = () => {
    if (kind === 'youtube' || kind === 'video') {
      return <Play size={14} color={colors.primaryForeground} fill="currentColor" style={{ marginRight: 6 }} />;
    }
    if (isLink) {
      return <ExternalLink size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />;
    }
    return <Eye size={14} color={colors.primaryForeground} style={{ marginRight: 6 }} />;
  };

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
                {fileName}
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
                accessibilityLabel={`Remove ${fileName}`}
              >
                <Trash2 size={16} color={colors.destructive} />
              </TouchableOpacity>
            )}
          </View>

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

  return (
    <View style={[styles.card, style]}>

      <View style={styles.topRow}>
        <View style={styles.iconBox}>{getIcon()}</View>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {fileName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.kindBadge}>{kindLabel}</Text>
            {sizeText ? <Text style={styles.metaText}>• {sizeText}</Text> : null}
          </View>
        </View>

        {!readonly && onRemove && (
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={`Remove ${fileName}`}
          >
            <Trash2 size={16} color={colors.destructive} />
          </TouchableOpacity>
        )}
      </View>

      {isImage && rawUrl && (
        <Image source={{ uri: rawUrl }} style={styles.imagePreview} resizeMode="cover" />
      )}

      {Boolean(rawUrl) && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryViewBtn}
            onPress={handleOpenGeneral}
            disabled={isOpening}
            activeOpacity={0.8}
            accessibilityLabel={`${openLabel} - ${fileName}`}
          >
            {isOpening ? (
              <ActivityIndicator size="small" color={colors.primaryForeground} style={{ marginRight: 6 }} />
            ) : (
              getActionIcon()
            )}
            <Text style={styles.primaryViewBtnText}>
              {isOpening ? 'Opening...' : openLabel}
            </Text>
          </TouchableOpacity>

          {/* Secondary Actions (Download, Share) */}
          <View style={styles.secondaryActionsRow}>
            {!isLink && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={handleDownload}
                disabled={isDownloading}
                activeOpacity={0.7}
                accessibilityLabel={`Download ${fileName}`}
              >
                {isDownloading ? (
                  <ActivityIndicator size="small" color={colors.foreground} style={{ marginRight: 4 }} />
                ) : downloadSuccess ? (
                  <Check size={13} color={colors.accent} style={{ marginRight: 4 }} />
                ) : (
                  <Download size={13} color={colors.foreground} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.secondaryBtnText, downloadSuccess && { color: colors.accent }]}>
                  {isDownloading ? 'Saving...' : downloadSuccess ? 'Saved' : 'Download'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={handleShare}
              disabled={isSharing}
              activeOpacity={0.7}
              accessibilityLabel={`Share ${fileName}`}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={colors.foreground} style={{ marginRight: 4 }} />
              ) : (
                <Share2 size={13} color={colors.foreground} style={{ marginRight: 4 }} />
              )}
              <Text style={styles.secondaryBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    card: {
      flexDirection: 'column',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.sm + 2,
      marginVertical: spacing.xs,
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
    iconBox: {
      width: 38,
      height: 38,
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
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    kindBadge: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.accent,
      textTransform: 'uppercase',
    },
    metaText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    imagePreview: {
      width: '100%',
      height: 100,
      borderRadius: radii.md,
      marginTop: spacing.xs + 2,
    },
    actionSection: {
      marginTop: spacing.xs + 4,
      gap: spacing.xs,
    },
    primaryViewBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      borderRadius: radii.md,
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    primaryViewBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.primaryForeground,
    },
    secondaryActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    secondaryBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.sm,
      paddingVertical: 5,
      paddingHorizontal: 8,
    },
    secondaryBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.foreground,
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

