import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Trash2, X, Check, BookOpen } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { useAppDialog } from '../ui/AppDialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { confirmSyllabus } from '../../api/syllabus';

export function SyllabusReviewModal({
  visible,
  subjectId,
  parsedUnits = [],
  onClose,
  onSuccess,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showError, showSuccess } = useAppDialog();

  const getSafeUnits = (data) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.units)) return data.units;
    return [];
  };

  const [units, setUnits] = useState(() => getSafeUnits(parsedUnits));
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setUnits(getSafeUnits(parsedUnits));
  }, [parsedUnits]);

  const handleUnitNameChange = (uIdx, val) => {
    const next = [...units];
    next[uIdx] = { ...next[uIdx], name: val };
    setUnits(next);
  };

  const handleTopicNameChange = (uIdx, tIdx, val) => {
    const next = [...units];
    const unitTopics = [...(next[uIdx]?.topics || [])];
    unitTopics[tIdx] = { ...unitTopics[tIdx], name: val };
    next[uIdx] = { ...next[uIdx], topics: unitTopics };
    setUnits(next);
  };

  const removeUnit = (uIdx) => {
    setUnits(units.filter((_, i) => i !== uIdx));
  };

  const removeTopic = (uIdx, tIdx) => {
    const next = [...units];
    const unitTopics = (next[uIdx]?.topics || []).filter((_, i) => i !== tIdx);
    next[uIdx] = { ...next[uIdx], topics: unitTopics };
    setUnits(next);
  };

  const handleConfirm = async () => {
    if (!Array.isArray(units) || units.length === 0) {
      showError('Empty Syllabus', 'Please keep at least one unit before saving.');
      return;
    }

    setSaving(true);
    try {
      await confirmSyllabus(subjectId, units);
      showSuccess('Syllabus Saved', 'Syllabus successfully confirmed and saved!');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      showError('Save Failed', err?.response?.data?.message || 'Failed to confirm syllabus.');
    } finally {
      setSaving(false);
    }
  };

  const safeUnits = Array.isArray(units) ? units : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetContainer}>

          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>Review Extracted Syllabus</Text>
              <Text style={styles.subtitle}>
                {(() => {
                  const theoryUnits = safeUnits.filter(u => !u?.isLab && !u?.name?.toLowerCase().includes('laboratory'));
                  const labUnits = safeUnits.filter(u => u?.isLab || u?.name?.toLowerCase().includes('laboratory'));
                  const labExpCount = labUnits.reduce((acc, u) => acc + (u?.topics?.length || 0), 0);
                  const totalTopics = safeUnits.reduce((acc, u) => acc + (u?.topics?.length || 0), 0);
                  if (theoryUnits.length > 0 && labUnits.length > 0) {
                    return `Extracted ${theoryUnits.length} theory units and ${labExpCount} lab experiments`;
                  }
                  if (theoryUnits.length === 0 && labUnits.length > 0) {
                    return `Extracted ${labExpCount} lab experiments`;
                  }
                  return `Extracted ${safeUnits.length} units and ${totalTopics} topics`;
                })()}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {safeUnits.length === 0 ? (
              <View style={styles.emptyBox}>
                <BookOpen size={24} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>No units extracted from PDF.</Text>
              </View>
            ) : (
              (() => {
                let theoryCounter = 0;
                return safeUnits.map((unit, uIdx) => {
                  const isLab = Boolean(unit?.isLab || unit?.name?.toLowerCase().includes('laboratory'));
                  if (!isLab) theoryCounter++;
                  const badgeText = isLab ? 'LAB' : `U${theoryCounter}`;
                  return (
                    <View key={uIdx} style={[styles.unitCard, isLab && { borderColor: colors.primary, borderWidth: 1.5 }]}>

                      <View style={styles.unitHeaderRow}>
                        <Text style={[styles.unitIndexBadge, isLab && { backgroundColor: colors.primary, color: colors.primaryForeground, paddingHorizontal: 6 }]}>
                          {badgeText}
                        </Text>
                        <Input
                          value={unit?.name || ''}
                          onChangeText={(val) => handleUnitNameChange(uIdx, val)}
                          placeholder={isLab ? 'Laboratory section title' : 'Unit title'}
                          style={styles.unitInput}
                        />
                      <TouchableOpacity
                        onPress={() => removeUnit(uIdx)}
                        style={styles.deleteBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Trash2 size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.topicsBox}>
                      {(unit.topics || []).map((topic, tIdx) => (
                        <View key={tIdx} style={styles.topicRow}>
                          <Text style={styles.topicIndexText}>{tIdx + 1}.</Text>
                          <Input
                            value={topic.name}
                            onChangeText={(val) => handleTopicNameChange(uIdx, tIdx, val)}
                            placeholder={isLab ? 'Experiment description' : 'Topic title'}
                            style={styles.topicInput}
                          />
                          <TouchableOpacity
                            onPress={() => removeTopic(uIdx, tIdx)}
                            style={styles.deleteTopicBtn}
                          >
                            <Trash2 size={14} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {(!unit.topics || unit.topics.length === 0) && (
                        <Text style={styles.noTopicsText}>
                          {isLab ? 'No experiments in this section' : 'No topics in this unit'}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              });
            })()
          )}
          </ScrollView>

          <View style={styles.footer}>
            <Button variant="quiet" onPress={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              onPress={handleConfirm}
              loading={saving}
              disabled={units.length === 0 || saving}
            >
              <Check size={16} color={colors.primaryForeground} style={{ marginRight: 6 }} />
              Confirm & Save
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(24,32,49,0.5)',
    },
    sheetContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '85%',
      borderTopWidth: 1,
      borderColor: colors.cardBorder,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.cardBorder,
    },
    title: {
      fontFamily: typography.serif.medium,
      fontSize: 18,
      color: colors.foreground,
    },
    subtitle: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    closeBtn: {
      padding: spacing.xs,
    },
    body: {
      padding: spacing.lg,
    },
    emptyBox: {
      alignItems: 'center',
      paddingVertical: spacing.xl,
      gap: spacing.sm,
    },
    emptyText: {
      fontFamily: typography.sans.regular,
      fontSize: 14,
      color: colors.mutedForeground,
    },
    unitCard: {
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
      marginBottom: spacing.md,
    },
    unitHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    unitIndexBadge: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      color: colors.accent,
      backgroundColor: colors.accent + '20',
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderRadius: radii.sm,
    },
    unitInput: {
      flex: 1,
      minHeight: 40,
    },
    deleteBtn: {
      padding: spacing.xs,
    },
    topicsBox: {
      paddingLeft: spacing.md,
      borderLeftWidth: 2,
      borderLeftColor: colors.cardBorder,
      marginTop: spacing.xs,
      gap: spacing.xs,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    topicIndexText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      width: 18,
    },
    topicInput: {
      flex: 1,
      minHeight: 36,
    },
    deleteTopicBtn: {
      padding: spacing.xs,
    },
    noTopicsText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      paddingVertical: 4,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.muted + '30',
    },
  });
