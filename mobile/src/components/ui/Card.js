import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { typography, radii, spacing, useAppTheme, useStyles } from '../../theme/theme';

export function Card({ 
  children, 
  title, 
  eyebrow, 
  style, 
  onPress 
}) {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);

  const Container = onPress ? TouchableOpacity : View;
  
  return (
    <Container 
      style={[styles.card, style]} 
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      {(title || eyebrow) && (
        <View style={styles.header}>
          {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
          {title && <Text style={styles.title}>{title}</Text>}
        </View>
      )}
      <View style={styles.content}>
        {children}
      </View>
    </Container>
  );
}

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.md,
  },
  eyebrow: {
    fontFamily: typography.mono.medium,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 2.2,
    color: colors.accent,
  },
  title: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    marginTop: 4,
  },
  content: {
    // Content takes the rest
  }
});
