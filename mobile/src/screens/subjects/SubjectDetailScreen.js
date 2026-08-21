import React from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { BookOpen, NotebookText, FolderOpen, ListChecks, CalendarClock, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '../../components/ui/Button';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const SubjectDetailScreen = ({ route, navigation }) => {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const { id, subject } = route.params;

  if (!subject) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Subject data missing.</Text>
        <Button onPress={() => navigation.goBack()}>Go Back</Button>
      </View>
    );
  }

  const navigateTo = (screen, params) => {
    navigation.navigate(screen, params);
  };

  const modules = [
    {
      title: 'Syllabus',
      desc: 'View and track syllabus progress',
      icon: BookOpen,
      route: 'Syllabus',
      params: { subjectId: id }
    },
    {
      title: 'Notes',
      desc: 'Manage notes and attachments',
      icon: NotebookText,
      route: 'Notes',
      params: { subjectId: id }
    },
    {
      title: 'Resources',
      desc: 'View uploaded materials and links',
      icon: FolderOpen,
      route: 'Resources',
      params: { subjectId: id }
    },
    {
      title: 'Tasks',
      desc: 'Pending assignments and tasks',
      icon: ListChecks,
      route: 'Tasks',
      params: { subjectId: id }
    },
    {
      title: 'Exams',
      desc: 'Upcoming exams and countdowns',
      icon: CalendarClock,
      route: 'Exams',
      params: { subjectId: id }
    }
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, spacing.lg) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{subject.name || 'Subject Details'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroCard}>
          <Text style={styles.heroCode}>{subject.code}</Text>
          <Text style={styles.heroTitle}>{subject.name}</Text>
          
          <View style={styles.metaRow}>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>{subject.credits} Credits</Text>
            </View>
            <View style={styles.metaBadge}>
              <Text style={styles.metaText}>Sem {subject.semester}</Text>
            </View>
          </View>
          
          {!!subject.faculty && (
            <Text style={styles.facultyText}>Faculty: {subject.faculty}</Text>
          )}
        </View>

        <Text style={styles.sectionTitle}>Modules</Text>

        <View style={styles.moduleList}>
          {modules.map((m, i) => (
            <TouchableOpacity 
              key={i} 
              style={styles.moduleItem}
              activeOpacity={0.7}
              onPress={() => navigateTo(m.route, m.params)}
            >
              <View style={styles.moduleIconBox}>
                <m.icon size={24} color={colors.primary} />
              </View>
              <View style={styles.moduleTextContainer}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleDesc}>{m.desc}</Text>
              </View>
              <ChevronRight size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = useStyles(({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { fontFamily: typography.sans.medium, color: colors.destructive, marginBottom: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: typography.serif.medium, fontSize: 18, color: colors.foreground },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heroCard: {
    backgroundColor: colors.card,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  heroCode: { fontFamily: typography.mono.bold, fontSize: 14, color: colors.primary, marginBottom: spacing.xs },
  heroTitle: { fontFamily: typography.sans.bold, fontSize: 24, color: colors.foreground, marginBottom: spacing.md },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  metaBadge: { backgroundColor: `${colors.primary}1A`, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.sm },
  metaText: { fontFamily: typography.sans.medium, fontSize: 12, color: colors.primary },
  facultyText: { fontFamily: typography.sans.regular, fontSize: 14, color: colors.mutedForeground, marginTop: spacing.xs },
  sectionTitle: { fontFamily: typography.serif.medium, fontSize: 20, color: colors.foreground, marginBottom: spacing.md },
  moduleList: { gap: spacing.sm },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  moduleIconBox: {
    width: 48, height: 48, borderRadius: radii.md, backgroundColor: `${colors.primary}1A`,
    alignItems: 'center', justifyContent: 'center', marginRight: spacing.md,
  },
  moduleTextContainer: { flex: 1 },
  moduleTitle: { fontFamily: typography.sans.bold, fontSize: 16, color: colors.foreground },
  moduleDesc: { fontFamily: typography.sans.regular, fontSize: 13, color: colors.mutedForeground, marginTop: 2 }
}));

export default SubjectDetailScreen;
