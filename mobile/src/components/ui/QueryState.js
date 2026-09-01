import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { X } from 'lucide-react-native';
import { Button } from './Button';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function QueryState({ error, onRetry, label = 'This section' }) {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);

  if (!error) return null;
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <X size={20} color={colors.destructive} />
      </View>
      <Text style={styles.title}>{label} could not load</Text>
      <Text style={styles.detail}>Check your connection and try once more.</Text>
      <Button onPress={onRetry} style={styles.button}>
        Try again
      </Button>
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    backgroundColor: `${colors.destructive}0D`,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: `${colors.destructive}40`,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: radii.round,
    backgroundColor: `${colors.destructive}1A`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: typography.sans.semiBold,
    fontSize: 16,
    color: colors.foreground,
    textAlign: 'center',
  },
  detail: {
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.mutedForeground,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  button: {
    minHeight: 40,
    paddingVertical: 8,
  }
});
