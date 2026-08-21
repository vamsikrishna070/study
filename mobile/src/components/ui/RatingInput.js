import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';

const RATING_LABELS = {
  0: 'Not rated',
  1: 'Not great',
  2: 'Okay',
  3: 'Useful',
  4: 'Very useful',
  5: 'Essential',
};

export function RatingInput({
  value = 0,
  onValueChange,
  showLabel = true,
  maxStars = 5,
  style,
}) {
  const { colors, typography, spacing } = useAppTheme();
  const styles = useStyles(createStyles);

  const numValue = Number(value) || 0;

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {Array.from({ length: maxStars }).map((_, index) => {
          const starNumber = index + 1;
          const isFilled = starNumber <= numValue;
          return (
            <TouchableOpacity
              key={starNumber}
              onPress={() => onValueChange(starNumber === numValue ? 0 : starNumber)}
              activeOpacity={0.7}
              style={styles.starBtn}
            >
              <Star
                size={26}
                color={isFilled ? '#eab308' : colors.cardBorder}
                fill={isFilled ? '#eab308' : 'transparent'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
      {showLabel && (
        <Text style={styles.labelText}>
          {RATING_LABELS[numValue] || `${numValue} Stars`}
        </Text>
      )}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing }) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
    },
    starsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    starBtn: {
      padding: 4,
    },
    labelText: {
      fontFamily: typography.sans.medium,
      fontSize: 13,
      color: colors.mutedForeground,
    },
  });
