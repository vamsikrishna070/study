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
  Sparkles
} from 'lucide-react-native';
import { SelectPicker } from '../ui/SelectPicker';
import { getTopics } from '../../api/syllabus';
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
  const { colors, typography, spacing, radii, isDark } = useAppTheme();
  const styles = useStyles(createStyles);
  const [subjectTopicsMap, setSubjectTopicsMap] = useState({});
  const [customTopicInputMap, setCustomTopicInputMap] = useState({});
  const [outsideTopicInputMap, setOutsideTopicInputMap] = useState({});

  useEffect(() => {
    selectedSubjects.forEach((subItem) => {
      if (subItem.subjectId && !subjectTopicsMap[subItem.subjectId]) {
        getTopics(subItem.subjectId)
          .then((res) => {
            const list = res.data || res || [];
            setSubjectTopicsMap((prev) => ({ ...prev, [subItem.subjectId]: list }));
          })
          .catch(() => {
            setSubjectTopicsMap((prev) => ({ ...prev, [subItem.subjectId]: [] }));
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
          <BookOpen size={16} color={studyType === 'syllabus' ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, studyType === 'syllabus' && styles.activeTabText]}>Syllabus</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, studyType === 'outside_syllabus' && styles.activeTab]}
          onPress={() => onStudyTypeChange('outside_syllabus')}
          activeOpacity={0.7}
        >
          <Globe size={16} color={studyType === 'outside_syllabus' ? colors.primaryForeground : colors.mutedForeground} style={{ marginRight: 6 }} />
          <Text style={[styles.tabText, studyType === 'outside_syllabus' && styles.activeTabText]}>Outside Syllabus</Text>
        </TouchableOpacity>
      </View>

      {studyType === 'syllabus' ? (
        <View style={styles.section}>
          {selectedSubjects.map((subBlock, subIdx) => {
            const topicList = subjectTopicsMap[subBlock.subjectId] || [];
            const selectedTopicList = subBlock.topics || [];

            return (
              <View key={`sub_block_${subIdx}`} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>Subject {selectedSubjects.length > 1 ? `#${subIdx + 1}` : ''}</Text>
                  {selectedSubjects.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveSubjectBlock(subIdx)}>
                      <X size={18} color={colors.destructive} />
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

                <Text style={styles.subHeading}>Syllabus Topics</Text>
                {topicList.length > 0 ? (
                  <View style={styles.chipContainer}>
                    {topicList.map((tItem) => {
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
                            styles.chip,
                            isSelected && styles.selectedChip,
                            showCompletionCheckboxes && isCompleted && styles.completedChip,
                          ]}
                          onPress={() => handleToggleSyllabusTopic(subIdx, tItem)}
                          activeOpacity={0.7}
                        >
                          {showCompletionCheckboxes ? (
                            <View style={[styles.checkbox, isCompleted && styles.checkedBox]}>
                              {isCompleted && <Check size={10} color="#FFFFFF" />}
                            </View>
                          ) : (
                            isSelected && <Check size={12} color={colors.primaryForeground} style={{ marginRight: 4 }} />
                          )}
                          <Text style={[
                            styles.chipText,
                            isSelected && styles.selectedChipText,
                            showCompletionCheckboxes && isCompleted && styles.completedChipText,
                          ]}>
                            {tItem.title}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={styles.emptyTopicText}>No syllabus topics detected for this subject.</Text>
                )}

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
                  <View style={styles.selectedTopicList}>
                    <Text style={styles.selectedTopicHeader}>Selected Topics:</Text>
                    {selectedTopicList.map((st, tIdx) => (
                      <View key={`sel_top_${tIdx}`} style={styles.topicRow}>
                        {showCompletionCheckboxes && (
                          <TouchableOpacity
                            style={[styles.checkbox, st.completed && styles.checkedBox]}
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
                        <Text style={styles.topicRowText}>{st.topicName}</Text>
                        <TouchableOpacity onPress={() => handleRemoveSyllabusTopic(subIdx, tIdx)}>
                          <X size={16} color={colors.mutedForeground} />
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
            <Plus size={16} color={colors.accent} style={{ marginRight: 6 }} />
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
                    <X size={18} color={colors.destructive} />
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
                <View style={styles.selectedTopicList}>
                  {outBlock.topics.map((top, topIdx) => (
                    <View key={`out_top_${topIdx}`} style={styles.topicRow}>
                      {showCompletionCheckboxes && (
                        <TouchableOpacity
                          style={[styles.checkbox, top.completed && styles.checkedBox]}
                          onPress={() => handleToggleOutsideTopicComplete(outIdx, topIdx)}
                        >
                          {top.completed && <Check size={10} color="#FFFFFF" />}
                        </TouchableOpacity>
                      )}
                      <Text style={styles.topicRowText}>{top.name}</Text>
                      <TouchableOpacity onPress={() => handleRemoveOutsideTopic(outIdx, topIdx)}>
                        <X size={16} color={colors.mutedForeground} />
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
            <Plus size={16} color={colors.accent} style={{ marginRight: 6 }} />
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
      padding: 4,
      marginBottom: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: theme.radii.md,
    },
    activeTab: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
    },
    activeTabText: {
      color: theme.colors.primaryForeground,
    },
    section: {
      gap: theme.spacing.md,
    },
    card: {
      backgroundColor: theme.colors.card,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: theme.spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.colors.foreground,
    },
    subHeading: {
      fontSize: 12,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
      marginTop: 4,
    },
    input: {
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.md,
      paddingHorizontal: 12,
      paddingVertical: 8,
      fontSize: 14,
      color: theme.colors.foreground,
    },
    chipContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginVertical: 4,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.background,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    selectedChip: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    completedChip: {
      backgroundColor: '#10B98120',
      borderColor: '#10B981',
    },
    chipText: {
      fontSize: 12,
      color: theme.colors.foreground,
    },
    selectedChipText: {
      color: theme.colors.primaryForeground,
      fontWeight: '600',
    },
    completedChipText: {
      color: '#10B981',
      fontWeight: '600',
    },
    emptyTopicText: {
      fontSize: 12,
      color: theme.colors.mutedForeground,
      fontStyle: 'italic',
    },
    addCustomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    addBtn: {
      backgroundColor: theme.colors.accent,
      padding: 10,
      borderRadius: theme.radii.md,
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedTopicList: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.radii.md,
      padding: 10,
      gap: 6,
      marginTop: 4,
    },
    selectedTopicHeader: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.colors.mutedForeground,
      marginBottom: 2,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 4,
    },
    topicRowText: {
      flex: 1,
      fontSize: 13,
      color: theme.colors.foreground,
      marginRight: 8,
    },
    checkbox: {
      width: 18,
      height: 18,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: theme.colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 8,
    },
    checkedBox: {
      backgroundColor: '#10B981',
      borderColor: '#10B981',
    },
    addBlockBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      borderRadius: theme.radii.lg,
      borderWidth: 1,
      borderColor: theme.colors.accent,
      borderStyle: 'dashed',
    },
    addBlockBtnText: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.accent,
    },
  });
