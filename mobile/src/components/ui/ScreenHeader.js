import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme, useStyles } from '../../theme/theme';

export const ScreenHeader = ({ title, showBack = true, onBack, rightElement }) => {
  const { colors, typography, spacing } = useAppTheme();
  const styles = useStyles(createStyles);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: Math.max(insets.top, spacing.xs) }]}>
      <View style={styles.headerContent}>
        {showBack ? (
          <TouchableOpacity 
            onPress={handleBack} 
            style={styles.backBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={24} color={colors.foreground} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
          {title}
        </Text>

        {rightElement ? (
          <View style={styles.rightSection}>{rightElement}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing }) => StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 56,
    paddingHorizontal: spacing.md,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    textAlign: 'center',
    flex: 1,
  },
  rightSection: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 40,
  },
});
