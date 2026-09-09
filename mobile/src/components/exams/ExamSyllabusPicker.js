import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Folder,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { getUnits, getTopics } from '../../api/syllabus';
import { useAppTheme, useStyles } from '../../theme/theme';

export function ExamSyllabusPicker({
  selectedTopicIds = [],
  onChangeSelectedTopics,
  subjects = [],
  primarySubjectId,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const [subjectData, setSubjectData] = useState({});
  const [loadingMap, setLoadingMap] = useState({});
  const [expandedSubjects, setExpandedSubjects] = useState({});
  const [expandedUnits, setExpandedUnits] = useState({});
  const [activeSubjectFilter, setActiveSubjectFilter] = useState('all');

  // Load units & topics for available subjects
  useEffect(() => {
    subjects.forEach((sub) => {
      const sId = sub._id || sub.id;
      if (sId && !subjectData[sId] && !loadingMap[sId]) {
        setLoadingMap((prev) => ({ ...prev, [sId]: true }));
        Promise.all([
          getUnits(sId).catch(() => []),
          getTopics(sId).catch(() => []),
        ])
          .then(([unitsRes, topicsRes]) => {
            const rawUnits = unitsRes.data || unitsRes || [];
            const rawTopics = topicsRes.data || topicsRes || [];
            setSubjectData((prev) => ({
              ...prev,
              [sId]: {
                units: Array.isArray(rawUnits) ? rawUnits : [],
                topics: Array.isArray(rawTopics) ? rawTopics : [],
              },
            }));
            if (subjects.length === 1) {
              setExpandedSubjects({ [sId]: true });
            }
          })
          .finally(() => {
            setLoadingMap((prev) => ({ ...prev, [sId]: false }));
          });
      }
    });
  }, [subjects]);

  useEffect(() => {
    if (primarySubjectId) {
      setExpandedSubjects((prev) => ({ ...prev, [primarySubjectId]: true }));
    }
  }, [primarySubjectId]);

  const selectedSet = useMemo(() => new Set(selectedTopicIds), [selectedTopicIds]);

  const { totalSelected, completedSelected, pendingSelected } = useMemo(() => {
    let comp = 0;
    let pend = 0;
    const allTopics = Object.values(subjectData).flatMap((d) => d.topics || []);
    selectedSet.forEach((tid) => {
      const t = allTopics.find((top) => (top._id || top.id) === tid);
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
  }, [selectedSet, subjectData]);

  const toggleTopic = (topicId) => {
    const next = new Set(selectedSet);
    if (next.has(topicId)) {
      next.delete(topicId);
    } else {
      next.add(topicId);
    }
    emitChange(Array.from(next));
  };

  const toggleUnit = (unitId, unitTopics) => {
    const next = new Set(selectedSet);
    const unitTopicIds = unitTopics.map((t) => t._id || t.id);
    const allUnitSelected = unitTopicIds.length > 0 && unitTopicIds.every((id) => next.has(id));

    if (allUnitSelected) {
      unitTopicIds.forEach((id) => next.delete(id));
    } else {
      unitTopicIds.forEach((id) => next.add(id));
    }
    emitChange(Array.from(next));
  };

  const toggleSubject = (subjectId, subjectTopics) => {
    const next = new Set(selectedSet);
    const subTopicIds = subjectTopics.map((t) => t._id || t.id);
    const allSubSelected = subTopicIds.length > 0 && subTopicIds.every((id) => next.has(id));

    if (allSubSelected) {
      subTopicIds.forEach((id) => next.delete(id));
    } else {
      subTopicIds.forEach((id) => next.add(id));
    }
    emitChange(Array.from(next));
  };

  const emitChange = (newTopicIds) => {
    const allTopics = Object.values(subjectData).flatMap((d) => d.topics || []);
    const selectedDocs = allTopics.filter((t) => newTopicIds.includes(t._id || t.id));

    const syllabus = selectedDocs.map((t) => ({
      subjectId: t.subject?._id || t.subject?.id || t.subject,
      unitId: t.unit?._id || t.unit?.id || t.unit || null,
      topicId: t._id || t.id,
    }));

    const primarySubId = selectedDocs.length > 0 ? (selectedDocs[0].subject?._id || selectedDocs[0].subject) : (primarySubjectId || subjects[0]?._id || subjects[0]?.id);

    if (onChangeSelectedTopics) {
      onChangeSelectedTopics(newTopicIds, syllabus, primarySubId);
    }
  };

  const filteredSubjects = useMemo(() => {
    if (activeSubjectFilter === 'all') return subjects;
    return subjects.filter((s) => (s._id || s.id) === activeSubjectFilter);
  }, [subjects, activeSubjectFilter]);

  return (
    <View style={styles.container}>
      {/* Summary Box */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Sparkles size={14} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.summaryTitle}>EXAM SYLLABUS SCOPE</Text>
          </View>
          <Text style={styles.summaryBadgeText}>
            {totalSelected} topic{totalSelected === 1 ? '' : 's'} included
          </Text>
        </View>

        {totalSelected > 0 ? (
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>SELECTED</Text>
              <Text style={styles.statValue}>{totalSelected}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxCompleted]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Check size={11} color="#10B981" />
                <Text style={styles.statLabelCompleted}>COMPLETED</Text>
              </View>
              <Text style={styles.statValueCompleted}>
                {completedSelected} ({Math.round((completedSelected / totalSelected) * 100)}%)
              </Text>
            </View>
            <View style={styles.statBox}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={11} color="#F59E0B" />
                <Text style={styles.statLabelPending}>PENDING</Text>
              </View>
              <Text style={styles.statValuePending}>{pendingSelected}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.emptyPromptText}>
            Select units and topics below to include in this exam's progress tracking.
          </Text>
        )}
      </View>

      {/* Filter Tabs if multiple subjects */}
      {subjects.length > 1 && (
        <View style={styles.filterTabs}>
          <TouchableOpacity
            style={[styles.filterChip, activeSubjectFilter === 'all' && styles.filterChipActive]}
            onPress={() => setActiveSubjectFilter('all')}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterChipText, activeSubjectFilter === 'all' && styles.filterChipTextActive]}>
              All ({subjects.length})
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
        </View>
      )}

      {/* Subjects Hierarchy */}
      <View style={styles.treeContainer}>
        {filteredSubjects.map((sub) => {
          const sId = sub._id || sub.id;
          const sData = subjectData[sId] || { units: [], topics: [] };
          const units = sData.units || [];
          const topics = sData.topics || [];
          const isExpanded = Boolean(expandedSubjects[sId]);
          const isLoading = Boolean(loadingMap[sId]);

          const subTopicIds = topics.map((t) => t._id || t.id);
          const allSubSelected = subTopicIds.length > 0 && subTopicIds.every((id) => selectedSet.has(id));
          const someSubSelected = subTopicIds.some((id) => selectedSet.has(id)) && !allSubSelected;
          const selectedSubCount = subTopicIds.filter((id) => selectedSet.has(id)).length;

          return (
            <View key={sId} style={styles.subjectCard}>
              {/* Subject Header */}
              <View style={styles.subjectHeader}>
                <TouchableOpacity
                  style={styles.expandIconBtn}
                  onPress={() => setExpandedSubjects((prev) => ({ ...prev, [sId]: !prev[sId] }))}
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
                  <View style={[
                    styles.checkbox,
                    allSubSelected && styles.checkboxChecked,
                    someSubSelected && styles.checkboxIndeterminate
                  ]}>
                    {allSubSelected && <Check size={11} color="#FFFFFF" />}
                    {someSubSelected && <View style={styles.indeterminateDash} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <BookOpen size={13} color={colors.accent} style={{ marginRight: 6 }} />
                      <Text style={styles.subjectTitle} numberOfLines={1}>
                        {sub.name}
                      </Text>
                    </View>
                    <Text style={styles.subjectSubtitle}>
                      {sub.code || 'Sub'} · {topics.length} topics
                      {selectedSubCount > 0 ? ` (${selectedSubCount} selected)` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selectToggleBtn}
                  onPress={() => toggleSubject(sId, topics)}
                  activeOpacity={0.7}
                  disabled={topics.length === 0}
                >
                  <Text style={styles.selectToggleBtnText}>
                    {allSubSelected ? 'Clear' : 'All'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Subject Units / Topics */}
              {isExpanded && (
                <View style={styles.subjectBody}>
                  {isLoading ? (
                    <View style={styles.loadingBox}>
                      <ActivityIndicator size="small" color={colors.accent} />
                      <Text style={styles.loadingText}>Loading syllabus…</Text>
                    </View>
                  ) : topics.length === 0 ? (
                    <Text style={styles.emptyUnitText}>
                      No syllabus extracted for this subject yet.
                    </Text>
                  ) : units.length > 0 ? (
                    units.map((unit, uIdx) => {
                      const uId = unit._id || unit.id || `unit_${uIdx}`;
                      const unitKey = `${sId}_${uId}`;
                      const isUnitExpanded = expandedUnits[unitKey] !== false;
                      const unitTopics = topics.filter((t) => {
                        const tUnit = t.unit?._id || t.unit?.id || t.unit;
                        return tUnit && tUnit.toString() === uId.toString();
                      });

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
                              <View style={[
                                styles.checkboxSmall,
                                allUnitSelected && styles.checkboxChecked,
                                someUnitSelected && styles.checkboxIndeterminate
                              ]}>
                                {allUnitSelected && <Check size={9} color="#FFFFFF" />}
                                {someUnitSelected && <View style={styles.indeterminateDashSmall} />}
                              </View>
                              <Folder size={12} color={colors.mutedForeground} style={{ marginRight: 6 }} />
                              <Text style={styles.unitTitle} numberOfLines={1}>
                                {unit.title || `Unit ${uIdx + 1}`}
                              </Text>
                              <Text style={styles.unitCountBadge}>
                                ({selUnitCount}/{unitTopics.length})
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              onPress={() => toggleUnit(uId, unitTopics)}
                              activeOpacity={0.7}
                              disabled={unitTopics.length === 0}
                              style={{ paddingHorizontal: 6 }}
                            >
                              <Text style={styles.unitToggleText}>
                                {allUnitSelected ? 'Clear' : 'All'}
                              </Text>
                            </TouchableOpacity>
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
                                      <View style={[
                                        styles.checkboxSmall,
                                        isSelected && styles.checkboxChecked,
                                      ]}>
                                        {isSelected && <Check size={9} color="#FFFFFF" />}
                                      </View>

                                      <Text style={[styles.topicTitle, isSelected && styles.topicTitleSelected]} numberOfLines={2}>
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
                    /* Fallback Flat Topics */
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
                            <View style={[
                              styles.checkboxSmall,
                              isSelected && styles.checkboxChecked,
                            ]}>
                              {isSelected && <Check size={9} color="#FFFFFF" />}
                            </View>

                            <Text style={[styles.topicTitle, isSelected && styles.topicTitleSelected]} numberOfLines={2}>
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
        })}
      </View>
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      gap: theme.spacing.sm,
      marginVertical: theme.spacing.xs,
    },
    summaryCard: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      gap: theme.spacing.xs,
    },
    summaryHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    summaryTitle: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 10,
      letterSpacing: 1.2,
      color: theme.colors.foreground,
    },
    summaryBadgeText: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 11,
      color: theme.colors.accent,
      fontWeight: '700',
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    statBox: {
      flex: 1,
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.md,
      padding: 8,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      alignItems: 'center',
    },
    statBoxCompleted: {
      backgroundColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.25)',
    },
    statLabel: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 8,
      color: theme.colors.mutedForeground,
      textTransform: 'uppercase',
    },
    statLabelCompleted: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 8,
      color: '#10B981',
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    statLabelPending: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 8,
      color: '#F59E0B',
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    statValue: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.foreground,
      marginTop: 2,
    },
    statValueCompleted: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 13,
      fontWeight: '700',
      color: '#10B981',
      marginTop: 2,
    },
    statValuePending: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 14,
      fontWeight: '700',
      color: '#F59E0B',
      marginTop: 2,
    },
    emptyPromptText: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.mutedForeground,
      marginTop: 2,
    },
    filterTabs: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingVertical: 2,
    },
    filterChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: theme.radii.md,
      backgroundColor: theme.colors.card,
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
    treeContainer: {
      gap: theme.spacing.sm,
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
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: theme.colors.card,
      gap: 6,
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
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: theme.colors.cardBorder,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxSmall: {
      width: 15,
      height: 15,
      borderRadius: 3.5,
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
      width: 8,
      height: 2,
      backgroundColor: '#FFFFFF',
      borderRadius: 1,
    },
    indeterminateDashSmall: {
      width: 6,
      height: 1.5,
      backgroundColor: '#FFFFFF',
      borderRadius: 1,
    },
    subjectTitle: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 13,
      color: theme.colors.foreground,
    },
    subjectSubtitle: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 11,
      color: theme.colors.mutedForeground,
      marginTop: 1,
    },
    selectToggleBtn: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    selectToggleBtnText: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 10,
      color: theme.colors.accent,
    },
    subjectBody: {
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderTopWidth: 1,
      borderTopColor: theme.colors.cardBorder,
      gap: theme.spacing.xs,
    },
    loadingBox: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 12,
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
      padding: 8,
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
      paddingHorizontal: 8,
      paddingVertical: 8,
      backgroundColor: theme.colors.card,
    },
    unitExpandBtn: {
      padding: 3,
      marginRight: 4,
    },
    unitCheckboxRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    unitTitle: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 12,
      color: theme.colors.foreground,
      flexShrink: 1,
    },
    unitCountBadge: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 10,
      color: theme.colors.mutedForeground,
      marginLeft: 4,
    },
    unitToggleText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 10,
      color: theme.colors.mutedForeground,
    },
    unitTopicList: {
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: theme.colors.background,
      gap: 4,
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
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: theme.radii.sm,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    topicRowSelected: {
      backgroundColor: `${theme.colors.accent}10`,
      borderColor: `${theme.colors.accent}40`,
    },
    topicTitle: {
      flex: 1,
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.foreground,
      marginRight: 8,
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
  });
