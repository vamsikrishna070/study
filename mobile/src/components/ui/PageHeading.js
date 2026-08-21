import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function PageHeading({ eyebrow, title, detail, action, style }) {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);

  return (
    <View style={[styles.container, style]}>
      <View style={styles.textContainer}>
        {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
        <Text style={styles.title}>{title}</Text>
        {detail && <Text style={styles.detail}>{detail}</Text>}
      </View>
      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  textContainer: {
    flex: 1,
  },
  eyebrow: {
    fontFamily: typography.mono.medium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    color: colors.accent,
    marginBottom: spacing.xs,
  },
  title: {
    fontFamily: typography.serif.medium,
    fontSize: 28,
    lineHeight: 34,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  detail: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 24,
    color: colors.mutedForeground,
    marginTop: spacing.sm,
  },
  actionContainer: {
    marginTop: spacing.lg,
  }
});
