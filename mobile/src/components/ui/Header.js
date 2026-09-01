import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { Menu, Target, ArrowLeft } from 'lucide-react-native';
import { useNavigation, DrawerActions, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { useAppTheme, useStyles } from '../../theme/theme';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'S';
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
};

export const Header = ({ showBack, navigation: customNavigation }) => {
  const { colors, typography, spacing, radii } = useAppTheme();
  const styles = useStyles(createStyles);

  const hookNavigation = useNavigation();
  const navigation = customNavigation || hookNavigation;
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const shouldShowBack = showBack !== undefined ? showBack : Boolean(route.params?.subjectId);

  const handleLeftButtonPress = () => {
    if (shouldShowBack) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return;
    }

    if (typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
      return;
    }

    if (typeof navigation.getParent === 'function') {
      const drawerById = navigation.getParent('AppDrawer');
      if (drawerById && typeof drawerById.openDrawer === 'function') {
        drawerById.openDrawer();
        return;
      }

      let parent = navigation.getParent();
      while (parent) {
        if (typeof parent.openDrawer === 'function') {
          parent.openDrawer();
          return;
        }
        parent = typeof parent.getParent === 'function' ? parent.getParent() : null;
      }

      let dispatchParent = navigation.getParent();
      while (dispatchParent) {
        try {
          dispatchParent.dispatch(DrawerActions.openDrawer());
          return;
        } catch (_) {}
        dispatchParent = typeof dispatchParent.getParent === 'function' ? dispatchParent.getParent() : null;
      }
    }

    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleProfilePress = () => {
    if (typeof navigation.navigate === 'function') {
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
          <TouchableOpacity
            onPress={handleLeftButtonPress}
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={shouldShowBack ? 'Go back' : 'Open navigation menu'}
          >
            {shouldShowBack ? <ArrowLeft size={22} color={colors.foreground} /> : <Menu size={22} color={colors.foreground} />}
          </TouchableOpacity>
        </View>

        <View style={styles.centerSection}>
          <View style={styles.brandContainer}>
            <View style={styles.logoIcon}>
              <Target size={16} color={colors.primaryForeground} />
            </View>
            <Text style={styles.brandText}>StudyArena</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={handleProfilePress}
            accessibilityLabel="Profile"
            activeOpacity={0.8}
          >
            {user?.profileImageUrl ? (
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {getInitials(displayName)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
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
    width: 48,
    height: 48,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    width: 48,
    height: 48,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoIcon: {
    width: 26,
    height: 26,
    borderRadius: radii.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.xs + 2,
  },
  brandText: {
    fontFamily: typography.serif.medium,
    fontSize: 19,
    color: colors.foreground,
    letterSpacing: -0.5,
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

export default Header;
