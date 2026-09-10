import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Trash2,
  X,
  Check,
  Plus,
  CircleCheck,
  Circle,
  ChevronUp,
  ChevronDown,
  Layers,
} from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { useAppDialog } from '../ui/AppDialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { updateSyllabus } from '../../api/syllabus';

export function SyllabusEditorModal({
  visible,
  subject,
  subjectId,
  units = [],
  topics = [],
  onClose,
  onSuccess,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const { showError, showSuccess, showDeleteConfirm } = useAppDialog();

  const [editableUnits, setEditableUnits] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;

    // Map existing units and their associated topics
    const preparedUnits = (units || []).map((u, uIdx) => {
      const uId = u._id || u.id;
      const unitTopics = (topics || [])
        .filter((t) => (t.unit?._id || t.unit) === uId || t.unit === u.title)
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map((t, tIdx) => ({
          _id: t._id || t.id,
          title: t.title || t.name || '',
          completed: Boolean(t.completed || t.status === 'completed'),
          status: t.status || (t.completed ? 'completed' : 'not-started'),
          order: t.order ?? tIdx + 1,
          importance: t.importance || 'medium',
        }));

      return {
        _id: uId,
        title: u.title || u.name || `Unit ${uIdx + 1}`,
        isLab: Boolean(u.isLab || u.title?.toLowerCase().includes('laboratory')),
        order: u.order ?? uIdx + 1,
        topics: unitTopics,
      };
    });

    // If subject had no units yet, provide one default unit with one blank topic
    if (preparedUnits.length === 0) {
      preparedUnits.push({
        _id: null,
        title: 'Unit 1',
        isLab: false,
        order: 1,
        topics: [{ _id: null, title: '', completed: false, status: 'not-started', order: 1 }],
      });
    }

    setEditableUnits(preparedUnits);
  }, [visible, units, topics]);

  const handleUnitTitleChange = (uIdx, title) => {
    setEditableUnits((prev) => {
      const next = [...prev];
      next[uIdx] = { ...next[uIdx], title };
      return next;
    });
  };

  const handleTopicTitleChange = (uIdx, tIdx, title) => {
    setEditableUnits((prev) => {
      const next = [...prev];
      const unitTopics = [...(next[uIdx]?.topics || [])];
      unitTopics[tIdx] = { ...unitTopics[tIdx], title };
      next[uIdx] = { ...next[uIdx], topics: unitTopics };
      return next;
    });
  };

  const moveUnit = (uIdx, direction) => {
    const targetIdx = direction === 'up' ? uIdx - 1 : uIdx + 1;
    if (targetIdx < 0 || targetIdx >= editableUnits.length) return;

    setEditableUnits((prev) => {
      const next = [...prev];
      const temp = next[uIdx];
      next[uIdx] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const moveTopic = (uIdx, tIdx, direction) => {
    const unitTopics = editableUnits[uIdx]?.topics || [];
    const targetIdx = direction === 'up' ? tIdx - 1 : tIdx + 1;
    if (targetIdx < 0 || targetIdx >= unitTopics.length) return;

    setEditableUnits((prev) => {
      const next = [...prev];
      const nextTopics = [...next[uIdx].topics];
      const temp = nextTopics[tIdx];
      nextTopics[tIdx] = nextTopics[targetIdx];
      nextTopics[targetIdx] = temp;
      next[uIdx] = { ...next[uIdx], topics: nextTopics };
      return next;
    });
  };

  const addTopic = (uIdx) => {
    setEditableUnits((prev) => {
      const next = [...prev];
      const unitTopics = [...(next[uIdx]?.topics || [])];
      unitTopics.push({
        _id: null,
        title: '',
        completed: false,
        status: 'not-started',
        order: unitTopics.length + 1,
      });
      next[uIdx] = { ...next[uIdx], topics: unitTopics };
      return next;
    });
  };

  const removeTopic = (uIdx, tIdx) => {
    setEditableUnits((prev) => {
      const next = [...prev];
      const nextTopics = (next[uIdx]?.topics || []).filter((_, i) => i !== tIdx);
      next[uIdx] = { ...next[uIdx], topics: nextTopics };
      return next;
    });
  };

  const addUnit = () => {
    setEditableUnits((prev) => {
      const next = [...prev];
      const newUnitIndex = next.length + 1;
      next.push({
        _id: null,
        title: `Unit ${newUnitIndex}`,
        isLab: false,
        order: newUnitIndex,
        topics: [
          {
            _id: null,
            title: '',
            completed: false,
            status: 'not-started',
            order: 1,
          },
        ],
      });
      return next;
    });
  };

  const removeUnit = (uIdx) => {
    const unitToRemove = editableUnits[uIdx];
    showDeleteConfirm({
      title: 'Remove Unit?',
      message: `Are you sure you want to remove "${unitToRemove.title || `Unit ${uIdx + 1}`}" and its topics?`,
      confirmText: 'Remove Unit',
      onConfirm: () => {
        setEditableUnits((prev) => prev.filter((_, i) => i !== uIdx));
      },
    });
  };

  const handleSave = async () => {
    if (editableUnits.length === 0) {
      showError('Empty Syllabus', 'Please keep at least one unit before saving.');
      return;
    }

    // Clean payload for backend
    const sanitizedUnits = editableUnits.map((u, uIdx) => ({
      _id: u._id || undefined,
      title: (u.title || `Unit ${uIdx + 1}`).trim(),
      order: uIdx + 1,
      isLab: Boolean(u.isLab),
      topics: (u.topics || [])
        .filter((t) => t.title && t.title.trim().length > 0)
        .map((t, tIdx) => ({
          _id: t._id || undefined,
          title: t.title.trim(),
          completed: t.completed,
          status: t.status,
          order: tIdx + 1,
        })),
    }));

    const totalTopics = sanitizedUnits.reduce((acc, u) => acc + u.topics.length, 0);
    if (totalTopics === 0) {
      showError('Topics Required', 'Please ensure at least one topic has a non-empty name.');
      return;
    }

    setSaving(true);
    try {
      const targetSubId = subjectId || subject?._id || subject?.id;
      await updateSyllabus(targetSubId, sanitizedUnits);
      showSuccess('Syllabus Updated', 'Your changes have been saved successfully.');
      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error('[SyllabusEditor] Save error:', err);
      showError('Save Failed', err?.response?.data?.message || 'Could not save syllabus changes.');
    } finally {
      setSaving(false);
    }
  };

  const subjectName = subject?.name || 'Curriculum';
  const subjectCode = subject?.code || '';

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
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.eyebrow}>CURRICULUM EDITOR</Text>
              <Text style={styles.title} numberOfLines={1}>
                {subjectName}
              </Text>
              {Boolean(subjectCode) && (
                <Text style={styles.subtitle}>{subjectCode} • Edit Units & Topics</Text>
              )}
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            keyboardShouldPersistTaps="handled"
          >
            {editableUnits.map((unit, uIdx) => {
              const isLab = Boolean(unit.isLab);
              const badgeText = isLab ? 'LAB' : `UNIT ${uIdx + 1}`;

              return (
                <View key={unit._id || `unit_${uIdx}`} style={styles.unitCard}>
                  {/* Unit Title & Order Controls */}
                  <View style={styles.unitHeaderRow}>
                    <View style={[styles.unitBadge, isLab && styles.unitBadgeLab]}>
                      <Text style={[styles.unitBadgeText, isLab && styles.unitBadgeTextLab]}>
                        {badgeText}
                      </Text>
                    </View>

                    <Input
                      value={unit.title}
                      onChangeText={(val) => handleUnitTitleChange(uIdx, val)}
                      placeholder={isLab ? 'Laboratory Module Title' : 'Unit Title'}
                      style={styles.unitInput}
                    />

                    <View style={styles.unitControls}>
                      {uIdx > 0 && (
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => moveUnit(uIdx, 'up')}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <ChevronUp size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      )}
                      {uIdx < editableUnits.length - 1 && (
                        <TouchableOpacity
                          style={styles.iconBtn}
                          onPress={() => moveUnit(uIdx, 'down')}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <ChevronDown size={16} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.iconBtn}
                        onPress={() => removeUnit(uIdx)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Trash2 size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Topics List */}
                  <View style={styles.topicsBox}>
                    {(unit.topics || []).map((topic, tIdx) => {
                      const isCompleted = topic.completed || topic.status === 'completed';

                      return (
                        <View key={topic._id || `topic_${uIdx}_${tIdx}`} style={styles.topicRow}>
                          {/* Informational Completion Indicator */}
                          <View
                            style={[
                              styles.completionIndicator,
                              isCompleted
                                ? styles.completionIndicatorDone
                                : styles.completionIndicatorPending,
                            ]}
                          >
                            {isCompleted ? (
                              <CircleCheck size={14} color={colors.accent} />
                            ) : (
                              <Circle size={14} color={colors.mutedForeground} />
                            )}
                            <Text
                              style={[
                                styles.completionText,
                                isCompleted
                                  ? styles.completionTextDone
                                  : styles.completionTextPending,
                              ]}
                            >
                              {isCompleted ? 'Done' : `${tIdx + 1}`}
                            </Text>
                          </View>

                          {/* Editable Topic Title */}
                          <Input
                            value={topic.title}
                            onChangeText={(val) => handleTopicTitleChange(uIdx, tIdx, val)}
                            placeholder="Enter topic name..."
                            style={styles.topicInput}
                          />

                          {/* Topic Actions */}
                          <View style={styles.topicControls}>
                            {tIdx > 0 && (
                              <TouchableOpacity
                                style={styles.iconBtnSm}
                                onPress={() => moveTopic(uIdx, tIdx, 'up')}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                              >
                                <ChevronUp size={14} color={colors.mutedForeground} />
                              </TouchableOpacity>
                            )}
                            {tIdx < (unit.topics || []).length - 1 && (
                              <TouchableOpacity
                                style={styles.iconBtnSm}
                                onPress={() => moveTopic(uIdx, tIdx, 'down')}
                                hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                              >
                                <ChevronDown size={14} color={colors.mutedForeground} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              style={styles.iconBtnSm}
                              onPress={() => removeTopic(uIdx, tIdx)}
                              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                            >
                              <Trash2 size={14} color={colors.destructive} />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}

                    {/* Add Topic Action */}
                    <TouchableOpacity
                      style={styles.addTopicBtn}
                      onPress={() => addTopic(uIdx)}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={colors.primary} style={{ marginRight: 6 }} />
                      <Text style={styles.addTopicText}>Add topic</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}

            {/* Add Unit Button */}
            <TouchableOpacity
              style={styles.addUnitCard}
              onPress={addUnit}
              activeOpacity={0.7}
            >
              <Plus size={18} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.addUnitText}>Add another unit</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Accessible Footer */}
          <View style={styles.footer}>
            <Button variant="ghost" onPress={onClose} disabled={saving} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              onPress={handleSave}
              loading={saving}
              disabled={saving}
              style={{ flex: 1.6 }}
            >
              <Check size={18} color={colors.primaryForeground} />
              Save Changes
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
      backgroundColor: 'rgba(24,32,49,0.6)',
    },
    sheetContainer: {
      backgroundColor: colors.card,
      borderTopLeftRadius: radii.xxl,
      borderTopRightRadius: radii.xxl,
      maxHeight: '90%',
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
    eyebrow: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      color: colors.accent,
      marginBottom: 2,
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
      maxHeight: 520,
    },
    bodyContent: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    unitCard: {
      backgroundColor: colors.background,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: spacing.md,
    },
    unitHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginBottom: spacing.sm,
    },
    unitBadge: {
      backgroundColor: `${colors.accent}1A`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: radii.sm,
      justifyContent: 'center',
      alignItems: 'center',
    },
    unitBadgeLab: {
      backgroundColor: `${colors.primary}1A`,
    },
    unitBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      color: colors.accent,
      letterSpacing: 0.5,
    },
    unitBadgeTextLab: {
      color: colors.primary,
    },
    unitInput: {
      flex: 1,
      minHeight: 42,
    },
    unitControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconBtn: {
      padding: 6,
      borderRadius: radii.sm,
    },
    topicsBox: {
      paddingLeft: spacing.sm,
      borderLeftWidth: 2,
      borderLeftColor: colors.cardBorder,
      marginTop: spacing.xs,
      gap: spacing.sm,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    completionIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: radii.sm,
      minWidth: 46,
      justifyContent: 'center',
    },
    completionIndicatorDone: {
      backgroundColor: `${colors.accent}14`,
    },
    completionIndicatorPending: {
      backgroundColor: `${colors.muted}40`,
    },
    completionText: {
      fontFamily: typography.mono.medium,
      fontSize: 10,
    },
    completionTextDone: {
      color: colors.accent,
    },
    completionTextPending: {
      color: colors.mutedForeground,
    },
    topicInput: {
      flex: 1,
      minHeight: 38,
    },
    topicControls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    iconBtnSm: {
      padding: 4,
      borderRadius: radii.sm,
    },
    addTopicBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radii.md,
      backgroundColor: `${colors.primary}10`,
      marginTop: spacing.xs,
    },
    addTopicText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.primary,
    },
    addUnitCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      paddingVertical: spacing.md,
    },
    addUnitText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.primary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.cardBorder,
      backgroundColor: colors.card,
    },
  });
