import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { ArrowLeft, Menu } from 'lucide-react-native';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { useAppTheme, useStyles } from '../../theme/theme';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'S';
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('');
};

const openNearestDrawer = (navigation) => {
  if (!navigation) return;

  try {
    const appDrawer = navigation.getParent('AppDrawer');
    if (appDrawer) {
      if (typeof appDrawer.openDrawer === 'function') {
        appDrawer.openDrawer();
        return;
      }
      appDrawer.dispatch(DrawerActions.openDrawer());
      return;
    }
  } catch (_) {}

  let nav = navigation;
  while (nav) {
    if (typeof nav.openDrawer === 'function') {
      nav.openDrawer();
      return;
    }
    const parent = typeof nav.getParent === 'function' ? nav.getParent() : null;
    if (parent && parent !== nav) {
      nav = parent;
    } else {
      break;
    }
  }

  if (nav) {
    try {
      nav.dispatch(DrawerActions.openDrawer());
    } catch (_) {}
  }
};

export const ScreenHeader = ({
  title,
  showBack,
  showDrawer = false,
  showMenu = false,
  onBack,
  onDrawerPress,
  onMenuPress,
  rightElement,
  showProfile = true,
  onProfilePress,
}) => {
  const { colors, typography } = useAppTheme();
  const styles = useStyles(createStyles);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useContext(AuthContext);

  const isDrawerMode = Boolean(showDrawer || showMenu);
  const isBackMode = showBack !== undefined ? Boolean(showBack) : !isDrawerMode;

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else if (typeof navigation.navigate === 'function') {
      try {
        navigation.navigate('DrawerRoot');
      } catch (_) {}
    }
  };

  const handleDrawer = () => {
    if (onDrawerPress) {
      onDrawerPress();
    } else if (onMenuPress) {
      onMenuPress();
    } else {
      openNearestDrawer(navigation);
    }
  };

  const handleProfile = () => {
    if (onProfilePress) {
      onProfilePress();
    } else if (typeof navigation.navigate === 'function') {
      try {
        navigation.navigate('Profile');
      } catch (_) {
        try {
          navigation.navigate('Settings');
        } catch (_) {}
      }
    }
  };

  const displayName = user?.displayName || user?.officialName || user?.name || 'Student';

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          {isDrawerMode ? (
            <TouchableOpacity
              onPress={handleDrawer}
              style={styles.actionBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Open sidebar menu"
            >
              <Menu size={22} color={colors.foreground} />
            </TouchableOpacity>
          ) : isBackMode ? (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.actionBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityLabel="Go back"
            >
              <ArrowLeft size={22} color={colors.foreground} />
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        <View style={styles.centerSection}>
          {title ? (
            <Text style={styles.headerTitle} numberOfLines={1} ellipsizeMode="tail">
              {title}
            </Text>
          ) : null}
        </View>

        <View style={styles.rightSection}>
          {rightElement ? (
            rightElement
          ) : showProfile ? (
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={handleProfile}
              accessibilityLabel="Profile"
              activeOpacity={0.8}
            >
              {user?.profileImageUrl ? (
                <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, typography, radii }) =>
  StyleSheet.create({
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
      paddingHorizontal: 16,
    },
    leftSection: {
      minWidth: 76,
      height: 48,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    centerSection: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    rightSection: {
      minWidth: 76,
      height: 48,
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    actionBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontFamily: typography.sans.bold,
      fontSize: 17,
      color: colors.foreground,
      textAlign: 'center',
    },
    placeholder: {
      width: 44,
      height: 44,
    },
    profileBtn: {
      width: 44,
      height: 44,
      justifyContent: 'center',
      alignItems: 'flex-end',
    },
    avatarImage: {
      width: 36,
      height: 36,
      borderRadius: 18,
    },
    avatarPlaceholder: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontFamily: typography.sans.bold,
      fontSize: 13,
      color: colors.primaryForeground,
    },
  });

export default ScreenHeader;
