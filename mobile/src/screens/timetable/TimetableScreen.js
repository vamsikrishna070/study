import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { CalendarDays, Clock, MapPin, User } from 'lucide-react-native';
import { Header } from '../../components/ui/Header';
import { PageHeading } from '../../components/ui/PageHeading';
import { Card } from '../../components/ui/Card';
import { getTimetableData } from '../../api/portal';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const DAYS = [
  { key: 'monday', label: 'MON' },
  { key: 'tuesday', label: 'TUE' },
  { key: 'wednesday', label: 'WED' },
  { key: 'thursday', label: 'THU' },
  { key: 'friday', label: 'FRI' },
  { key: 'saturday', label: 'SAT' },
];

export default function TimetableScreen({ navigation }) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayKey = dayNames[new Date().getDay()];
  const initialTab = DAYS.some((d) => d.key === todayKey) ? todayKey : 'monday';

  const [activeDay, setActiveDay] = useState(initialTab);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await getTimetableData();
      setData(res);
    } catch (err) {
      console.error('[TimetableScreen] Error loading timetable:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const timetableMap = data?.timetable || {};
  const activeDaySlots = timetableMap[activeDay] || [];

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      >
        <PageHeading
          eyebrow="Weekly Schedule"
          title="Timetable"
          detail="Official SRM AP class schedule and room details."
        />

        {/* Day Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
          {DAYS.map((day) => {
            const isActive = activeDay === day.key;
            const isToday = todayKey === day.key;
            return (
              <TouchableOpacity
                key={day.key}
                onPress={() => setActiveDay(day.key)}
                activeOpacity={0.7}
                style={[
                  styles.tabItem,
                  isActive && styles.tabItemActive,
                ]}
              >
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{day.label}</Text>
                {isToday && <View style={styles.todayDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Classes List */}
        {activeDaySlots.length === 0 ? (
          <Card style={styles.emptyCard}>
            <CalendarDays size={32} color={colors.mutedForeground} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyTitle}>No classes scheduled for {activeDay.toUpperCase()}.</Text>
            <Text style={styles.emptySub}>Enjoy your study break or focus on self-directed tasks.</Text>
          </Card>
        ) : (
          activeDaySlots.map((slot, idx) => {
            if (!slot) return null;
            return (
              <Card key={idx} style={styles.slotCard}>
                <View style={styles.slotHeader}>
                  <Text style={styles.subjectCode}>{slot?.subjectCode || 'CLASS'}</Text>
                  <View style={styles.hourBadge}>
                    <Text style={styles.hourText}>H{slot?.hour || idx + 1} • {slot?.type || 'LECTURE'}</Text>
                  </View>
                </View>

                <Text style={styles.subjectName}>{slot?.subjectName || slot?.subjectCode || 'Course Session'}</Text>

                {(slot?.startTime || slot?.endTime) && (
                  <View style={styles.timeRow}>
                    <Clock size={13} color={colors.accent} style={{ marginRight: 6 }} />
                    <Text style={styles.timeText}>{slot?.startTime || ''}{slot?.endTime ? ` - ${slot.endTime}` : ''}</Text>
                  </View>
                )}

                <View style={styles.slotFooter}>
                  {!!slot?.room && (
                    <View style={styles.footerItem}>
                      <MapPin size={13} color={colors.accent} style={{ marginRight: 4 }} />
                      <Text style={styles.roomText}>{slot.room}</Text>
                    </View>
                  )}
                  {!!slot?.faculty && (
                    <View style={styles.footerItem}>
                      <User size={13} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                      <Text style={styles.facultyText}>{slot.faculty}</Text>
                    </View>
                  )}
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { padding: spacing.lg, paddingBottom: 40 },
    tabsScroll: { marginBottom: spacing.md },
    tabsContent: { flexDirection: 'row', gap: 8 },
    tabItem: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    tabItemActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabLabel: { fontFamily: typography.sans.bold, fontSize: 13, color: colors.mutedForeground },
    tabLabelActive: { color: colors.primaryForeground },
    todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent },
    emptyCard: { padding: 30, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontFamily: typography.sans.bold, fontSize: 14, color: colors.foreground, textAlign: 'center' },
    emptySub: { fontFamily: typography.sans.regular, fontSize: 12, color: colors.mutedForeground, marginTop: 4, textAlign: 'center' },
    slotCard: { padding: 14, marginBottom: 12 },
    slotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    subjectCode: { fontFamily: typography.sans.bold, fontSize: 12, color: colors.accent, textTransform: 'uppercase' },
    hourBadge: { backgroundColor: `${colors.primary}1F`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    hourText: { fontFamily: typography.sans.bold, fontSize: 10, color: colors.primary },
    subjectName: { fontFamily: typography.sans.bold, fontSize: 15, color: colors.foreground, marginBottom: 6 },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    timeText: { fontFamily: typography.sans.medium, fontSize: 12, color: colors.foreground },
    slotFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingTop: 10, borderTopWidth: 1, borderTopColor: `${colors.cardBorder}80` },
    footerItem: { flexDirection: 'row', alignItems: 'center' },
    roomText: { fontFamily: typography.sans.bold, fontSize: 12, color: colors.foreground },
    facultyText: { fontFamily: typography.sans.regular, fontSize: 12, color: colors.mutedForeground },
  });
