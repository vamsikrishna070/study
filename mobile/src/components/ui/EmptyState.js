import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function EmptyState({ icon: Icon, title, detail, action, style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconWrapper}>
        {Icon && <Icon size={24} color={colors.primary} />}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.detail}>{detail}</Text>
      {action && <View style={styles.actionWrapper}>{action}</View>}
    </View>
  );
}

const styles = useStyles(({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    backgroundColor: `${colors.card}80`, // 50% opacity hex
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderStyle: 'dashed',
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    textAlign: 'center',
  },
  detail: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    lineHeight: 22,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  actionWrapper: {
    marginTop: spacing.lg,
  }
}));
