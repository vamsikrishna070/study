import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function Button({
  children,
  variant = 'primary',
  onPress,
  disabled,
  loading,
  style,
  textStyle
}) {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);

  const getVariantStyles = () => {
    switch (variant) {
      case 'quiet':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: colors.foreground }
        };
      case 'outline':
        return {
          button: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 },
          text: { color: colors.foreground }
        };
      case 'danger':
        return {
          button: { backgroundColor: `${colors.destructive}1A` },
          text: { color: colors.destructive }
        };
      case 'primary':
      default:
        return {
          button: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground }
        };
    }
  };

  const vStyles = getVariantStyles();

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        vStyles.button,
        (disabled || loading) && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={vStyles.text.color} size="small" />
      ) : (
        <View style={styles.contentContainer}>
          {React.Children.map(children, child => {
            if (typeof child === 'string' || typeof child === 'number') {
              return <Text style={[styles.baseText, vStyles.text, textStyle]}>{child}</Text>;
            }
            return child;
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: radii.xl,
    minHeight: 48,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseText: {
    fontFamily: typography.sans.bold,
    fontSize: 14,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  }
});
