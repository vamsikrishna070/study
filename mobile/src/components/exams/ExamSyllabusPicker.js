import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Folder,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  X,
  Plus,
  Layers,
} from 'lucide-react-native';
import { getUnits, getTopics } from '../../api/syllabus';
import { useAppTheme, useStyles } from '../../theme/theme';

export function ExamSyllabusPicker({
  visible = true,
  onClose,
  onSave,
  selectedTopicIds = [],
  onChangeSelectedTopics,
  subjects = [],
  primarySubjectId,
  isModal = true,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [localSelectedIds, setLocalSelectedIds] = useState(selectedTopicIds);
  const [subjectData, setSubjectData] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Sync initial selection when modal opens or selectedTopicIds changes
  useEffect(() => {
    if (visible) {
      setLocalSelectedIds(selectedTopicIds || []);
      setSearchQuery('');
    }
  }, [visible, selectedTopicIds]);

  // Load units & topics for available subjects
  useEffect(() => {
    if (!subjects || subjects.length === 0) return;

    subjects.forEach((sub) => {
      const sId = sub._id || sub.id;
      if (sId && !subjectData[sId] && !loadingMap[sId]) {
        setLoadingMap((prev) => ({ ...prev, [sId]: true }));
        Promise.all([
          getUnits(sId).catch(() => []),
          getTopics(sId).catch(() => []),
        ])
          .then(([unitsRes, topicsRes]) => {
            const rawUnits = unitsRes?.data || unitsRes || [];
            const rawTopics = topicsRes?.data || topicsRes || [];
            setSubjectData((prev) => ({
              ...prev,
              [sId]: {
                units: Array.isArray(rawUnits) ? rawUnits : [],
                topics: Array.isArray(rawTopics) ? rawTopics : [],
              },
            }));
            if (subjects.length === 1 || sId === primarySubjectId) {
              setExpandedSubjects((prev) => ({ ...prev, [sId]: true }));
            }
          })
          .finally(() => {
            setLoadingMap((prev) => ({ ...prev, [sId]: false }));
          });
      }
    });
  }, [subjects, primarySubjectId]);

  // Expand primary subject on open
  useEffect(() => {
    if (primarySubjectId) {
      setExpandedSubjects((prev) => ({ ...prev, [primarySubjectId]: true }));
      setActiveSubjectFilter(primarySubjectId);
    } else {
      setActiveSubjectFilter('all');
    }
  }, [primarySubjectId, visible]);

  const selectedSet = useMemo(() => new Set(localSelectedIds), [localSelectedIds]);

  const allLoadedTopics = useMemo(() => {
    return Object.values(subjectData).flatMap((d) => d.topics || []);
  }, [subjectData]);

  const { totalSelected, completedSelected, pendingSelected } = useMemo(() => {
    let comp = 0;
    let pend = 0;
    selectedSet.forEach((tid) => {
      const t = allLoadedTopics.find((top) => (top._id || top.id) === tid);
      if (t) {
        if (t.completed || t.status === 'completed') {
          comp += 1;
        } else {
          pend += 1;
        }
      }
    });
    return {
      totalSelected: selectedSet.size,
      completedSelected: comp,
      pendingSelected: pend,
    };
  }, [selectedSet, allLoadedTopics]);

  const toggleTopic = (topicId) => {
    setLocalSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return Array.from(next);
    });
  };

  const toggleUnit = (unitId, unitTopics) => {
    setLocalSelectedIds((prev) => {
      const next = new Set(prev);
      const unitTopicIds = unitTopics.map((t) => t._id || t.id);
      const allUnitSelected = unitTopicIds.length > 0 && unitTopicIds.every((id) => next.has(id));

      if (allUnitSelected) {
        unitTopicIds.forEach((id) => next.delete(id));
      } else {
        unitTopicIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const toggleSubject = (subjectId, subjectTopics) => {
    setLocalSelectedIds((prev) => {
      const next = new Set(prev);
      const subTopicIds = subjectTopics.map((t) => t._id || t.id);
      const allSubSelected = subTopicIds.length > 0 && subTopicIds.every((id) => next.has(id));

      if (allSubSelected) {
        subTopicIds.forEach((id) => next.delete(id));
      } else {
        subTopicIds.forEach((id) => next.add(id));
      }
      return Array.from(next);
    });
  };

  const handleSelectAll = (topicsToSelect) => {
    setLocalSelectedIds((prev) => {
      const next = new Set(prev);
      topicsToSelect.forEach((t) => next.add(t._id || t.id));
      return Array.from(next);
    });
  };

  const handleClearAll = () => {
    setLocalSelectedIds([]);
  };

  const buildSyllabusStructure = (topicIds) => {
    const selectedDocs = allLoadedTopics.filter((t) => topicIds.includes(t._id || t.id));
    return selectedDocs.map((t) => ({
      subjectId: t.subject?._id || t.subject?.id || t.subject,
      unitId: t.unit?._id || t.unit?.id || t.unit || null,
      topicId: t._id || t.id,
    }));
  };

  const handleSaveAndClose = () => {
    const structure = buildSyllabusStructure(localSelectedIds);
    const primarySub =
      structure.length > 0
        ? structure[0].subjectId
        : primarySubjectId || (subjects[0]?._id || subjects[0]?.id);

    if (onSave) {
      onSave(localSelectedIds, structure, primarySub);
    }
    if (onChangeSelectedTopics) {
      onChangeSelectedTopics(localSelectedIds, structure, primarySub);
    }
    if (onClose) {
      onClose();
    }
  };

  const handleCancelAndClose = () => {
    setLocalSelectedIds(selectedTopicIds || []);
    if (onClose) {
      onClose();
    }
  };

  const filteredSubjects = useMemo(() => {
    if (activeSubjectFilter === 'all') return subjects;
    return subjects.filter((s) => (s._id || s.id) === activeSubjectFilter);
  }, [subjects, activeSubjectFilter]);

  const cleanQuery = searchQuery.trim().toLowerCase();

  const isAnyLoading = useMemo(() => {
    return Object.values(loadingMap).some(Boolean);
  }, [loadingMap]);

  const content = (
    <View style={styles.modalWrapper}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerTitleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.headerIconBox}>
              <BookOpen size={18} color={colors.accent} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Select Exam Syllabus</Text>
              <Text style={styles.headerSubtitle}>
                Choose topics included in this exam
              </Text>
            </View>
          </View>
          {onClose && (
            <TouchableOpacity
              onPress={handleCancelAndClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View style={styles.searchBarContainer}>
          <Search size={15} color={colors.mutedForeground} style={{ marginLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search syllabus topics..."
            placeholderTextColor={colors.mutedForeground}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {!!searchQuery && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={{ padding: 6, marginRight: 6 }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <X size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* Subject Filter Tabs */}
        {subjects.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterTabsScroll}
            style={styles.filterTabsWrapper}
          >
            <TouchableOpacity
              style={[styles.filterChip, activeSubjectFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveSubjectFilter('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterChipText, activeSubjectFilter === 'all' && styles.filterChipTextActive]}>
                All Subjects ({subjects.length})
              </Text>
            </TouchableOpacity>
            {subjects.map((sub) => {
              const sId = sub._id || sub.id;
              const isActive = activeSubjectFilter === sId;
              return (
                <TouchableOpacity
                  key={sId}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setActiveSubjectFilter(sId)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]} numberOfLines={1}>
                    {sub.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Selection Stats Strip */}
        <View style={styles.statsStrip}>
          <View style={styles.statsStripLeft}>
            <Sparkles size={13} color={colors.accent} />
            <Text style={styles.statsStripText}>
              <Text style={styles.statsStripBold}>{totalSelected}</Text> topics selected
            </Text>
            {totalSelected > 0 && (
              <View style={styles.statsMiniBadges}>
                <View style={styles.miniBadgeCompleted}>
                  <Check size={9} color="#10B981" />
                  <Text style={styles.miniBadgeCompletedText}>{completedSelected} done</Text>
                </View>
                <View style={styles.miniBadgePending}>
                  <Clock size={9} color="#F59E0B" />
                  <Text style={styles.miniBadgePendingText}>{pendingSelected} pending</Text>
                </View>
              </View>
            )}
          </View>
          {totalSelected > 0 && (
            <TouchableOpacity
              onPress={handleClearAll}
              style={styles.clearAllBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.clearAllText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Syllabus Tree Content */}
      <ScrollView
        style={styles.treeScroll}
        contentContainerStyle={styles.treeScrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        {filteredSubjects.length === 0 ? (
          <View style={styles.emptyState}>
            <Layers size={36} color={colors.mutedForeground} style={{ opacity: 0.5, marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Subjects Found</Text>
            <Text style={styles.emptySubtitle}>
              Please add a subject first to select syllabus topics.
            </Text>
          </View>
        ) : (
          filteredSubjects.map((sub) => {
            const sId = sub._id || sub.id;
            const sData = subjectData[sId] || { units: [], topics: [] };
            const units = sData.units || [];
            let topics = sData.topics || [];
            const isExpanded = expandedSubjects[sId] !== false;
            const isLoading = Boolean(loadingMap[sId]);

            // Filter topics by search query if present
            if (cleanQuery) {
              topics = topics.filter((t) =>
                (t.title || '').toLowerCase().includes(cleanQuery)
              );
            }

            const subTopicIds = topics.map((t) => t._id || t.id);
            const allSubSelected = subTopicIds.length > 0 && subTopicIds.every((id) => selectedSet.has(id));
            const someSubSelected = subTopicIds.some((id) => selectedSet.has(id)) && !allSubSelected;
            const selectedSubCount = subTopicIds.filter((id) => selectedSet.has(id)).length;

            return (
              <View key={sId} style={styles.subjectCard}>
                {/* Subject Header Card */}
                <View style={styles.subjectHeader}>
                  <TouchableOpacity
                    style={styles.expandIconBtn}
                    onPress={() => setExpandedSubjects((prev) => ({ ...prev, [sId]: !isExpanded }))}
                    activeOpacity={0.7}
                  >
                    {isExpanded ? (
                      <ChevronUp size={16} color={colors.mutedForeground} />
                    ) : (
                      <ChevronDown size={16} color={colors.mutedForeground} />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subjectCheckboxRow}
                    onPress={() => toggleSubject(sId, topics)}
                    activeOpacity={0.7}
                    disabled={topics.length === 0}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        allSubSelected && styles.checkboxChecked,
                        someSubSelected && styles.checkboxIndeterminate,
                      ]}
                    >
                      {allSubSelected && <Check size={12} color="#FFFFFF" />}
                      {someSubSelected && <View style={styles.indeterminateDash} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <BookOpen size={14} color={colors.accent} style={{ marginRight: 6 }} />
                        <Text style={styles.subjectTitle} numberOfLines={1}>
                          {sub.name}
                        </Text>
                      </View>
                      <Text style={styles.subjectSubtitle}>
                        {sub.code ? `${sub.code} · ` : ''}
                        {topics.length} topic{topics.length === 1 ? '' : 's'}
                        {selectedSubCount > 0 ? ` (${selectedSubCount} selected)` : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {topics.length > 0 && (
                    <TouchableOpacity
                      style={styles.selectToggleBtn}
                      onPress={() => toggleSubject(sId, topics)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.selectToggleBtnText}>
                        {allSubSelected ? 'Clear' : 'Select All'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Subject Units and Topics Body */}
                {isExpanded && (
                  <View style={styles.subjectBody}>
                    {isLoading ? (
                      <View style={styles.loadingBox}>
                        <ActivityIndicator size="small" color={colors.accent} />
                        <Text style={styles.loadingText}>Loading syllabus topics…</Text>
                      </View>
                    ) : topics.length === 0 ? (
                      <View style={styles.emptySubjectBody}>
                        <Text style={styles.emptyUnitText}>
                          {cleanQuery
                            ? `No topics matching "${searchQuery}"`
                            : 'No syllabus topics available for this subject.'}
                        </Text>
                      </View>
                    ) : units.length > 0 ? (
                      units.map((unit, uIdx) => {
                        const uId = unit._id || unit.id || `unit_${uIdx}`;
                        const unitKey = `${sId}_${uId}`;
                        const isUnitExpanded = expandedUnits[unitKey] !== false;
                        const unitTopics = topics.filter((t) => {
                          const tUnit = t.unit?._id || t.unit?.id || t.unit;
                          return tUnit && tUnit.toString() === uId.toString();
                        });

                        // If search is active and this unit has no matching topics, hide unit
                        if (cleanQuery && unitTopics.length === 0) return null;

                        const unitTopicIds = unitTopics.map((t) => t._id || t.id);
                        const allUnitSelected = unitTopicIds.length > 0 && unitTopicIds.every((id) => selectedSet.has(id));
                        const someUnitSelected = unitTopicIds.some((id) => selectedSet.has(id)) && !allUnitSelected;
                        const selUnitCount = unitTopicIds.filter((id) => selectedSet.has(id)).length;

                        return (
                          <View key={uId} style={styles.unitCard}>
                            {/* Unit Header */}
                            <View style={styles.unitHeader}>
                              <TouchableOpacity
                                style={styles.unitExpandBtn}
                                onPress={() =>
                                  setExpandedUnits((prev) => ({
                                    ...prev,
                                    [unitKey]: !isUnitExpanded,
                                  }))
                                }
                                activeOpacity={0.7}
                              >
                                {isUnitExpanded ? (
                                  <ChevronUp size={14} color={colors.mutedForeground} />
                                ) : (
                                  <ChevronDown size={14} color={colors.mutedForeground} />
                                )}
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.unitCheckboxRow}
                                onPress={() => toggleUnit(uId, unitTopics)}
                                activeOpacity={0.7}
                                disabled={unitTopics.length === 0}
                              >
                                <View
                                  style={[
                                    styles.checkboxSmall,
                                    allUnitSelected && styles.checkboxChecked,
                                    someUnitSelected && styles.checkboxIndeterminate,
                                  ]}
                                >
                                  {allUnitSelected && <Check size={9} color="#FFFFFF" />}
                                  {someUnitSelected && <View style={styles.indeterminateDashSmall} />}
                                </View>
                                <Folder size={13} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                                <Text style={styles.unitTitle} numberOfLines={1}>
                                  {unit.title || `Unit ${uIdx + 1}`}
                                </Text>
                                <Text style={styles.unitCountBadge}>
                                  ({selUnitCount}/{unitTopics.length})
                                </Text>
                              </TouchableOpacity>

                              {unitTopics.length > 0 && (
                                <TouchableOpacity
                                  onPress={() => toggleUnit(uId, unitTopics)}
                                  activeOpacity={0.7}
                                  style={styles.unitToggleBtn}
                                >
                                  <Text style={styles.unitToggleText}>
                                    {allUnitSelected ? 'Clear' : 'All'}
                                  </Text>
                                </TouchableOpacity>
                              )}
                            </View>

                            {/* Unit Topics */}
                            {isUnitExpanded && (
                              <View style={styles.unitTopicList}>
                                {unitTopics.length === 0 ? (
                                  <Text style={styles.emptyTopicText}>No topics in this unit.</Text>
                                ) : (
                                  unitTopics.map((topic) => {
                                    const tId = topic._id || topic.id;
                                    const isSelected = selectedSet.has(tId);
                                    const isCompleted = topic.completed || topic.status === 'completed';

                                    return (
                                      <TouchableOpacity
                                        key={tId}
                                        style={[
                                          styles.topicRow,
                                          isSelected && styles.topicRowSelected,
                                        ]}
                                        onPress={() => toggleTopic(tId)}
                                        activeOpacity={0.7}
                                      >
                                        <View
                                          style={[
                                            styles.checkboxSmall,
                                            isSelected && styles.checkboxChecked,
                                          ]}
                                        >
                                          {isSelected && <Check size={9} color="#FFFFFF" />}
                                        </View>

                                        <Text
                                          style={[
                                            styles.topicTitle,
                                            isSelected && styles.topicTitleSelected,
                                          ]}
                                          numberOfLines={2}
                                        >
                                          {topic.title}
                                        </Text>

                                        {isCompleted ? (
                                          <View style={styles.completedBadge}>
                                            <CheckCircle2 size={10} color="#10B981" />
                                            <Text style={styles.completedBadgeText}>Completed</Text>
                                          </View>
                                        ) : (
                                          <View style={styles.pendingBadge}>
                                            <Text style={styles.pendingBadgeText}>Pending</Text>
                                          </View>
                                        )}
                                      </TouchableOpacity>
                                    );
                                  })
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })
                    ) : (
                      /* Flat Topics List if no units defined */
                      <View style={styles.unitTopicList}>
                        {topics.map((topic) => {
                          const tId = topic._id || topic.id;
                          const isSelected = selectedSet.has(tId);
                          const isCompleted = topic.completed || topic.status === 'completed';

                          return (
                            <TouchableOpacity
                              key={tId}
                              style={[
                                styles.topicRow,
                                isSelected && styles.topicRowSelected,
                              ]}
                              onPress={() => toggleTopic(tId)}
                              activeOpacity={0.7}
                            >
                              <View
                                style={[
                                  styles.checkboxSmall,
                                  isSelected && styles.checkboxChecked,
                                ]}
                              >
                                {isSelected && <Check size={9} color="#FFFFFF" />}
                              </View>

                              <Text
                                style={[
                                  styles.topicTitle,
                                  isSelected && styles.topicTitleSelected,
                                ]}
                                numberOfLines={2}
                              >
                                {topic.title}
                              </Text>

                              {isCompleted ? (
                                <View style={styles.completedBadge}>
                                  <CheckCircle2 size={10} color="#10B981" />
                                  <Text style={styles.completedBadgeText}>Completed</Text>
                                </View>
                              ) : (
                                <View style={styles.pendingBadge}>
                                  <Text style={styles.pendingBadgeText}>Pending</Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancelAndClose}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.saveButton, totalSelected === 0 && styles.saveButtonEmpty]}
          onPress={handleSaveAndClose}
          activeOpacity={0.8}
        >
          <Check size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.saveButtonText}>
            Save Syllabus {totalSelected > 0 ? `(${totalSelected})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isModal) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={handleCancelAndClose}
      >
        {content}
      </Modal>
    );
  }

  return content;
}

const createStyles = (theme) =>
  StyleSheet.create({
    modalWrapper: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.cardBorder,
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerIconBox: {
      width: 34,
      height: 34,
      borderRadius: theme.radii.md,
      backgroundColor: `${theme.colors.accent}15`,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: `${theme.colors.accent}30`,
    },
    headerTitle: {
      fontFamily: theme.typography.sans.bold,
      fontSize: 16,
      color: theme.colors.foreground,
    },
    headerSubtitle: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.mutedForeground,
      marginTop: 1,
    },
    closeBtn: {
      padding: 6,
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors.background,
    },
    searchBarContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      height: 38,
    },
    searchInput: {
      flex: 1,
      fontFamily: theme.typography.sans.regular,
      fontSize: 13,
      color: theme.colors.foreground,
      paddingHorizontal: 8,
      height: '100%',
    },
    filterTabsWrapper: {
      maxHeight: 34,
    },
    filterTabsScroll: {
      flexDirection: 'row',
      gap: 6,
      paddingVertical: 1,
    },
    filterChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radii.full,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    filterChipActive: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    filterChipText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 11,
      color: theme.colors.mutedForeground,
    },
    filterChipTextActive: {
      color: theme.colors.primaryForeground,
      fontFamily: theme.typography.sans.semiBold,
    },
    statsStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.colors.background,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    statsStripLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flex: 1,
    },
    statsStripText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 12,
      color: theme.colors.foreground,
    },
    statsStripBold: {
      fontFamily: theme.typography.sans.bold,
      color: theme.colors.accent,
    },
    statsMiniBadges: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 4,
    },
    miniBadgeCompleted: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    miniBadgeCompletedText: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 9,
      color: '#10B981',
      fontWeight: '700',
    },
    miniBadgePending: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(245, 158, 11, 0.12)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    miniBadgePendingText: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 9,
      color: '#F59E0B',
      fontWeight: '700',
    },
    clearAllBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radii.sm,
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },
    clearAllText: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 11,
      color: '#EF4444',
    },
    treeScroll: {
      flex: 1,
    },
    treeScrollContent: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
      paddingHorizontal: theme.spacing.lg,
    },
    emptyTitle: {
      fontFamily: theme.typography.sans.bold,
      fontSize: 15,
      color: theme.colors.foreground,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
    },
    subjectCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      overflow: 'hidden',
    },
    subjectHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 12,
      backgroundColor: theme.colors.card,
      gap: 8,
    },
    expandIconBtn: {
      padding: 4,
    },
    subjectCheckboxRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1.5,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSmall: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1.2,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    checkboxChecked: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    checkboxIndeterminate: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    indeterminateDash: {
      width: 9,
      height: 2,
      backgroundColor: '#FFFFFF',
      borderRadius: 1,
    },
    indeterminateDashSmall: {
      width: 7,
      height: 1.5,
      backgroundColor: '#FFFFFF',
      borderRadius: 1,
    },
    subjectTitle: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 14,
      color: theme.colors.foreground,
    },
    subjectSubtitle: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 11,
      color: theme.colors.mutedForeground,
      marginTop: 2,
    },
    selectToggleBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radii.sm,
      backgroundColor: `${theme.colors.accent}15`,
      borderWidth: 1,
      borderColor: `${theme.colors.accent}30`,
    },
    selectToggleBtnText: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 11,
      color: theme.colors.accent,
    },
    subjectBody: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.cardBorder,
      gap: theme.spacing.sm,
    },
    emptySubjectBody: {
      padding: 16,
      alignItems: 'center',
    },
    loadingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      gap: 8,
    },
    loadingText: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.mutedForeground,
    },
    emptyUnitText: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.mutedForeground,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    unitCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      overflow: 'hidden',
    },
    unitHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 10,
      paddingVertical: 9,
      backgroundColor: theme.colors.card,
      gap: 6,
    },
    unitExpandBtn: {
      padding: 4,
    },
    unitCheckboxRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    unitTitle: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 13,
      color: theme.colors.foreground,
      flexShrink: 1,
    },
    unitCountBadge: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 11,
      color: theme.colors.mutedForeground,
      marginLeft: 4,
    },
    unitToggleBtn: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: theme.radii.xs,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    unitToggleText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 10,
      color: theme.colors.accent,
    },
    unitTopicList: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: theme.colors.background,
      gap: 6,
    },
    emptyTopicText: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 11,
      color: theme.colors.mutedForeground,
      fontStyle: 'italic',
      padding: 4,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    topicRowSelected: {
      backgroundColor: `${theme.colors.accent}12`,
      borderColor: `${theme.colors.accent}45`,
    },
    topicTitle: {
      flex: 1,
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.foreground,
      marginRight: 8,
      lineHeight: 16,
    },
    topicTitleSelected: {
      fontFamily: theme.typography.sans.medium,
      color: theme.colors.foreground,
    },
    completedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: 'rgba(16, 185, 129, 0.12)',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    completedBadgeText: {
      fontFamily: theme.typography.sans.bold,
      fontSize: 9,
      color: '#10B981',
      textTransform: 'uppercase',
    },
    pendingBadge: {
      backgroundColor: theme.colors.muted,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
    },
    pendingBadgeText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 9,
      color: theme.colors.mutedForeground,
    },
    bottomBar: {
      backgroundColor: theme.colors.card,
      borderTopWidth: 1,
      borderTopColor: theme.colors.cardBorder,
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.sm,
      flexDirection: 'row',
      gap: 10,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelButtonText: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 13,
      color: theme.colors.mutedForeground,
    },
    saveButton: {
      flex: 2,
      paddingVertical: 12,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    saveButtonEmpty: {
      opacity: 0.9,
    },
    saveButtonText: {
      fontFamily: theme.typography.sans.bold,
      fontSize: 13,
      color: theme.colors.primaryForeground,
    },
  });
