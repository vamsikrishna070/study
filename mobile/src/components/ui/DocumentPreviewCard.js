import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import {
  FileText,
  Eye,
  Download,
  Share2,
  RefreshCw,
  Trash2,
  Sparkles,
  CircleCheck,
  CircleAlert,
  Check,
} from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { useAppDialog } from './AppDialog';
import { viewPdf, downloadPdf, sharePdf } from '../../services/documentService';

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

export const DocumentPreviewCard = ({
  file,
  title = 'Syllabus Document',
  unitCount = 0,
  topicCount = 0,
  isExtracting = false,
  extractionError = null,
  onReplace,
  onRemove,
  onExtract,
  accentColor,
  style,
}) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showError, showDeleteConfirm } = useAppDialog();
  const [viewing, setViewing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!file || !file.url) {
    return null;
  }

  const themeAccent = accentColor || colors.primary;
  const originalName = file.originalName || 'Syllabus';
  const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : '';
  const fileTypeLabel = ext === '.docx' ? 'Word Document' : ext === '.txt' ? 'Text Document' : 'PDF Document';
  const sizeText = formatSize(file.size);

  const handleView = async () => {
    if (viewing) return;
    setViewing(true);
    try {
      await viewPdf(file.url, originalName);
    } catch (error) {
      showError('Couldn’t open document', 'We couldn’t prepare this document right now. Please try again.');
    } finally {
      setViewing(false);
    }
  };

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadPdf(file.url, originalName);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      showError('Download Failed', 'Could not download the document. Please check your connection.');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      await sharePdf(file.url, originalName);
    } catch (error) {
      showError('Share Failed', 'Unable to share this document right now.');
    } finally {
      setSharing(false);
    }
  };

  const handleConfirmRemove = () => {
    showDeleteConfirm({
      title: 'Remove Syllabus Document?',
      message:
        'This will remove the attached syllabus document from this subject. You can upload a new syllabus at any time.',
      confirmText: 'Remove',
      onConfirm: onRemove,
    });
  };

  return (
    <View style={[styles.card, style]}>
      {/* File Info Header */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${themeAccent}18` }]}>
          <FileText size={24} color={themeAccent} />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.fileName} numberOfLines={1}>
            {originalName}
          </Text>
          <View style={styles.metaRow}>
            <Text style={styles.fileType}>{fileTypeLabel}</Text>
            {!!sizeText && <Text style={styles.metaDot}>•</Text>}
            {!!sizeText && <Text style={styles.fileSize}>{sizeText}</Text>}
          </View>
        </View>
      </View>

      {/* Extraction Status Section */}
      <View style={styles.statusSection}>
        {isExtracting ? (
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` },
            ]}
          >
            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: 8 }} />
            <Text style={[styles.statusText, { color: colors.primary }]}>
              Extracting syllabus units & topics...
            </Text>
          </View>
        ) : unitCount > 0 ? (
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: `${colors.accent}14`, borderColor: `${colors.accent}35` },
            ]}
          >
            <CircleCheck size={16} color={colors.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.statusText, { color: colors.accent }]}>
              {unitCount} Units • {topicCount} Topics extracted
            </Text>
          </View>
        ) : extractionError ? (
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: `${colors.destructive}12`, borderColor: `${colors.destructive}30` },
            ]}
          >
            <CircleAlert size={16} color={colors.destructive} style={{ marginRight: 8 }} />
            <Text style={[styles.statusText, { color: colors.destructive }]} numberOfLines={1}>
              {extractionError || 'Extraction failed.'}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.statusBanner,
              { backgroundColor: `${colors.muted}40`, borderColor: colors.cardBorder },
            ]}
          >
            <Sparkles size={16} color={colors.mutedForeground} style={{ marginRight: 8 }} />
            <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
              Syllabus uploaded • Ready to extract
            </Text>
          </View>
        )}
      </View>

      {/* Primary Action Buttons */}
      <View style={styles.actionsGrid}>
        <TouchableOpacity
          style={[styles.primaryActionBtn, { backgroundColor: themeAccent }]}
          onPress={handleView}
          disabled={viewing}
          activeOpacity={0.8}
        >
          {viewing ? (
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
          ) : (
            <Eye size={16} color="#ffffff" style={{ marginRight: 6 }} />
          )}
          <Text style={styles.primaryActionText}>{viewing ? 'Opening...' : ext === '.pdf' ? 'View PDF' : 'View Document'}</Text>
        </TouchableOpacity>

        {unitCount === 0 && onExtract && (
          <TouchableOpacity
            style={[styles.secondaryActionBtn, { borderColor: themeAccent }]}
            onPress={onExtract}
            disabled={isExtracting}
            activeOpacity={0.8}
          >
            <Sparkles size={16} color={themeAccent} style={{ marginRight: 6 }} />
            <Text style={[styles.secondaryActionText, { color: themeAccent }]}>
              {isExtracting ? 'Extracting...' : 'Extract Topics'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Auxiliary Actions Row (Download, Share, Replace, Remove) */}
      <View style={styles.auxRow}>
        <TouchableOpacity
          style={styles.auxBtn}
          onPress={handleDownload}
          disabled={downloading}
          activeOpacity={0.7}
        >
          {downloading ? (
            <ActivityIndicator size="small" color={colors.foreground} style={{ marginRight: 4 }} />
          ) : downloadSuccess ? (
            <Check size={14} color={colors.accent} style={{ marginRight: 4 }} />
          ) : (
            <Download size={14} color={colors.foreground} style={{ marginRight: 4 }} />
          )}
          <Text style={[styles.auxBtnText, downloadSuccess && { color: colors.accent }]}>
            {downloading ? 'Saving...' : downloadSuccess ? 'Saved' : 'Download'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.auxBtn}
          onPress={handleShare}
          disabled={sharing}
          activeOpacity={0.7}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={colors.foreground} style={{ marginRight: 4 }} />
          ) : (
            <Share2 size={14} color={colors.foreground} style={{ marginRight: 4 }} />
          )}
          <Text style={styles.auxBtnText}>{sharing ? 'Preparing...' : 'Share'}</Text>
        </TouchableOpacity>

        {onReplace && (
          <TouchableOpacity style={styles.auxBtn} onPress={onReplace} activeOpacity={0.7}>
            <RefreshCw size={14} color={colors.foreground} style={{ marginRight: 4 }} />
            <Text style={styles.auxBtnText}>Replace</Text>
          </TouchableOpacity>
        )}

        {onRemove && (
          <TouchableOpacity
            style={[styles.auxBtn, styles.auxBtnDestructive]}
            onPress={handleConfirmRemove}
            activeOpacity={0.7}
          >
            <Trash2 size={14} color={colors.destructive} style={{ marginRight: 4 }} />
            <Text style={[styles.auxBtnText, { color: colors.destructive }]}>Remove</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      marginVertical: spacing.xs,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconBox: {
      width: 46,
      height: 46,
      borderRadius: radii.lg,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    infoCol: {
      flex: 1,
      justifyContent: 'center',
    },
    fileName: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
      marginBottom: 2,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    fileType: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    metaDot: {
      marginHorizontal: 6,
      color: colors.mutedForeground,
      fontSize: 12,
    },
    fileSize: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    statusSection: {
      marginTop: spacing.sm,
      marginBottom: spacing.xs,
    },
    statusBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.md,
      borderWidth: 1,
    },
    statusText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      flex: 1,
    },
    actionsGrid: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    primaryActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
    },
    primaryActionText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: '#ffffff',
    },
    secondaryActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
      borderRadius: radii.lg,
      borderWidth: 1.5,
      paddingHorizontal: spacing.md,
      backgroundColor: 'transparent',
    },
    secondaryActionText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
    },
    auxRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      gap: 4,
    },
    auxBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: radii.sm,
    },
    auxBtnDestructive: {
      marginLeft: 'auto',
    },
    auxBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.foreground,
    },
  });
