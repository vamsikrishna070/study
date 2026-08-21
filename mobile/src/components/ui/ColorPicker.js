import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';

export const SUBJECT_COLORS = [
  '#d46c52',
  '#4b8f8b',
  '#b58a4a',
  '#7382a5',
  '#8d6b8d',
  '#78936f',
];

export function ColorPicker({
  value,
  onValueChange,
  colors = SUBJECT_COLORS,
  style,
}) {
  const { spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  return (
    <View style={[styles.container, style]}>
      {colors.map((color) => {
        const isSelected = value === color;
        return (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorSwatch,
              { backgroundColor: color },
              isSelected && styles.selectedSwatch,
            ]}
            onPress={() => onValueChange(color)}
            activeOpacity={0.8}
          >
            {isSelected && <Check size={16} color="#ffffff" strokeWidth={3} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const createStyles = ({ colors, spacing, radii }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    colorSwatch: {
      width: 38,
      height: 38,
      borderRadius: radii.round,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    selectedSwatch: {
      borderColor: colors.foreground,
      transform: [{ scale: 1.1 }],
    },
  });
