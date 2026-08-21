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

  const [units, setUnits] = useState(parsedUnits || []);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setUnits(parsedUnits || []);
  }, [parsedUnits]);

  const handleUnitNameChange = (uIdx, val) => {
    const next = [...units];
    next[uIdx] = { ...next[uIdx], name: val };
    setUnits(next);
  };

  const handleTopicNameChange = (uIdx, tIdx, val) => {
    const next = [...units];
    const unitTopics = [...(next[uIdx].topics || [])];
    unitTopics[tIdx] = { ...unitTopics[tIdx], name: val };
    next[uIdx] = { ...next[uIdx], topics: unitTopics };
    setUnits(next);
  };

  const removeUnit = (uIdx) => {
    setUnits(units.filter((_, i) => i !== uIdx));
  };

  const removeTopic = (uIdx, tIdx) => {
    const next = [...units];
    const unitTopics = (next[uIdx].topics || []).filter((_, i) => i !== tIdx);
    next[uIdx] = { ...next[uIdx], topics: unitTopics };
    setUnits(next);
  };

  const handleConfirm = async () => {
    if (units.length === 0) {
      Alert.alert('Empty Syllabus', 'Please keep at least one unit.');
      return;
    }

    setSaving(true);
    try {
      await confirmSyllabus(subjectId, units);
      Alert.alert('Success', 'Syllabus successfully confirmed and saved!');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      Alert.alert('Save Failed', err?.response?.data?.message || 'Failed to confirm syllabus.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Review Extracted Syllabus</Text>
              <Text style={styles.subtitle}>
                Verify or edit units & topics before saving
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            {units.length === 0 ? (
              <View style={styles.emptyBox}>
                <BookOpen size={24} color={colors.mutedForeground} />
                <Text style={styles.emptyText}>No units extracted from PDF.</Text>
              </View>
            ) : (
              units.map((unit, uIdx) => (
                <View key={uIdx} style={styles.unitCard}>
                  {/* Unit Name Row */}
                  <View style={styles.unitHeaderRow}>
                    <Text style={styles.unitIndexBadge}>U{uIdx + 1}</Text>
                    <Input
                      value={unit.name}
                      onChangeText={(val) => handleUnitNameChange(uIdx, val)}
                      placeholder="Unit title"
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

                  {/* Topics List */}
                  <View style={styles.topicsBox}>
                    {(unit.topics || []).map((topic, tIdx) => (
                      <View key={tIdx} style={styles.topicRow}>
                        <Text style={styles.topicIndexText}>{tIdx + 1}.</Text>
                        <Input
                          value={topic.name}
                          onChangeText={(val) => handleTopicNameChange(uIdx, tIdx, val)}
                          placeholder="Topic title"
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
                      <Text style={styles.noTopicsText}>No topics in this unit</Text>
                    )}
                  </View>
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer */}
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
