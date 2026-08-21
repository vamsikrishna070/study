import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { Menu, Target, ArrowLeft } from 'lucide-react-native';
import { useNavigation, DrawerActions, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') return 'U';
  return name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
};

export const Header = ({ showBack, navigation: customNavigation }) => {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);
  
  const hookNavigation = useNavigation();
  const navigation = customNavigation || hookNavigation;
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  const shouldShowBack = showBack !== undefined ? showBack : !!route.params?.subjectId;

  const handleLeftButtonPress = () => {
    if (shouldShowBack) {
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
      return;
    }

    // 1. Direct drawer method on current navigation object
    if (typeof navigation.openDrawer === 'function') {
      navigation.openDrawer();
      return;
    }

    // 2. Named drawer navigator by ID ('AppDrawer')
    if (typeof navigation.getParent === 'function') {
      const drawerById = navigation.getParent('AppDrawer');
      if (drawerById && typeof drawerById.openDrawer === 'function') {
        drawerById.openDrawer();
        return;
      }

      // 3. Parent chain traversal checking for openDrawer function
      let parent = navigation.getParent();
      while (parent) {
        if (typeof parent.openDrawer === 'function') {
          parent.openDrawer();
          return;
        }
        parent = typeof parent.getParent === 'function' ? parent.getParent() : null;
      }

      // 4. Try dispatching DrawerActions on parent chain
      let dispatchParent = navigation.getParent();
      while (dispatchParent) {
        try {
          dispatchParent.dispatch(DrawerActions.openDrawer());
          return;
        } catch (_) {}
        dispatchParent = typeof dispatchParent.getParent === 'function' ? dispatchParent.getParent() : null;
      }
    }

    // 5. Fallback: if not inside a drawer and can go back, go back safely
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  const handleProfilePress = () => {
    if (typeof navigation.navigate === 'function') {
      navigation.navigate('Settings');
    }
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        <View style={styles.leftSection}>
          <TouchableOpacity 
            onPress={handleLeftButtonPress} 
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={shouldShowBack ? "Go back" : "Open navigation menu"}
          >
            {shouldShowBack ? <ArrowLeft size={26} color={colors.foreground} /> : <Menu size={26} color={colors.foreground} />}
          </TouchableOpacity>
        </View>

        <View style={styles.centerSection}>
          <View style={styles.brandContainer}>
            <View style={styles.logoIcon}>
              <Target size={18} color={colors.primaryForeground} />
            </View>
            <Text style={styles.brandText}>StudyArena</Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={styles.profileBtn}
            onPress={handleProfilePress}
            accessibilityLabel="Profile settings"
          >
            {user?.profileImageUrl ? (
              <View style={styles.avatarContainer}>
                <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
              </View>
            ) : (
              <View style={[styles.avatarContainer, styles.avatarPlaceholder]}>
                <Text style={styles.avatarText}>
                  {getInitials(user?.name)}
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
    height: 56,
    paddingHorizontal: spacing.lg,
  },
  leftSection: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
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
    width: 28,
    height: 28,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  brandText: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  profileBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '33', 
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: typography.sans.bold,
    fontSize: 14,
    color: colors.primary,
  },
});
