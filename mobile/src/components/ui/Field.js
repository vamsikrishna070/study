import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStyles } from '../../theme/theme';

export function Field({ label, hint, children, style }) {
  const styles = useStyles(createStyles);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      {children}
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: typography.mono.medium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: colors.mutedForeground,
    marginBottom: spacing.xs,
  },
  hint: {
    fontFamily: typography.sans.regular,
    fontSize: 12,
    color: colors.mutedForeground,
    marginTop: spacing.xs,
  }
});
