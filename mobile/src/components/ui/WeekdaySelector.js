import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme, useStyles } from '../../theme/theme';

const DAYS = [
  { label: 'M', fullLabel: 'Mon', value: 1 },
  { label: 'T', fullLabel: 'Tue', value: 2 },
  { label: 'W', fullLabel: 'Wed', value: 3 },
  { label: 'T', fullLabel: 'Thu', value: 4 },
  { label: 'F', fullLabel: 'Fri', value: 5 },
  { label: 'S', fullLabel: 'Sat', value: 6 },
  { label: 'S', fullLabel: 'Sun', value: 0 },
];

export function WeekdaySelector({
  value = [], // Array of day numbers [0-6]
  onValueChange,
  style,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const selectedDays = Array.isArray(value) ? value : [];

  const toggleDay = (dayVal) => {
    let next;
    if (selectedDays.includes(dayVal)) {
      next = selectedDays.filter((d) => d !== dayVal);
    } else {
      next = [...selectedDays, dayVal].sort((a, b) => a - b);
    }
    onValueChange?.(next);
  };

  return (
    <View style={[styles.container, style]}>
      {DAYS.map((day) => {
        const isSelected = selectedDays.includes(day.value);
        return (
          <TouchableOpacity
            key={day.value}
            style={[styles.dayPill, isSelected && styles.selectedDayPill]}
            onPress={() => toggleDay(day.value)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.dayLabel,
                isSelected && styles.selectedDayLabel,
              ]}
            >
              {day.fullLabel}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      paddingVertical: spacing.xs,
    },
    dayPill: {
      flex: 1,
      minWidth: 40,
      height: 38,
      borderRadius: radii.md,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectedDayPill: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    dayLabel: {
      fontFamily: typography.mono.medium,
      fontSize: 11,
      color: colors.mutedForeground,
      textTransform: 'uppercase',
    },
    selectedDayLabel: {
      color: '#ffffff',
      fontFamily: typography.mono.medium,
    },
  });
