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
import { ScreenHeader } from '../../components/ui/ScreenHeader';
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

const HOUR_SLOTS = [
  { hour: 1, startTime: '09:00', endTime: '09:50' },
  { hour: 2, startTime: '10:00', endTime: '10:50' },
  { hour: 3, startTime: '11:00', endTime: '11:50' },
  { hour: 4, startTime: '12:00', endTime: '12:50' },
  { hour: 5, startTime: '13:00', endTime: '13:50' },
  { hour: 6, startTime: '14:00', endTime: '14:50' },
  { hour: 7, startTime: '15:00', endTime: '15:50' },
  { hour: 8, startTime: '16:00', endTime: '16:50' },
  { hour: 9, startTime: '17:00', endTime: '17:50' },
  { hour: 10, startTime: '18:00', endTime: '18:50' },
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

  const getISTTime = () => {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (3600000 * 5.5));
  };

  const getISTTimeStr = (d) => {
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const timetableMap = data?.timetable || {};
  const activeDaySlots = timetableMap[activeDay] || [];

  const fullDaySlots = HOUR_SLOTS.map((slotInfo) => {
    const matchedClass = activeDaySlots.find((s) => s.hour === slotInfo.hour);
    if (matchedClass) {
      return { ...matchedClass, isClass: true };
    }
    return {
      hour: slotInfo.hour,
      startTime: slotInfo.startTime,
      endTime: slotInfo.endTime,
      isClass: false,
    };
  });

  const getSlotStatus = (slot, allSlots) => {
    if (activeDay !== todayKey) return null;

    const istNow = getISTTime();
    const currentStr = getISTTimeStr(istNow);

    const startVal = slot.startTime.replace(':', '');
    const endVal = slot.endTime.replace(':', '');
    const nowVal = currentStr.replace(':', '');

    if (nowVal > endVal) {
      return 'COMPLETED';
    }

    if (nowVal >= startVal && nowVal <= endVal) {
      return 'CURRENT';
    }

    const nextClasses = allSlots.filter((s) => {
      if (!s.isClass) return false;
      const sVal = s.startTime.replace(':', '');
      return sVal > nowVal;
    });

    if (nextClasses.length > 0 && nextClasses[0].hour === slot.hour) {
      return 'NEXT';
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <ScreenHeader title="Weekly Timetable" showBack={true} />
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
          fullDaySlots.map((slot, idx) => {
            if (!slot) return null;
            
            const status = getSlotStatus(slot, fullDaySlots);
            const isCompleted = status === 'COMPLETED';

            if (!slot.isClass) {
              return (
                <View key={idx} style={styles.freeSlotCard}>
                  <View style={styles.freeSlotRow}>
                    <Text style={styles.freeSlotHour}>H{slot.hour}</Text>
                    <Text style={styles.freeSlotTime}>{slot.startTime} - {slot.endTime}</Text>
                    <Text style={styles.freeSlotText}>FREE SLOT</Text>
                  </View>
                </View>
              );
            }

            return (
              <Card key={idx} style={[styles.slotCard, isCompleted && { opacity: 0.55 }, status === 'CURRENT' && styles.slotCardCurrent]}>
                <View style={styles.slotHeader}>
                  <Text style={styles.subjectCode}>{slot?.subjectCode || 'CLASS'}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                    {status === 'CURRENT' && (
                      <View style={[styles.statusBadge, styles.statusCurrent]}>
                        <Text style={styles.statusCurrentText}>CURRENT CLASS</Text>
                      </View>
                    )}
                    {status === 'NEXT' && (
                      <View style={[styles.statusBadge, styles.statusNext]}>
                        <Text style={styles.statusNextText}>NEXT CLASS</Text>
                      </View>
                    )}
                    {status === 'COMPLETED' && (
                      <Text style={styles.completedText}>COMPLETED</Text>
                    )}
                    <View style={styles.hourBadge}>
                      <Text style={styles.hourText}>H{slot?.hour} • {slot?.type || 'LECTURE'}</Text>
                    </View>
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
                  {!!slot?.facultyCabin?.location && (
                    <View style={styles.footerItem}>
                      <MapPin size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                      <Text style={styles.roomText}>Cabin: {slot.facultyCabin.location}</Text>
                    </View>
                  )}
                  {!!slot?.faculty && (
                    <View style={styles.footerItem}>
                      <User size={13} color={colors.mutedForeground} style={{ marginRight: 4 }} />
                      <Text style={styles.facultyText}>
                        {slot.faculty}{slot.facultyId ? ` (ID: ${slot.facultyId})` : ''}
                      </Text>
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
    scroll: { padding: spacing.lg, paddingBottom: 100 },
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
    slotCardCurrent: { borderColor: colors.accent, borderWidth: 1 },
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
    
    // Status Badges
    statusBadge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
    statusCurrent: {
      backgroundColor: '#10B9811A',
      borderColor: '#10B98140',
      borderWidth: 1,
    },
    statusCurrentText: {
      fontFamily: typography.mono.bold,
      fontSize: 8,
      color: '#10B981',
    },
    statusNext: {
      backgroundColor: '#3B82F61A',
      borderColor: '#3B82F640',
      borderWidth: 1,
    },
    statusNextText: {
      fontFamily: typography.mono.bold,
      fontSize: 8,
      color: '#3B82F6',
    },
    completedText: {
      fontFamily: typography.mono.bold,
      fontSize: 8,
      color: colors.mutedForeground,
      backgroundColor: colors.muted,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },

    // Free Slot Cards
    freeSlotCard: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      marginBottom: 10,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderStyle: 'dashed',
      backgroundColor: 'transparent',
    },
    freeSlotRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    freeSlotHour: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.mutedForeground,
      width: 30,
    },
    freeSlotTime: {
      fontFamily: typography.sans.medium,
      fontSize: 11,
      color: colors.mutedForeground,
      flex: 1,
      marginLeft: 10,
    },
    freeSlotText: {
      fontFamily: typography.mono.bold,
      fontSize: 9,
      letterSpacing: 1,
      color: colors.mutedForeground,
      backgroundColor: colors.muted,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 4,
    },
  });
