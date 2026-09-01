import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { MapPin, User, Clock, BookOpen, Coffee, Smile } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getTimetableData } from '../../api/portal';
import { useAppTheme, useStyles } from '../../theme/theme';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

const TIMETABLE_HOURS = {
  1: { startTime: '09:00', endTime: '09:50', displayHour: '09:00' },
  2: { startTime: '10:00', endTime: '10:50', displayHour: '10:00' },
  3: { startTime: '11:00', endTime: '11:50', displayHour: '11:00' },
  4: { startTime: '12:00', endTime: '12:50', displayHour: '12:00' },
  5: { startTime: '13:00', endTime: '13:50', displayHour: '01:00' },
  6: { startTime: '14:00', endTime: '14:50', displayHour: '02:00' },
  7: { startTime: '15:00', endTime: '15:50', displayHour: '03:00' },
  8: { startTime: '16:00', endTime: '17:30', displayHour: '04:00' },
};

const DAYS = [
  { key: 'monday', label: 'MON', full: 'Monday' },
  { key: 'tuesday', label: 'TUE', full: 'Tuesday' },
  { key: 'wednesday', label: 'WED', full: 'Wednesday' },
  { key: 'thursday', label: 'THU', full: 'Thursday' },
  { key: 'friday', label: 'FRI', full: 'Friday' },
  { key: 'saturday', label: 'SAT', full: 'Saturday' },
];

const JS_DAY_MAP = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function timeToMin(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getISTNow() {
  const now = new Date();
  return new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (5.5 * 3600000));
}

function formatAmPm(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${suffix}`;
}

function formatRange(startStr, endStr) {
  if (!startStr || !endStr) return '';
  return `${startStr} - ${endStr}`;
}

export default function TimetableScreen() {
  const { colors, typography: typo, spacing } = useAppTheme();
  const styles = useStyles(createStyles);
  const insets = useSafeAreaInsets();

  const todayKey = JS_DAY_MAP[new Date().getDay()];
  const initialDay = DAYS.some((d) => d.key === todayKey) ? todayKey : 'monday';

  const [activeDay, setActiveDay] = useState(initialDay);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setError(false);
      const res = await getTimetableData();
      setData(res?.data ?? res ?? {});
    } catch (_) {
      if (!data) setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const { syncPortalData } = require('../../api/portal');
      await syncPortalData();
    } catch (_) {}
    await loadData();
  }, [loadData]);

  const switchDay = useCallback((key) => {
    if (key === activeDay) return;
    setActiveDay(key);
  }, [activeDay]);

  const timetableMap = useMemo(() => {
    const p = data?.data ?? data ?? {};
    return p?.timetable || {};
  }, [data]);

  const fullDaySlots = useMemo(() => {
    const daySlots = [...(timetableMap[activeDay] || [])].sort((a, b) => a.hour - b.hour);
    const slots = [];
    for (let h = 1; h <= 8; h++) {
      const t = TIMETABLE_HOURS[h];
      const cls = daySlots.find((s) => Number(s.hour) === h);
      if (cls) {
        slots.push({
          ...cls,
          hour: h,
          displayHour: t.displayHour,
          startTime: cls.startTime || t.startTime,
          endTime: cls.endTime || t.endTime,
          isClass: true,
        });
      } else {
        slots.push({
          hour: h,
          displayHour: t.displayHour,
          startTime: t.startTime,
          endTime: t.endTime,
          isClass: false,
        });
      }
    }
    return slots;
  }, [timetableMap, activeDay]);

  const istNow = getISTNow();
  const nowMin = istNow.getHours() * 60 + istNow.getMinutes();
  const isToday = activeDay === todayKey;

  const getStatus = useCallback((slot) => {
    if (!slot.isClass || !isToday) return null;
    const s = timeToMin(slot.startTime);
    const e = timeToMin(slot.endTime);
    if (nowMin > e) return 'COMPLETED';
    if (nowMin >= s && nowMin <= e) return 'NOW';
    const next = fullDaySlots.find((x) => x.isClass && timeToMin(x.startTime) > nowMin);
    if (next && next.hour === slot.hour) return 'NEXT';
    return null;
  }, [isToday, nowMin, fullDaySlots]);

  const classCount = fullDaySlots.filter((s) => s.isClass).length;
  const freeCount = 8 - classCount;
  const nextSlot = isToday ? fullDaySlots.find((s) => s.isClass && timeToMin(s.startTime) > nowMin) : null;
  const currentSlot = isToday ? fullDaySlots.find((s) => s.isClass && nowMin >= timeToMin(s.startTime) && nowMin <= timeToMin(s.endTime)) : null;

  if (loading) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Schedule" showBack={true} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.skelBlock} />
          <View style={styles.skelDayRow}>
            {[1, 2, 3, 4, 5, 6].map((i) => <View key={i} style={styles.skelDayChip} />)}
          </View>
          <View style={styles.skelSummary} />
          {[1, 2, 3].map((i) => <View key={i} style={styles.skelCard} />)}
        </ScrollView>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Schedule" showBack={true} />
        <View style={styles.errorContainer}>
          <BookOpen size={36} color={colors.mutedForeground} />
          <Text style={styles.errorTitle}>Unable to load timetable</Text>
          <Text style={styles.errorSub}>Please check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData} activeOpacity={0.8}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Schedule" showBack={true} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 16) + 80 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Text style={styles.introEyebrow}>WEEKLY TIMETABLE</Text>
          <Text style={styles.introTitle}>Weekly Timetable</Text>
          <Text style={styles.introSub}>Official SRM AP class schedule and room details.</Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayScroll}
          contentContainerStyle={styles.dayScrollContent}
        >
          {DAYS.map((day) => {
            const active = activeDay === day.key;
            return (
              <TouchableOpacity
                key={day.key}
                onPress={() => switchDay(day.key)}
                activeOpacity={0.75}
                style={[styles.dayChip, active && styles.dayChipActive]}
              >
                <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <View style={styles.summaryCard}>
          <View style={styles.summaryStatsRow}>
            <View style={styles.summaryStatItem}>
              <View style={styles.summaryIconWrapper}>
                <BookOpen size={17} color={colors.accent} />
              </View>
              <View style={styles.summaryStatTextCol}>
                <Text style={styles.summaryCount}>{classCount}</Text>
                <Text style={styles.summaryLabel}>{classCount === 1 ? 'Class' : 'Classes'}</Text>
              </View>
            </View>

            <View style={styles.summaryStatItem}>
              <View style={styles.summaryIconWrapper}>
                <Coffee size={17} color={colors.accent} />
              </View>
              <View style={styles.summaryStatTextCol}>
                <Text style={styles.summaryCount}>{freeCount}</Text>
                <Text style={styles.summaryLabel}>Free Slots</Text>
              </View>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryStatusRow}>
            {currentSlot ? (
              <>
                <Text style={styles.summaryStatusEyebrow}>NOW RUNNING</Text>
                <Text style={styles.summaryStatusTime}>
                  {formatAmPm(currentSlot.startTime)} - {formatAmPm(currentSlot.endTime)}
                </Text>
                <Text style={styles.summaryStatusDetails} numberOfLines={1}>
                  {currentSlot.subjectCode}{currentSlot.room ? ` (${currentSlot.room})` : ''}
                </Text>
              </>
            ) : nextSlot ? (
              <>
                <Text style={styles.summaryStatusEyebrow}>NEXT CLASS</Text>
                <Text style={styles.summaryStatusTime}>{formatAmPm(nextSlot.startTime)}</Text>
                <Text style={styles.summaryStatusDetails} numberOfLines={1}>
                  {nextSlot.subjectCode}{nextSlot.room ? ` (${nextSlot.room})` : ''}
                </Text>
              </>
            ) : classCount > 0 ? (
              <>
                <Text style={styles.summaryStatusEyebrow}>STATUS</Text>
                <Text style={[styles.summaryStatusTime, { color: colors.foreground }]}>Day Complete</Text>
                <Text style={styles.summaryStatusDetails} numberOfLines={1}>All classes finished for today</Text>
              </>
            ) : (
              <>
                <Text style={styles.summaryStatusEyebrow}>STATUS</Text>
                <Text style={[styles.summaryStatusTime, { color: colors.foreground }]}>No Classes Scheduled</Text>
                <Text style={styles.summaryStatusDetails} numberOfLines={1}>Enjoy your free day</Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.timelineSection}>
          {fullDaySlots.map((slot, idx) => {
            const status = getStatus(slot);
            const isNow = status === 'NOW';
            const isDone = status === 'COMPLETED';
            const isFree = !slot.isClass;
            const isLast = idx === fullDaySlots.length - 1;

            const minsLeft = isNow ? timeToMin(slot.endTime) - nowMin : 0;
            const timeRangeText = formatRange(slot.startTime, slot.endTime);
            const subjectHeader = `${slot.subjectCode}${slot.room ? ` (${slot.room})` : ''}`;

            return (
              <View key={slot.hour} style={styles.tlRow}>
                <View style={styles.tlTimeCol}>
                  <Text style={[styles.tlTimeText, isDone && styles.tlTimeTextDone]}>
                    {slot.displayHour}
                  </Text>
                  {isNow && (
                    <View style={styles.nowTimePill}>
                      <Text style={styles.nowTimePillText}>NOW</Text>
                    </View>
                  )}
                </View>

                <View style={styles.tlAxisCol}>
                  <View style={[
                    styles.tlDot,
                    isFree && styles.tlDotFree,
                    isNow && styles.tlDotNow,
                    isDone && styles.tlDotDone,
                  ]} />
                  {!isLast && (
                    <View style={[
                      styles.tlLine,
                      isDone && styles.tlLineDone,
                    ]} />
                  )}
                </View>

                <View style={styles.tlContentCol}>
                  {isFree ? (
                    <View style={styles.freeCard}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.cardHeaderTimeLeft}>
                          <Clock size={12} color={colors.accent} />
                          <Text style={styles.cardHeaderTimeText}>{timeRangeText}</Text>
                        </View>
                        <Smile size={18} color={colors.accent} style={{ opacity: 0.75 }} />
                      </View>
                      <Text style={styles.freeCardTitle}>Free Slot</Text>
                      <Text style={styles.freeCardSub}>No class scheduled</Text>
                    </View>
                  ) : (
                    <View style={[
                      styles.classCard,
                      isNow && styles.classCardNow,
                      isDone && styles.classCardDone,
                    ]}>
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.cardHeaderTimeLeft}>
                          <Clock size={12} color={colors.accent} />
                          <Text style={styles.cardHeaderTimeText}>{timeRangeText}</Text>
                        </View>
                        <View style={styles.badgeRowRight}>
                          {slot.type ? (
                            <View style={[
                              styles.typeBadge,
                              isNow && styles.typeBadgeNow,
                            ]}>
                              <Text style={[
                                styles.typeBadgeText,
                                isNow && styles.typeBadgeTextNow,
                              ]}>
                                {slot.type === 'PRACTICAL' ? 'LAB' : 'LECTURE'}
                              </Text>
                            </View>
                          ) : null}
                          {isDone ? (
                            <View style={styles.completedBadge}>
                              <Text style={styles.completedBadgeText}>COMPLETED</Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <Text style={[styles.classSubjectTitle, isDone && styles.textDone]}>
                        {subjectHeader}
                      </Text>

                      {slot.faculty ? (
                        <View style={styles.classMetaRow}>
                          <User size={13} color={colors.mutedForeground} />
                          <Text style={[styles.classMetaText, isDone && styles.textDone]} numberOfLines={1}>
                            {slot.faculty}
                          </Text>
                        </View>
                      ) : null}

                      <View style={styles.classFooterRow}>
                        {slot.room ? (
                          <View style={styles.classLocationRow}>
                            <MapPin size={13} color={colors.accent} />
                            <Text style={styles.classLocationText}>{slot.room}</Text>
                          </View>
                        ) : <View />}

                        {isNow && minsLeft > 0 ? (
                          <Text style={styles.classMinsLeftText}>
                            {String(minsLeft).padStart(2, '0')} min left
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = ({ isDark, colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: 20,
    },
    introSection: {
      paddingTop: 22,
      paddingBottom: 18,
    },
    introEyebrow: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      letterSpacing: 1.5,
      color: colors.accent,
      marginBottom: 6,
    },
    introTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 26,
      color: colors.foreground,
      letterSpacing: -0.5,
      marginBottom: 5,
    },
    introSub: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      lineHeight: 18,
    },
    dayScroll: {
      marginBottom: 20,
    },
    dayScrollContent: {
      gap: 8,
      paddingRight: 20,
    },
    dayChip: {
      height: 44,
      paddingHorizontal: 16,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 54,
    },
    dayChipActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dayChipText: {
      fontFamily: typography.mono.medium,
      fontSize: 13,
      color: colors.foreground,
    },
    dayChipTextActive: {
      color: '#ffffff',
      fontFamily: typography.mono.bold,
    },
    summaryCard: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 16,
      marginBottom: 22,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 6,
      elevation: 2,
    },
    summaryStatsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
    },
    summaryStatItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    summaryIconWrapper: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: isDark ? 'rgba(223, 107, 71, 0.15)' : '#fdeee9',
      alignItems: 'center',
      justifyContent: 'center',
    },
    summaryStatTextCol: {
      justifyContent: 'center',
    },
    summaryCount: {
      fontFamily: typography.sans.bold,
      fontSize: 18,
      color: colors.foreground,
      lineHeight: 22,
    },
    summaryLabel: {
      fontFamily: typography.sans.regular,
      fontSize: 11,
      color: colors.mutedForeground,
      marginTop: 1,
    },
    summaryDivider: {
      height: 1,
      backgroundColor: colors.cardBorder,
      marginVertical: 12,
      opacity: 0.6,
    },
    summaryStatusRow: {
      paddingHorizontal: 2,
    },
    summaryStatusEyebrow: {
      fontFamily: typography.mono.bold,
      fontSize: 10,
      letterSpacing: 0.8,
      color: colors.accent,
      marginBottom: 2,
    },
    summaryStatusTime: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.accent,
      lineHeight: 20,
    },
    summaryStatusDetails: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.foreground,
      marginTop: 2,
    },
    timelineSection: {
      paddingBottom: 24,
    },
    tlRow: {
      flexDirection: 'row',
      minHeight: 66,
      marginBottom: 12,
    },
    tlTimeCol: {
      width: 54,
      alignItems: 'flex-end',
      paddingRight: 8,
      paddingTop: 4,
    },
    tlTimeText: {
      fontFamily: typography.mono.medium,
      fontSize: 12,
      color: colors.accent,
    },
    tlTimeTextDone: {
      opacity: 0.6,
    },
    nowTimePill: {
      backgroundColor: colors.accent,
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
      marginTop: 3,
      alignSelf: 'flex-end',
    },
    nowTimePillText: {
      fontFamily: typography.mono.bold,
      fontSize: 8,
      color: '#ffffff',
    },
    tlAxisCol: {
      width: 18,
      alignItems: 'center',
      position: 'relative',
    },
    tlDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.accent,
      marginTop: 6,
      zIndex: 2,
    },
    tlDotFree: {
      backgroundColor: colors.background,
      borderWidth: 2,
      borderColor: isDark ? '#5c433b' : '#e8c9be',
    },
    tlDotNow: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.accent,
      marginTop: 5,
    },
    tlDotDone: {
      backgroundColor: isDark ? '#444444' : '#c4bcb0',
    },
    tlLine: {
      position: 'absolute',
      top: 18,
      bottom: -12,
      width: 2,
      backgroundColor: colors.cardBorder,
    },
    tlLineDone: {
      opacity: 0.5,
    },
    tlContentCol: {
      flex: 1,
      paddingLeft: 6,
    },
    freeCard: {
      backgroundColor: isDark ? '#191919' : '#fcfbfa',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.cardBorder,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    cardHeaderTimeLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    cardHeaderTimeText: {
      fontFamily: typography.mono.regular,
      fontSize: 11,
      color: colors.accent,
    },
    badgeRowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    freeCardTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: colors.foreground,
      marginTop: 3,
    },
    freeCardSub: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      marginTop: 2,
    },
    classCard: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 14,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.2 : 0.03,
      shadowRadius: 5,
      elevation: 1,
    },
    classCardNow: {
      borderColor: colors.accent,
      borderWidth: 1.5,
      backgroundColor: isDark ? 'rgba(223, 107, 71, 0.12)' : '#fef7f4',
    },
    classCardDone: {
      backgroundColor: colors.card,
      borderColor: colors.cardBorder,
    },
    textDone: {
      opacity: 0.75,
    },
    typeBadge: {
      backgroundColor: isDark ? 'rgba(223, 107, 71, 0.2)' : '#fdeee9',
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    typeBadgeNow: {
      backgroundColor: colors.accent,
    },
    typeBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 9,
      color: colors.accent,
      letterSpacing: 0.5,
    },
    typeBadgeTextNow: {
      color: '#ffffff',
    },
    completedBadge: {
      backgroundColor: isDark ? '#2a2a2a' : '#ece6db',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 6,
    },
    completedBadgeText: {
      fontFamily: typography.mono.bold,
      fontSize: 8,
      color: colors.mutedForeground,
      letterSpacing: 0.4,
    },
    classSubjectTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 15,
      color: colors.foreground,
      marginTop: 3,
      marginBottom: 6,
    },
    classMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    classMetaText: {
      fontFamily: typography.sans.regular,
      fontSize: 12,
      color: colors.mutedForeground,
      flex: 1,
    },
    classFooterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 2,
    },
    classLocationRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    classLocationText: {
      fontFamily: typography.sans.medium,
      fontSize: 12,
      color: colors.accent,
    },
    classMinsLeftText: {
      fontFamily: typography.mono.medium,
      fontSize: 11,
      color: colors.accent,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    errorTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 17,
      color: colors.foreground,
      marginTop: spacing.md,
    },
    errorSub: {
      fontFamily: typography.sans.regular,
      fontSize: 13,
      color: colors.mutedForeground,
      marginTop: 4,
      textAlign: 'center',
    },
    retryBtn: {
      marginTop: spacing.lg,
      backgroundColor: colors.accent,
      paddingHorizontal: 28,
      paddingVertical: 10,
      borderRadius: radii.md,
    },
    retryBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 14,
      color: '#ffffff',
    },
    skelBlock: {
      height: 70,
      borderRadius: 14,
      backgroundColor: colors.muted,
      marginTop: 22,
      marginBottom: 18,
    },
    skelDayRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 20,
    },
    skelDayChip: {
      width: 54,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.muted,
    },
    skelSummary: {
      height: 110,
      borderRadius: 18,
      backgroundColor: colors.muted,
      marginBottom: 22,
    },
    skelCard: {
      height: 110,
      borderRadius: 18,
      backgroundColor: colors.muted,
      marginBottom: 12,
      opacity: 0.6,
    },
  });
