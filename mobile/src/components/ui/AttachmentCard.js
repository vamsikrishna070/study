import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import {
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  ExternalLink,
  Trash2,
  File,
} from 'lucide-react-native';
import { viewDocument } from '../../utils/documentViewer';
import { useAppTheme, useStyles } from '../../theme/theme';

export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

export function AttachmentCard({
  attachment,
  onRemove,
  style,
  readonly = false,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  if (!attachment) return null;

  const {
    type,
    mimeType = '',
    originalName,
    url,
    size,
    duration,
  } = attachment;

  const isImage =
    mimeType?.startsWith('image/') ||
    type === 'image' ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(url || '');

  const isAudio =
    mimeType?.startsWith('audio/') ||
    type === 'audio' ||
    type === 'recording' ||
    /\.(mp3|wav|m4a|aac|ogg)$/i.test(url || '');

  const isVideo =
    mimeType?.startsWith('video/') ||
    type === 'video' ||
    /\.(mp4|mov|avi|mkv)$/i.test(url || '');

  const isYouTube =
    type === 'youtube' ||
    /youtube\.com|youtu\.be/i.test(url || '');

  const isPdf =
    mimeType?.includes('pdf') ||
    /\.pdf$/i.test(url || '') ||
    /\.pdf$/i.test(originalName || '');

  const handleOpen = async () => {
    if (url) {
      await viewDocument(url, originalName || 'Attachment');
    }
  };

  const getIcon = () => {
    if (isYouTube) return <Video size={20} color="#ff0000" />;
    if (isPdf) return <FileText size={20} color={colors.accent} />;
    if (isAudio) return <Music size={20} color="#8d6b8d" />;
    if (isVideo) return <Video size={20} color="#4b8f8b" />;
    if (isImage) return <ImageIcon size={20} color="#b58a4a" />;
    if (type === 'link') return <ExternalLink size={20} color={colors.primary} />;
    return <File size={20} color={colors.mutedForeground} />;
  };

  const displayName = originalName || (isYouTube ? 'YouTube Link' : url) || 'Attachment';
  const sizeText = formatFileSize(size);

  return (
    <View style={[styles.card, style]}>
      <TouchableOpacity
        style={styles.cardContent}
        onPress={handleOpen}
        activeOpacity={url ? 0.7 : 1}
      >
        <View style={styles.iconBox}>{getIcon()}</View>
        <View style={styles.infoContainer}>
          <Text style={styles.nameText} numberOfLines={1}>
            {displayName}
          </Text>
          <View style={styles.metaRow}>
            {isYouTube && <Text style={styles.metaText}>YouTube</Text>}
            {duration ? <Text style={styles.metaText}>{Math.round(duration)}s</Text> : null}
            {sizeText ? <Text style={styles.metaText}>{sizeText}</Text> : null}
            {url && !isYouTube && (
              <Text style={styles.linkText} numberOfLines={1}>
                Tap to view
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>

      {isImage && url && (
        <Image
          source={{ uri: url }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
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
      fontSize: 10,
      color: colors.mutedForeground,
    },
    linkText: {
      fontFamily: typography.sans.regular,
      fontSize: 10,
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
  });
