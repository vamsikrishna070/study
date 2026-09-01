import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import {
  BookOpen,
  Plus,
  X,
  Check,
  Globe,
  ChevronDown,
  ChevronUp,
  Folder
} from 'lucide-react-native';
import { SelectPicker } from '../ui/SelectPicker';
import { getTopics, getUnits } from '../../api/syllabus';
import { useAppTheme, useStyles } from '../../theme/theme';

export function StudyTopicSelector({
  studyType = 'syllabus',
  onStudyTypeChange,
  availableSubjects = [],
  selectedSubjects = [],
  onSelectedSubjectsChange,
  outsideSyllabus = [],
  onOutsideSyllabusChange,
  showCompletionCheckboxes = false,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const [subjectDataMap, setSubjectDataMap] = useState({});
  const [collapsedUnitsMap, setCollapsedUnitsMap] = useState({});
  const [customTopicInputMap, setCustomTopicInputMap] = useState({});
  const [outsideTopicInputMap, setOutsideTopicInputMap] = useState({});

  useEffect(() => {
    selectedSubjects.forEach((subItem) => {
      if (subItem.subjectId && !subjectDataMap[subItem.subjectId]) {
        Promise.all([
          getUnits(subItem.subjectId).catch(() => []),
          getTopics(subItem.subjectId).catch(() => []),
        ]).then(([unitsRes, topicsRes]) => {
          const rawUnits = unitsRes.data || unitsRes || [];
          const rawTopics = topicsRes.data || topicsRes || [];

          setSubjectDataMap((prev) => ({
            ...prev,
            [subItem.subjectId]: {
              units: Array.isArray(rawUnits) ? rawUnits : [],
              topics: Array.isArray(rawTopics) ? rawTopics : [],
            },
          }));
        });
      }
    });
  }, [selectedSubjects]);

  const subjectOptions = availableSubjects.map((s) => ({
    label: `${s.name} (${s.code || 'Sub'})`,
    value: s._id || s.id,
  }));

  const handleAddSubjectBlock = () => {
    if (availableSubjects.length === 0) return;
    const unusedSub = availableSubjects.find(
      (s) => !selectedSubjects.some((sel) => sel.subjectId === (s._id || s.id))
    ) || availableSubjects[0];

    const subId = unusedSub._id || unusedSub.id;
    onSelectedSubjectsChange([
      ...selectedSubjects,
      {
        subjectId: subId,
        subjectName: unusedSub.name,
        topics: [],
      },
    ]);
  };

  const handleRemoveSubjectBlock = (index) => {
    const next = [...selectedSubjects];
    next.splice(index, 1);
    onSelectedSubjectsChange(next);
  };

  const handleSubjectChange = (index, newSubjectId) => {
    const found = availableSubjects.find((s) => (s._id || s.id) === newSubjectId);
    const next = [...selectedSubjects];
    next[index] = {
      ...next[index],
      subjectId: newSubjectId,
      subjectName: found?.name || 'General Study',
      topics: [],
    };
    onSelectedSubjectsChange(next);
  };

  const toggleUnitCollapse = (subId, unitKey) => {
    const fullKey = `${subId}_${unitKey}`;
    setCollapsedUnitsMap((prev) => ({
      ...prev,
      [fullKey]: !prev[fullKey],
    }));
  };

  const groupTopicsByUnits = (subId) => {
    const data = subjectDataMap[subId] || { units: [], topics: [] };
    const units = data.units || [];
    const topics = data.topics || [];

    if (units.length === 0) {
      return [
        {
          unitKey: 'all_topics',
          unitTitle: 'Syllabus Topics',
          topics,
        },
      ];
    }

    const grouped = [];
    const assignedTopicIds = new Set();

    units.forEach((u, idx) => {
      const uId = (u._id || u.id || `unit_${idx}`).toString();
      const unitTopics = topics.filter((t) => {
        const tUnitId = t.unit?._id || t.unit?.id || t.unit || t.unitId;
        if (tUnitId && tUnitId.toString() === uId) {
          assignedTopicIds.add((t._id || t.id || t.title).toString());
          return true;
        }
        return false;
      });

      grouped.push({
        unitKey: uId,
        unitTitle: u.title ? (u.title.toLowerCase().startsWith('unit') || u.title.toLowerCase().startsWith('module') ? u.title : `Unit ${u.order || idx + 1}: ${u.title}`) : `Unit ${idx + 1}`,
        topics: unitTopics,
      });
    });

    const unassignedTopics = topics.filter((t) => {
      const tid = (t._id || t.id || t.title).toString();
      return !assignedTopicIds.has(tid);
    });

    if (unassignedTopics.length > 0) {
      grouped.push({
        unitKey: 'unassigned',
        unitTitle: 'General Topics',
        topics: unassignedTopics,
      });
    }

    return grouped;
  };

  const handleToggleSyllabusTopic = (subIndex, topicItem) => {
    const next = [...selectedSubjects];
    const subObj = { ...next[subIndex] };
    const currentTopics = [...(subObj.topics || [])];

    const existingIdx = currentTopics.findIndex((t) =>
      (t.topicId && t.topicId === (topicItem._id || topicItem.id)) ||
      (t.topicName && t.topicName === topicItem.title)
    );

    if (existingIdx >= 0) {
      if (showCompletionCheckboxes) {
        currentTopics[existingIdx] = {
          ...currentTopics[existingIdx],
          completed: !currentTopics[existingIdx].completed,
        };
      } else {
        currentTopics.splice(existingIdx, 1);
      }
    } else {
      currentTopics.push({
        topicId: topicItem._id || topicItem.id || null,
        topicName: topicItem.title || 'Topic',
        completed: showCompletionCheckboxes ? true : false,
      });
    }

    subObj.topics = currentTopics;
    next[subIndex] = subObj;
    onSelectedSubjectsChange(next);
  };

  const handleAddCustomSyllabusTopic = (subIndex) => {
    const inputVal = (customTopicInputMap[subIndex] || '').trim();
    if (!inputVal) return;

    const next = [...selectedSubjects];
    const subObj = { ...next[subIndex] };
    const currentTopics = [...(subObj.topics || [])];

    currentTopics.push({
      topicId: null,
      topicName: inputVal,
      completed: showCompletionCheckboxes ? true : false,
    });

    subObj.topics = currentTopics;
    next[subIndex] = subObj;
    onSelectedSubjectsChange(next);
    setCustomTopicInputMap((prev) => ({ ...prev, [subIndex]: '' }));
  };

  const handleRemoveSyllabusTopic = (subIndex, topIndex) => {
    const next = [...selectedSubjects];
    const subObj = { ...next[subIndex] };
    const currentTopics = [...(subObj.topics || [])];
    currentTopics.splice(topIndex, 1);
    subObj.topics = currentTopics;
    next[subIndex] = subObj;
    onSelectedSubjectsChange(next);
  };

  const handleAddOutsideArea = () => {
    onOutsideSyllabusChange([
      ...outsideSyllabus,
      {
        area: '',
        topics: [],
      },
    ]);
  };

  const handleRemoveOutsideArea = (index) => {
    const next = [...outsideSyllabus];
    next.splice(index, 1);
    onOutsideSyllabusChange(next);
  };

  const handleOutsideAreaNameChange = (index, areaName) => {
    const next = [...outsideSyllabus];
    next[index] = { ...next[index], area: areaName };
    onOutsideSyllabusChange(next);
  };

  const handleAddOutsideTopic = (areaIndex) => {
    const inputVal = (outsideTopicInputMap[areaIndex] || '').trim();
    if (!inputVal) return;

    const next = [...outsideSyllabus];
    const areaObj = { ...next[areaIndex] };
    const topics = [...(areaObj.topics || [])];

    topics.push({
      name: inputVal,
      completed: showCompletionCheckboxes ? true : false,
    });

    areaObj.topics = topics;
    next[areaIndex] = areaObj;
    onOutsideSyllabusChange(next);
    setOutsideTopicInputMap((prev) => ({ ...prev, [areaIndex]: '' }));
  };

  const handleToggleOutsideTopicComplete = (areaIndex, topIndex) => {
    const next = [...outsideSyllabus];
    const areaObj = { ...next[areaIndex] };
    const topics = [...(areaObj.topics || [])];
    topics[topIndex] = { ...topics[topIndex], completed: !topics[topIndex].completed };
    areaObj.topics = topics;
    next[areaIndex] = areaObj;
    onOutsideSyllabusChange(next);
  };

  const handleRemoveOutsideTopic = (areaIndex, topIndex) => {
    const next = [...outsideSyllabus];
    const areaObj = { ...next[areaIndex] };
    const topics = [...(areaObj.topics || [])];
    topics.splice(topIndex, 1);
    areaObj.topics = topics;
    next[areaIndex] = areaObj;
    onOutsideSyllabusChange(next);
  };

  return (
    <View style={styles.container}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, studyType === 'syllabus' && styles.activeTab]}
          onPress={() => onStudyTypeChange('syllabus')}
          activeOpacity={0.7}
        >
          <BookOpen size={15} color={studyType === 'syllabus' ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, studyType === 'syllabus' && styles.activeTabText]}>Syllabus</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, studyType === 'outside_syllabus' && styles.activeTab]}
          onPress={() => onStudyTypeChange('outside_syllabus')}
          activeOpacity={0.7}
        >
          <Globe size={15} color={studyType === 'outside_syllabus' ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, studyType === 'outside_syllabus' && styles.activeTabText]}>Outside Syllabus</Text>
        </TouchableOpacity>
      </View>

      {studyType === 'syllabus' ? (
        <View style={styles.section}>
          {selectedSubjects.map((subBlock, subIdx) => {
            const unitGroups = groupTopicsByUnits(subBlock.subjectId);
            const selectedTopicList = subBlock.topics || [];

            return (
              <View key={`sub_block_${subIdx}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Subject {selectedSubjects.length > 1 ? `#${subIdx + 1}` : ''}</Text>
                  {selectedSubjects.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveSubjectBlock(subIdx)}>
                      <X size={16} color={colors.destructive} />
                    </TouchableOpacity>
                  )}
                </View>

                {availableSubjects.length > 0 ? (
                  <SelectPicker
                    value={subBlock.subjectId}
                    onChange={(val) => handleSubjectChange(subIdx, val)}
                    options={subjectOptions}
                    placeholder="Select Subject"
                  />
                ) : (
                  <TextInput
                    style={styles.input}
                    value={subBlock.subjectName}
                    onChangeText={(text) => {
                      const next = [...selectedSubjects];
                      next[subIdx] = { ...next[subIdx], subjectName: text };
                      onSelectedSubjectsChange(next);
                    }}
                    placeholder="Subject Name"
                    placeholderTextColor={colors.mutedForeground}
                  />
                )}

                <Text style={styles.subHeading}>Syllabus Units & Topics</Text>

                {unitGroups.map((unitGroup) => {
                  const fullUnitKey = `${subBlock.subjectId}_${unitGroup.unitKey}`;
                  const isCollapsed = Boolean(collapsedUnitsMap[fullUnitKey]);

                  return (
                    <View key={`unit_group_${unitGroup.unitKey}`} style={styles.unitContainer}>
                      <TouchableOpacity
                        style={styles.unitHeader}
                        onPress={() => toggleUnitCollapse(subBlock.subjectId, unitGroup.unitKey)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.unitHeaderLeft}>
                          <Folder size={14} color={colors.accent} style={{ marginRight: 6 }} />
                          <Text style={styles.unitHeaderText} numberOfLines={1}>
                            {unitGroup.unitTitle}
                          </Text>
                          <Text style={styles.unitCountBadge}>
                            ({unitGroup.topics.length})
                          </Text>
                        </View>
                        {isCollapsed ? (
                          <ChevronDown size={16} color={colors.mutedForeground} />
                        ) : (
                          <ChevronUp size={16} color={colors.mutedForeground} />
                        )}
                      </TouchableOpacity>

                      {!isCollapsed && (
                        <View style={styles.unitContent}>
                          {unitGroup.topics.length > 0 ? (
                            <View style={styles.topicList}>
                              {unitGroup.topics.map((tItem) => {
                                const tId = tItem._id || tItem.id;
                                const selectedObj = selectedTopicList.find((st) =>
                                  (st.topicId && st.topicId === tId) || (st.topicName && st.topicName === tItem.title)
                                );
                                const isSelected = Boolean(selectedObj);
                                const isCompleted = selectedObj?.completed;

                                return (
                                  <TouchableOpacity
                                    key={tId || tItem.title}
                                    style={[
                                      styles.topicRow,
                                      isSelected && styles.selectedTopicRow,
                                    ]}
                                    onPress={() => handleToggleSyllabusTopic(subIdx, tItem)}
                                    activeOpacity={0.7}
                                  >
                                    <View style={[
                                      styles.checkbox,
                                      isSelected && styles.checkedBox,
                                      showCompletionCheckboxes && isCompleted && styles.completedCheckedBox
                                    ]}>
                                      {isSelected && <Check size={10} color="#FFFFFF" />}
                                    </View>
                                    <Text style={[
                                      styles.topicText,
                                      isSelected && styles.selectedTopicText,
                                    ]}>
                                      {tItem.title}
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ) : (
                            <Text style={styles.emptyTopicText}>No topics listed in this unit.</Text>
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}

                <View style={styles.addCustomRow}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    value={customTopicInputMap[subIdx] || ''}
                    onChangeText={(val) => setCustomTopicInputMap((prev) => ({ ...prev, [subIdx]: val }))}
                    placeholder="Custom Topic Name..."
                    placeholderTextColor={colors.mutedForeground}
                  />
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => handleAddCustomSyllabusTopic(subIdx)}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color={colors.primaryForeground} />
                  </TouchableOpacity>
                </View>

                {selectedTopicList.length > 0 && (
                  <View style={styles.selectedTopicSummary}>
                    <Text style={styles.selectedTopicSummaryHeader}>
                      Selected ({selectedTopicList.length}):
                    </Text>
                    {selectedTopicList.map((st, tIdx) => (
                      <View key={`sel_top_summary_${tIdx}`} style={styles.summaryTopicRow}>
                        {showCompletionCheckboxes && (
                          <TouchableOpacity
                            style={[styles.checkbox, st.completed && styles.completedCheckedBox]}
                            onPress={() => {
                              const next = [...selectedSubjects];
                              const subObj = { ...next[subIdx] };
                              const topics = [...subObj.topics];
                              topics[tIdx] = { ...topics[tIdx], completed: !topics[tIdx].completed };
                              subObj.topics = topics;
                              next[subIdx] = subObj;
                              onSelectedSubjectsChange(next);
                            }}
                          >
                            {st.completed && <Check size={10} color="#FFFFFF" />}
                          </TouchableOpacity>
                        )}
                        <Text style={styles.summaryTopicText}>{st.topicName}</Text>
                        <TouchableOpacity onPress={() => handleRemoveSyllabusTopic(subIdx, tIdx)}>
                          <X size={14} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addBlockBtn}
            onPress={handleAddSubjectBlock}
            activeOpacity={0.7}
          >
            <Plus size={15} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.addBlockBtnText}>Add Another Subject</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.section}>
          {outsideSyllabus.map((outBlock, outIdx) => (
            <View key={`out_block_${outIdx}`} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Study Area #{outIdx + 1}</Text>
                {outsideSyllabus.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveOutsideArea(outIdx)}>
                    <X size={16} color={colors.destructive} />
                  </TouchableOpacity>
                )}
              </View>

              <TextInput
                style={styles.input}
                value={outBlock.area}
                onChangeText={(val) => handleOutsideAreaNameChange(outIdx, val)}
                placeholder="Area (e.g. Interview Prep, Aptitude)..."
                placeholderTextColor={colors.mutedForeground}
              />

              <Text style={styles.subHeading}>Topics Studied</Text>
              <View style={styles.addCustomRow}>
                <TextInput
                  style={[styles.input, { flex: 1, marginBottom: 0 }]}
                  value={outsideTopicInputMap[outIdx] || ''}
                  onChangeText={(val) => setOutsideTopicInputMap((prev) => ({ ...prev, [outIdx]: val }))}
                  placeholder="Add Topic Name..."
                  placeholderTextColor={colors.mutedForeground}
                />
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => handleAddOutsideTopic(outIdx)}
                  activeOpacity={0.7}
                >
                  <Plus size={16} color={colors.primaryForeground} />
                </TouchableOpacity>
              </View>

              {outBlock.topics && outBlock.topics.length > 0 && (
                <View style={styles.selectedTopicSummary}>
                  {outBlock.topics.map((top, topIdx) => (
                    <View key={`out_top_${topIdx}`} style={styles.summaryTopicRow}>
                      {showCompletionCheckboxes && (
                        <TouchableOpacity
                          style={[styles.checkbox, top.completed && styles.completedCheckedBox]}
                          onPress={() => handleToggleOutsideTopicComplete(outIdx, topIdx)}
                        >
                          {top.completed && <Check size={10} color="#FFFFFF" />}
                        </TouchableOpacity>
                      )}
                      <Text style={styles.summaryTopicText}>{top.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveOutsideTopic(outIdx, topIdx)}>
                        <X size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}

          <TouchableOpacity
            style={styles.addBlockBtn}
            onPress={handleAddOutsideArea}
            activeOpacity={0.7}
          >
            <Plus size={15} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={styles.addBlockBtnText}>Add Another Outside Area</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const createStyles = (theme) =>
  StyleSheet.create({
    container: {
      marginBottom: theme.spacing.md,
    },
    tabContainer: {
      flexDirection: 'row',
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.lg,
      padding: 3,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: theme.radii.md,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 13,
      color: theme.colors.mutedForeground,
    },
    activeTabText: {
      color: theme.colors.primaryForeground,
      fontFamily: theme.typography.sans.semiBold,
    },
    section: {
      gap: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.xl,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      gap: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 13,
      color: theme.colors.foreground,
    },
    subHeading: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 10,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      color: theme.colors.mutedForeground,
      marginTop: 6,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderRadius: theme.radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontFamily: theme.typography.sans.regular,
      fontSize: 13,
      color: theme.colors.foreground,
    },
    unitContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      overflow: 'hidden',
      marginVertical: 2,
    },
    unitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.card,
    },
    unitHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      marginRight: 8,
    },
    unitHeaderText: {
      fontFamily: theme.typography.sans.semiBold,
      fontSize: 13,
      color: theme.colors.foreground,
      flexShrink: 1,
    },
    unitCountBadge: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 11,
      color: theme.colors.mutedForeground,
      marginLeft: 6,
    },
    unitContent: {
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    topicList: {
      gap: 4,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      paddingHorizontal: 8,
      borderRadius: theme.radii.sm,
    },
    selectedTopicRow: {
      backgroundColor: `${theme.colors.accent}12`,
    },
    topicText: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 13,
      color: theme.colors.foreground,
      flex: 1,
    },
    selectedTopicText: {
      fontFamily: theme.typography.sans.semiBold,
      color: theme.colors.foreground,
    },
    checkbox: {
      width: 16,
      height: 16,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    checkedBox: {
      backgroundColor: theme.colors.accent,
      borderColor: theme.colors.accent,
    },
    completedCheckedBox: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    emptyTopicText: {
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.mutedForeground,
      padding: 6,
    },
    addCustomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 4,
    },
    addBtn: {
      backgroundColor: theme.colors.accent,
      padding: 10,
      borderRadius: theme.radii.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedTopicSummary: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.md,
      padding: 10,
      gap: 4,
      marginTop: 4,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
    },
    selectedTopicSummaryHeader: {
      fontFamily: theme.typography.mono.medium,
      fontSize: 10,
      textTransform: 'uppercase',
      color: theme.colors.mutedForeground,
      marginBottom: 2,
    },
    summaryTopicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 3,
    },
    summaryTopicText: {
      flex: 1,
      fontFamily: theme.typography.sans.regular,
      fontSize: 12,
      color: theme.colors.foreground,
      marginRight: 8,
    },
    addBlockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.cardBorder,
      borderStyle: 'dashed',
    },
    addBlockBtnText: {
      fontFamily: theme.typography.sans.medium,
      fontSize: 13,
      color: theme.colors.accent,
    },
  });
