import React, { useState, useEffect } from 'react';
import { TextInput as RNTextInput, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useAppTheme, useStyles } from '../../theme/theme';

export function Input({ 
  secureTextEntry, 
  style, 
  error,
  ...props 
}) {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(Boolean(secureTextEntry));

  useEffect(() => {
    if (secureTextEntry !== undefined) {
      setIsSecure(Boolean(secureTextEntry));
    }
  }, [secureTextEntry]);

  const toggleSecure = () => {
    setIsSecure((prev) => !prev);
  };

  return (
    <View style={[
      styles.container, 
      isFocused && styles.focused,
      error && styles.error,
      style
    ]}>
      <RNTextInput
        style={[styles.input, secureTextEntry && styles.inputSecure]}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={isSecure}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {secureTextEntry && (
        <TouchableOpacity 
          style={styles.iconContainer} 
          onPress={toggleSecure}
          activeOpacity={0.7}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={isSecure ? "Show password" : "Hide password"}
        >
          {isSecure ? (
            <EyeOff size={18} color={colors.mutedForeground} />
          ) : (
            <Eye size={18} color={colors.primary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    position: 'relative',
  },
  focused: {
    borderColor: colors.accent,
  },
  error: {
    borderColor: colors.destructive,
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.foreground,
  },
  inputSecure: {
    paddingRight: 48,
  },
  iconContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
