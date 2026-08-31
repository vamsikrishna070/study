import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Clock, MapPin, User } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { getPortalStatus } from '../../api/portal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SLOTS = [
  "09:00 - 09:50", "10:00 - 10:50", "11:00 - 11:50", "12:00 - 12:50",
  "01:00 - 01:50", "02:00 - 02:50", "03:00 - 03:50", "04:00 - 04:50"
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const PortalTimetableScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDay, setSelectedDay] = useState('Monday');

  useEffect(() => {
    (async () => {
      try {
        const res = await getPortalStatus();
        setData(res);
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

      {/* Day Tabs */}
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

      {/* Slots Stack */}
      <View style={styles.slotStack}>
        {SLOTS.map((slotTime, idx) => {
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
                <Text style={styles.freeText}>Free Slot</Text>
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
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.accent,
    },
    title: {
      fontFamily: typography.serif.bold,
      fontSize: 24,
      color: colors.foreground,
      marginBottom: spacing.md,
    },
    tabScroll: {
      marginBottom: spacing.md,
    },
    dayTab: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      marginRight: spacing.xs,
    },
    dayTabActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dayTabText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    dayTabTextActive: {
      color: colors.accentForeground,
    },
    slotStack: {
      gap: spacing.sm,
    },
    slotCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.lg,
      padding: spacing.md,
    },
    slotCardFree: {
      backgroundColor: colors.card + '50',
      borderStyle: 'dashed',
    },
    slotHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 4,
    },
    slotTimeText: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      color: colors.accent,
    },
    slotBody: {
      gap: 2,
    },
    subjectText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    infoText: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
    },
    freeText: {
      fontFamily: typography.mono.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      fontStyle: 'italic',
      marginTop: 2,
    },
  });

export default PortalTimetableScreen;
