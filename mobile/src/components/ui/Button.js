import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
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
      case 'quiet':
        return {
          button: { backgroundColor: 'transparent' },
          text: { color: colors.foreground },
        };
      case 'outline':
        return {
          button: { backgroundColor: colors.card, borderColor: colors.cardBorder, borderWidth: 1 },
          text: { color: colors.foreground },
        };
      case 'danger':
        return {
          button: { backgroundColor: `${colors.destructive}1A`, borderColor: `${colors.destructive}33`, borderWidth: 1 },
          text: { color: colors.destructive },
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
          button: { paddingVertical: 6, paddingHorizontal: 10, minHeight: 34, borderRadius: radii.md },
          text: { fontSize: 12 },
        };
      case 'lg':
        return {
          button: { paddingVertical: 14, paddingHorizontal: spacing.lg, minHeight: 52, borderRadius: radii.xl },
          text: { fontSize: 15 },
        };
      case 'md':
      default:
        return {
          button: { paddingVertical: 12, paddingHorizontal: spacing.md, minHeight: 48, borderRadius: radii.xl },
          text: { fontSize: 14 },
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
              return <Text style={[styles.baseText, sStyles.text, vStyles.text, textStyle]}>{child}</Text>;
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
    contentContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    baseText: {
      fontFamily: typography.sans.bold,
      textAlign: 'center',
    },
    disabled: {
      opacity: 0.5,
    },
  });
