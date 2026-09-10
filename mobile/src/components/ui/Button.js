import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  onPress,
  disabled,
  loading,
  style,
  textStyle,
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return {
          button: {
            backgroundColor: `${colors.primary}18`,
            borderColor: `${colors.primary}35`,
            borderWidth: 1,
          },
          text: { color: colors.primary },
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderColor: colors.cardBorder,
            borderWidth: 1,
          },
          text: { color: colors.foreground },
        };
      case 'danger':
        return {
          button: {
            backgroundColor: `${colors.destructive}1A`,
            borderColor: `${colors.destructive}33`,
            borderWidth: 1,
          },
          text: { color: colors.destructive },
        };
      case 'ghost':
      case 'quiet':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: colors.foreground },
        };
      case 'primary':
      default:
        return {
          button: { backgroundColor: colors.primary },
          text: { color: colors.primaryForeground },
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          button: {
            height: 36,
            minHeight: 36,
            paddingVertical: 6,
            paddingHorizontal: spacing.md,
            borderRadius: radii.lg,
          },
          text: { fontSize: 12, fontFamily: typography.sans.semiBold },
        };
      case 'lg':
        return {
          button: {
            height: 52,
            minHeight: 52,
            paddingVertical: 14,
            paddingHorizontal: spacing.xl,
            borderRadius: radii.xl,
          },
          text: { fontSize: 15, fontFamily: typography.sans.bold },
        };
      case 'md':
      default:
        return {
          button: {
            height: 48,
            minHeight: 48,
            paddingVertical: 12,
            paddingHorizontal: spacing.lg,
            borderRadius: radii.xl,
          },
          text: { fontSize: 14, fontFamily: typography.sans.bold },
        };
    }
  };

  const vStyles = getVariantStyles();
  const sStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.baseButton,
        sStyles.button,
        vStyles.button,
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={vStyles.text.color} size="small" />
      ) : (
        <View style={styles.contentContainer}>
          {React.Children.map(children, (child) => {
            if (typeof child === 'string' || typeof child === 'number') {
              return (
                <Text style={[styles.baseText, sStyles.text, vStyles.text, textStyle]}>
                  {child}
                </Text>
              );
            }
            return child;
          })}
        </View>
      )}
    </TouchableOpacity>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) =>
  StyleSheet.create({
    baseButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    fullWidth: {
      width: '100%',
    },
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    baseText: {
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
  });

