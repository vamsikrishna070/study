import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ArrowLeft, Calendar as CalendarIcon, PartyPopper } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';
import { getAcademicCalendar } from '../../api/portal';
import { ScreenHeader } from '../../components/ui/ScreenHeader';

const PortalCalendarScreen = ({ navigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('odd');

  useEffect(() => {
    (async () => {
      try {
        const res = await getAcademicCalendar();
        setData(res);
      } catch (err) {
        console.error('[PortalCalendarScreen] Error:', err);
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

  const events =
    activeTab === 'odd'
      ? data?.oddSemesterData || []
      : activeTab === 'even'
      ? data?.evenSemesterData || []
      : data?.summerTermData || [];

  const holidays = activeTab === 'odd' ? data?.oddSemesterHolidays || [] : data?.evenSemesterHolidays || [];

  return (
    <View style={styles.container}>
      <ScreenHeader title="Academic Calendar" showBack={true} />
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent, 
          { 
            paddingBottom: 100,
          }
        ]}
      >
        <Text style={styles.title}>Academic Calendar</Text>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'odd' && styles.tabBtnActive]}
          onPress={() => setActiveTab('odd')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'odd' && styles.tabBtnTextActive]}>Odd Sem</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'even' && styles.tabBtnActive]}
          onPress={() => setActiveTab('even')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'even' && styles.tabBtnTextActive]}>Even Sem</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'summer' && styles.tabBtnActive]}
          onPress={() => setActiveTab('summer')}
        >
          <Text style={[styles.tabBtnText, activeTab === 'summer' && styles.tabBtnTextActive]}>Summer</Text>
        </TouchableOpacity>
      </View>

      {/* Events */}
      <Text style={styles.sectionTitle}>SEMESTER EVENTS ({events.length})</Text>
      <View style={styles.stack}>
        {events.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.itemTitle}>{item.details}</Text>
              <Text style={styles.dateTag}>{item.date}</Text>
            </View>
            <Text style={styles.itemDay}>{item.day}</Text>
          </View>
        ))}
      </View>

      {/* Holidays */}
      {holidays.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>HOLIDAYS ({holidays.length})</Text>
          <View style={styles.stack}>
            {holidays.map((h) => (
              <View key={h.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={[styles.itemTitle, { color: '#f59e0b' }]}>{h.occasion}</Text>
                  <Text style={styles.dateTag}>{h.date}</Text>
                </View>
                <Text style={styles.itemDay}>{h.day}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
    </View>
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
    tabRow: {
      flexDirection: 'row',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: spacing.xs,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: colors.card,
      alignItems: 'center',
    },
    tabBtnActive: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    tabBtnText: {
      fontFamily: typography.sans.bold,
      fontSize: 12,
      color: colors.mutedForeground,
    },
    tabBtnTextActive: {
      color: colors.accentForeground,
    },
    sectionTitle: {
      fontFamily: typography.mono.regular,
      fontSize: 10,
      letterSpacing: 1.5,
      color: colors.mutedForeground,
      marginBottom: spacing.sm,
    },
    stack: {
      gap: spacing.xs,
    },
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      borderRadius: radii.md,
      padding: spacing.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: spacing.xs,
    },
    itemTitle: {
      flex: 1,
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.foreground,
    },
    dateTag: {
      fontFamily: typography.mono.bold,
      fontSize: 11,
      color: colors.accent,
    },
    itemDay: {
      fontFamily: typography.sans.regular,
      fontSize: 10,
      color: colors.mutedForeground,
      marginTop: 2,
    },
  });

export default PortalCalendarScreen;
