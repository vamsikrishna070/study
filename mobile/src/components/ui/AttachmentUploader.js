import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { CloudUpload, Image as ImageIcon, Plus, Link, Video, Music } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { useAppDialog } from './AppDialog';
import { Input } from './Input';
import { Button } from './Button';
import { AttachmentCard } from './AttachmentCard';
import { pickAndUploadDocument, pickAndUploadImage } from '../../utils/fileUploader';

export function AttachmentUploader({
  attachments = [],
  onAttachmentsChange,
  allowYouTube = true,
  allowDocuments = true,
  allowImages = true,
  allowAudio = true,
  style,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showError } = useAppDialog();

  const [uploading, setUploading] = useState(false);
  const [linkInput, setLinkInput] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  const handleDocumentPick = async () => {
    try {
      setUploading(true);
      const uploaded = await pickAndUploadDocument();
      if (uploaded) {
        onAttachmentsChange([...attachments, { type: 'file', ...uploaded }]);
      }
    } catch (err) {
      showError('Upload Error', err.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      setUploading(true);
      const uploaded = await pickAndUploadImage();
      if (uploaded) {
        onAttachmentsChange([...attachments, { type: 'image', ...uploaded }]);
      }
    } catch (err) {
      showError('Upload Error', err.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleAudioPick = async () => {
    try {
      setUploading(true);
      const uploaded = await pickAndUploadDocument({
        type: [
          'audio/*',
          'audio/mpeg',
          'audio/mp3',
          'audio/wav',
          'audio/x-wav',
          'audio/m4a',
          'audio/x-m4a',
          'audio/aac',
          'audio/ogg',
        ],
      });
      if (uploaded) {
        onAttachmentsChange([...attachments, { type: 'recording', ...uploaded }]);
      }
    } catch (err) {
      showError('Upload Error', err.message || 'Failed to upload audio file.');
    } finally {
      setUploading(false);
    }
  };

  const handleAddLink = () => {
    const trimmed = linkInput.trim();
    if (!trimmed) return;

    const isYouTube = /youtube\.com|youtu\.be/i.test(trimmed);
    const newAtt = {
      type: isYouTube ? 'youtube' : 'link',
      url: trimmed,
      originalName: isYouTube ? 'YouTube Video' : trimmed,
      mimeType: isYouTube ? 'video/youtube' : 'text/html',
      size: 0,
    };

    onAttachmentsChange([...attachments, newAtt]);
    setLinkInput('');
    setShowLinkInput(false);
  };

  const handleRemove = (index) => {
    const next = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(next);
  };

  return (
    <View style={[styles.container, style]}>
      {/* Upload Action Buttons */}
      <View style={styles.buttonRow}>
        {allowDocuments && (
          <TouchableOpacity
            style={[styles.actionBtn, uploading && styles.disabled]}
            onPress={handleDocumentPick}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <CloudUpload size={16} color={colors.accent} />
            <Text style={styles.actionBtnText}>Document</Text>
          </TouchableOpacity>
        )}

        {allowImages && (
          <TouchableOpacity
            style={[styles.actionBtn, uploading && styles.disabled]}
            onPress={handleImagePick}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <ImageIcon size={16} color={colors.accent} />
            <Text style={styles.actionBtnText}>Image</Text>
          </TouchableOpacity>
        )}

        {allowAudio && (
          <TouchableOpacity
            style={[styles.actionBtn, uploading && styles.disabled]}
            onPress={handleAudioPick}
            disabled={uploading}
            activeOpacity={0.7}
          >
            <Music size={16} color={colors.accent} />
            <Text style={styles.actionBtnText}>Audio</Text>
          </TouchableOpacity>
        )}

        {allowYouTube && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => setShowLinkInput(!showLinkInput)}
            activeOpacity={0.7}
          >
            <Link size={16} color={colors.accent} />
            <Text style={styles.actionBtnText}>Link / Video</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Uploading indicator */}
      {uploading && (
        <View style={styles.uploadingBox}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={styles.uploadingText}>Uploading file to server...</Text>
        </View>
      )}

      {/* Link Input field */}
      {showLinkInput && (
        <View style={styles.linkRow}>
          <Input
            value={linkInput}
            onChangeText={setLinkInput}
            placeholder="Paste URL or YouTube link..."
            style={styles.linkTextInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            size="sm"
            onPress={handleAddLink}
            disabled={!linkInput.trim()}
            style={styles.addLinkBtn}
          >
            Add
          </Button>
        </View>
      )}

      {/* Attachment List */}
      {attachments.length > 0 && (
        <View style={styles.listContainer}>
          {attachments.map((att, index) => (
            <AttachmentCard
              key={index}
              attachment={att}
              onRemove={() => handleRemove(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      marginVertical: spacing.xs,
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    actionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    disabled: {
      opacity: 0.5,
    },
    actionBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.foreground,
    },
    uploadingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      padding: spacing.md,
      backgroundColor: colors.muted + '40',
      borderRadius: radii.md,
      marginBottom: spacing.sm,
    },
    uploadingText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.accent,
    },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    linkTextInput: {
      flex: 1,
      minHeight: 40,
    },
    addLinkBtn: {
      minHeight: 40,
      paddingHorizontal: spacing.md,
    },
    listContainer: {
      marginTop: spacing.xs,
    },
  });
