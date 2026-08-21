import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { BookOpen, CheckCircle, Circle, Upload, ChevronRight, ChevronDown, X } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import { extractSyllabus, confirmSyllabus, updateTopicCompletion, getUnits, getTopics } from '../../api/syllabus';
import { getSubjects } from '../../api/subjects';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { EmptyState } from '../../components/ui/EmptyState';
import { QueryState } from '../../components/ui/QueryState';
import { Button } from '../../components/ui/Button';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SyllabusScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const passedSubject = route?.params?.subject;
  const passedSubjectId = route?.params?.subjectId || passedSubject?._id;
  
  const [subjectId, setSubjectId] = useState(passedSubjectId);
  const [subject, setSubject] = useState(passedSubject || null);
  const [allSubjects, setAllSubjects] = useState([]);
  const [subjectPickerVisible, setSubjectPickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [units, setUnits] = useState([]);
  const [error, setError] = useState(null);
  const [expandedUnits, setExpandedUnits] = useState({});

  const loadData = async () => {
    try {
      setError(null);
      let targetId = subjectId;
      let targetSubject = subject;

      // Load all subjects for the picker if no subjectId is preset
      const subsRes = await getSubjects();
      const subsData = subsRes.data || subsRes;
      setAllSubjects(subsData);

      if (!targetId) {
        // Don't auto-select; let the user choose
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const [unitsRes, topicsRes] = await Promise.all([
        getUnits(targetId),
        getTopics(targetId)
      ]);

      const unitsData = unitsRes.data || unitsRes;
      const topicsData = topicsRes.data || topicsRes;

      const unitsWithTopics = unitsData.map(u => ({
        ...u,
        topics: topicsData.filter(t => t.unit === u._id)
      }));

      setUnits(unitsWithTopics);
      
      if (unitsWithTopics.length > 0) {
        setExpandedUnits({ [unitsWithTopics[0]._id]: true });
      }
    } catch (e) {
      setError('Failed to load syllabus.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadData(); }, [subjectId]);
  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [subjectId]);

  const handleUpload = async () => {
    if (!subjectId) return Alert.alert('Error', 'Please select a subject first.');
    
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: 'application/pdf' });
      if (result.canceled) return;
      
      setLoading(true);
      const file = result.assets[0];
      const res = await extractSyllabus(subjectId, file.uri, file.mimeType, file.name);
      
      Alert.alert('Success', 'PDF parsed successfully!');
      await confirmSyllabus(subjectId, res.data?.units || res.units);
      loadData();
    } catch (e) {
      Alert.alert('Upload Failed', e.message || 'Failed to extract syllabus.');
      setLoading(false);
    }
  };

  const toggleTopic = async (unitId, topicId, completed) => {
    try {
      setUnits(prev => prev.map(u => u._id === unitId ? {
        ...u, topics: u.topics.map(t => t._id === topicId ? { ...t, completed: !completed } : t)
      } : u));
      
      await updateTopicCompletion(topicId, !completed);
    } catch(e) {
      Alert.alert('Error', 'Failed to update topic');
      loadData();
    }
  };

  const toggleUnit = (unitId) => {
    setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}
      >
        <PageHeading 
          eyebrow="The curriculum" 
          title="Syllabus" 
          detail={subject?.name ? `Tracking progress for ${subject.name}` : "Select a subject and upload a PDF syllabus."}
          action={subjectId ? <Button onPress={handleUpload} variant="outline" size="sm">Upload PDF</Button> : null}
        />

        {/* Subject Selector — shown when no subject is pre-selected */}
        {!passedSubjectId && (
          <TouchableOpacity
            style={styles.subjectPickerBtn}
            onPress={() => setSubjectPickerVisible(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.subjectPickerLabel}>
              {subject ? subject.name : 'Select Subject'}
            </Text>
            <ChevronDown size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}

        <QueryState error={error} onRetry={loadData} label="Syllabus" />

        {!error && !subjectId && (
          <EmptyState 
            title="Select a Subject"
            detail={allSubjects.length === 0 ? "Create a subject first, then upload its syllabus." : "Choose a subject above to view or upload its syllabus."}
            icon={BookOpen}
          />
        )}

        {!error && subjectId && units.length === 0 && (
          <EmptyState 
            title="No Syllabus Uploaded"
            detail="Upload your course syllabus PDF to automatically extract units and topics."
            icon={Upload}
            action={<Button onPress={handleUpload}>Upload Syllabus PDF</Button>}
          />
        )}

        {!error && units.length > 0 && (
          <View style={styles.unitsContainer}>
            {units.map((u, i) => {
              const isExpanded = expandedUnits[u._id];
              const completedCount = u.topics.filter(t => t.completed).length;
              const totalCount = u.topics.length;
              const isAllDone = totalCount > 0 && completedCount === totalCount;

              return (
                <View key={u._id} style={styles.unitCard}>
                  <TouchableOpacity 
                    style={styles.unitHeader} 
                    onPress={() => toggleUnit(u._id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.unitHeaderLeft}>
                      <ChevronRight 
                        size={20} 
                        color={colors.mutedForeground} 
                        style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                      />
                      <View>
                        <Text style={styles.unitTitle}>Unit {i+1}: {u.title}</Text>
                        <Text style={styles.unitProgress}>{completedCount} of {totalCount} completed</Text>
                      </View>
                    </View>
                    {isAllDone && <CheckCircle size={20} color={colors.accent} />}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.topicsContainer}>
                      {u.topics.map(t => (
                        <TouchableOpacity 
                          key={t._id} 
                          style={styles.topicRow}
                          onPress={() => toggleTopic(u._id, t._id, t.completed)}
                          activeOpacity={0.7}
                        >
                          {t.completed ? (
                            <CheckCircle size={20} color={colors.accent} style={styles.topicIcon} />
                          ) : (
                            <Circle size={20} color={colors.mutedForeground} style={styles.topicIcon} />
                          )}
                          <Text style={[styles.topicTitle, t.completed && styles.topicTitleCompleted]}>
                            {t.title}
                          </Text>
                        </TouchableOpacity>
                      ))}
                      {u.topics.length === 0 && (
                        <Text style={styles.noTopicsText}>No topics extracted for this unit.</Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Subject Picker Modal */}
      <Modal visible={subjectPickerVisible} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalBackdrop} />
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Subject</Text>
              <TouchableOpacity onPress={() => setSubjectPickerVisible(false)} style={styles.closeBtn}>
                <X size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
            {allSubjects.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No subjects found. Create a subject first.</Text>
              </View>
            ) : (
              <FlatList
                data={allSubjects}
                keyExtractor={item => item._id}
                contentContainerStyle={{ padding: spacing.md }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.subjectItem, subjectId === item._id && styles.subjectItemSelected]}
                    onPress={() => {
                      setSubjectId(item._id);
                      setSubject(item);
                      setSubjectPickerVisible(false);
                      setUnits([]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.subjectItemText, subjectId === item._id && styles.subjectItemTextSelected]}>
                      {item.name}
                    </Text>
                    <Text style={styles.subjectItemCode}>{item.code}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = useStyles(({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  subjectPickerBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  subjectPickerLabel: {
    fontFamily: typography.sans.medium,
    fontSize: 16,
    color: colors.foreground,
  },
  modalContainer: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(24,32,49,0.48)' },
  modalContent: { backgroundColor: colors.card, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.cardBorder },
  modalTitle: { fontFamily: typography.serif.medium, fontSize: 24, color: colors.foreground },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalEmpty: { padding: spacing.xl, alignItems: 'center' },
  modalEmptyText: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground, textAlign: 'center' },
  subjectItem: {
    backgroundColor: colors.background,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  subjectItemSelected: { borderColor: colors.primary, backgroundColor: `${colors.primary}1A` },
  subjectItemText: { fontFamily: typography.sans.bold, fontSize: 16, color: colors.foreground },
  subjectItemTextSelected: { color: colors.primary },
  subjectItemCode: { fontFamily: typography.mono.regular, fontSize: 12, color: colors.mutedForeground, marginTop: 2 },
  unitsContainer: { gap: spacing.md, marginTop: spacing.md },
  unitCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    backgroundColor: colors.card,
  },
  unitHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  unitTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 18,
    color: colors.foreground,
  },
  unitProgress: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: 2,
  },
  topicsContainer: {
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    padding: spacing.md,
    backgroundColor: colors.background, // Slightly different bg to differentiate
  },
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  topicIcon: {
    marginRight: spacing.md,
  },
  topicTitle: {
    fontFamily: typography.sans.medium,
    fontSize: 15,
    color: colors.foreground,
    flex: 1,
  },
  topicTitleCompleted: {
    color: colors.mutedForeground,
    textDecorationLine: 'line-through',
  },
  noTopicsText: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    fontStyle: 'italic',
    padding: spacing.sm,
  }
}));

export default SyllabusScreen;
