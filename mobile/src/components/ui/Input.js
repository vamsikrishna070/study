import React, { useState } from 'react';
import { TextInput as RNTextInput, StyleSheet, View, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function Input({ 
  secureTextEntry, 
  style, 
  error,
  ...props 
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);

  return (
    <View style={[
      styles.container, 
      isFocused && styles.focused,
      error && styles.error,
      style
    ]}>
      <RNTextInput
        style={[styles.input, secureTextEntry && { paddingRight: 40 }]}
        placeholderTextColor={colors.mutedForeground}
        secureTextEntry={isSecure}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        {...props}
      />
      {secureTextEntry && (
        <TouchableOpacity 
          style={styles.iconContainer} 
          onPress={() => setIsSecure(!isSecure)}
          activeOpacity={0.7}
        >
          {isSecure ? (
            <EyeOff size={20} color={colors.mutedForeground} />
          ) : (
            <Eye size={20} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = useStyles(({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
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
    paddingVertical: 10,
    fontFamily: typography.sans.regular,
    fontSize: 14,
    color: colors.foreground,
  },
  iconContainer: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
  }
}));
