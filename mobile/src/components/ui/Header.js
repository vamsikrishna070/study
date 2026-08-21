import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { Menu, Target, ArrowLeft } from 'lucide-react-native';
import { useNavigation, DrawerActions, useRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthContext } from '../../context/AuthContext';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';

const getInitials = (name) => {
  if (!name || typeof name !== 'string') {
    return 'U';
  }

  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
};

export const Header = ({ showBack }) => {
  const { colors } = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useContext(AuthContext);
  const insets = useSafeAreaInsets();

  // If a screen is nested (like Subjects -> Tasks), it will pass a subjectId or similar.
  // We should show a back button instead of a hamburger menu to avoid Drawer errors.
  const shouldShowBack = showBack !== undefined ? showBack : !!route.params?.subjectId;

  const ProfileAvatar = () => {
    if (user?.profileImageUrl) {
      return (
        <View style={styles.avatarContainer}>
          <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
        </View>
      );
    }
    return (
      <View style={[styles.avatarContainer, styles.avatarPlaceholder]}>
        <Text style={styles.avatarText}>
          {getInitials(user?.name)}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
      <View style={styles.headerContent}>
        {/* LEFT SECTION */}
        <View style={styles.leftSection}>
          <TouchableOpacity 
            onPress={() => {
              if (shouldShowBack) {
                if (navigation.canGoBack()) navigation.goBack();
              } else {
                if (typeof navigation.openDrawer === 'function') {
                  navigation.openDrawer();
                } else {
                  navigation.dispatch(DrawerActions.openDrawer());
                }
              }
            }} 
            style={styles.menuBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel={shouldShowBack ? "Go back" : "Open navigation menu"}
          >
            {shouldShowBack ? <ArrowLeft size={26} color={colors.foreground} /> : <Menu size={26} color={colors.foreground} />}
          </TouchableOpacity>
        </View>

        {/* CENTER SECTION */}
        <View style={styles.centerSection}>
          <View style={styles.brandContainer}>
            <View style={styles.logoIcon}>
              <Target size={18} color={colors.primaryForeground} />
            </View>
            <Text style={styles.brandText}>StudyArena</Text>
          </View>
        </View>

        {/* RIGHT SECTION */}
        <View style={styles.rightSection}>
          <TouchableOpacity 
            style={styles.profileBtn}
            onPress={() => navigation.navigate('Settings')}
            accessibilityLabel="Profile settings"
          >
            <ProfileAvatar />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = useStyles(({ colors, typography, spacing, radii }) => StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56, // Standard mobile header height
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
    alignItems: 'flex-start', // Keep visual alignment to the left edge but provide touch area
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
    alignItems: 'flex-end', // Keep visual alignment to the right edge
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
}));
