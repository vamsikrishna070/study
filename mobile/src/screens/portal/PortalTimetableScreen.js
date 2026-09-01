import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Clock, MapPin, User } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { getPortalStatus } from '../../api/portal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TIMETABLE_HOURS = {
  1: { startTime: '09:00', endTime: '09:50' },
  2: { startTime: '10:00', endTime: '10:50' },
  3: { startTime: '11:00', endTime: '11:50' },
  4: { startTime: '12:00', endTime: '12:50' },
  5: { startTime: '13:00', endTime: '13:50' },
  6: { startTime: '14:00', endTime: '14:50' },
  7: { startTime: '15:00', endTime: '15:50' },
  8: { startTime: '16:00', endTime: '17:30' },
};

const SLOTS = [
  "H1 • 09:00 - 09:50",
  "H2 • 10:00 - 10:50",
  "H3 • 11:00 - 11:50",
  "H4 • 12:00 - 12:50",
  "H5 • 13:00 - 13:50",
  "H6 • 14:00 - 14:50",
  "H7 • 15:00 - 15:50",
  "H8 • 16:00 - 17:30",
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PortalTimetableScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayName = dayNames[new Date().getDay()];
  const initialDay = DAYS.includes(todayName) ? todayName : 'Monday';
  const [selectedDay, setSelectedDay] = useState(initialDay);

  useEffect(() => {
    (async () => {
      try {
        const res = await getPortalStatus();
        const payload = res?.data ?? res ?? {};
        setData(payload);
      } catch (err) {
        console.error('[PortalTimetableScreen] Error:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const timetable = data?.timetable || [];
  const subjectsMap = data?.subjects || [];

  const currentDayData = timetable.find((d) => d.day?.toLowerCase() === selectedDay.toLowerCase()) || { subjects: [] };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: Math.max(insets.top, 16) + spacing.md,
          paddingBottom: Math.max(insets.bottom, 20) + 80,
        }
      ]}
    >
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={16} color={colors.accent} />
          <Text style={styles.backBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Weekly Timetable</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
        {DAYS.map((day) => {
          const isActive = selectedDay === day;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayTab, isActive && styles.dayTabActive]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayTabText, isActive && styles.dayTabTextActive]}>{day}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.slotStack}>
        {SLOTS.map((slotTime, idx) => {
          const hourNum = idx + 1;
          const subStr = currentDayData.subjects[idx];
          const matchedDetail = subjectsMap.find((s) => subStr && subStr.includes(s.code));

          return (
            <View key={idx} style={[styles.slotCard, !subStr && styles.slotCardFree]}>
              <View style={styles.slotHeader}>
                <Clock size={12} color={colors.accent} />
                <Text style={styles.slotTimeText}>{slotTime}</Text>
              </View>

              {subStr ? (
                <View style={styles.slotBody}>
                  <Text style={styles.subjectText}>{subStr}</Text>
                  {matchedDetail?.faculty && (
                    <View style={styles.infoRow}>
                      <User size={12} color={colors.mutedForeground} />
                      <Text style={styles.infoText}>{matchedDetail.faculty}</Text>
                    </View>
                  )}
                  {matchedDetail?.classrooms && (
                    <View style={styles.infoRow}>
                      <MapPin size={12} color={colors.accent} />
                      <Text style={[styles.infoText, { color: colors.accent, fontWeight: 'bold' }]}>
                        {matchedDetail.classrooms}
                      </Text>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={styles.freeText}>FREE SLOT (H{hourNum})</Text>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.md,
    },
    centerContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    headerContainer: {
      marginBottom: spacing.md,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: spacing.xs,
    },
    backBtnText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.accent,
    },
    title: {
      fontFamily: typography.serif.bold,
      fontSize: 22,
      color: colors.foreground,
    },
    tabScroll: {
      marginBottom: spacing.md,
    },
    dayTab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs + 2,
      borderRadius: radii.md,
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      marginRight: spacing.xs,
    },
    dayTabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dayTabText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
    },
    dayTabTextActive: {
      color: colors.accentForeground,
      fontFamily: typography.sans.bold,
    },
    slotStack: {
      gap: spacing.sm,
    },
    slotCard: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
      borderWidth: 1,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    slotCardFree: {
      opacity: 0.7,
      borderStyle: 'dashed',
    },
    slotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginBottom: spacing.xs,
    },
    slotTimeText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.accent,
    },
    slotBody: {
      marginTop: 2,
    },
    subjectText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
      marginBottom: 4,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    infoText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    freeText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
      fontStyle: 'italic',
    },
  });

export default PortalTimetableScreen;
