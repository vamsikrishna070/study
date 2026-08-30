import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, Image } from 'react-native';
import { 
  Target, 
  ChevronRight, 
  LayoutDashboard, 
  BookOpen, 
  ListChecks, 
  CalendarDays, 
  LogOut,
  FileStack,
  FileText,
  Library,
  Bell,
  TrendingUp,
  Settings,
  Timer,
  RotateCcwClock,
  GraduationCap
} from 'lucide-react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import { DrawerActions } from '@react-navigation/native';
import { AuthContext } from '../../context/AuthContext';
import { typography, spacing, radii, useAppTheme, useStyles } from '../../theme/theme';
import { isSrmApStudent } from '../../utils/srmAp';

const navItems = [
  { href: 'OverviewTab', label: 'Overview', icon: LayoutDashboard },
  { href: 'PortalDashboard', label: 'SRM Portal', icon: GraduationCap },
  { href: 'StudySessions', label: 'Study Sessions', icon: Timer },
  { href: 'SubjectsTab', label: 'Subjects', icon: BookOpen },
  { href: 'Syllabus', label: 'Syllabus', icon: FileStack },
  { href: 'Notes', label: 'Notes', icon: FileText },
  { href: 'Resources', label: 'Resources', icon: Library },
  { href: 'TasksTab', label: 'Tasks', icon: ListChecks },
  { href: 'ExamsTab', label: 'Exams', icon: CalendarDays },
  { href: 'StudyHistory', label: 'Study History', icon: RotateCcwClock },
  { href: 'Reminders', label: 'Reminders', icon: Bell },
  { href: 'Progress', label: 'Progress', icon: TrendingUp },
];

const Sidebar = (props) => {
  const { colors, typography, spacing, radii, theme } = useAppTheme();
  const styles = useStyles(createStyles);
  const { state, navigation } = props;
  const { user, logout } = useContext(AuthContext);

  // Only show SRM Portal to SRM AP students
  const visibleNavItems = navItems.filter(
    (item) => item.href !== 'PortalDashboard' || isSrmApStudent(user)
  );

  const tabScreens = ['OverviewTab', 'SubjectsTab', 'TasksTab', 'ExamsTab'];

  const handleNavigation = (routeName) => {
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    } else {
      navigation.dispatch(DrawerActions.closeDrawer());
    }

    if (tabScreens.includes(routeName)) {
      navigation.navigate('HomeDrawer', {
        screen: routeName,
      });
    } else {
      navigation.navigate(routeName);
    }
  };

  const handleLogout = async () => {
    if (typeof navigation.closeDrawer === 'function') {
      navigation.closeDrawer();
    }
    await logout();
  };

  return (
    <View style={styles.container}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scrollContent}>
        
        {/* Brand Header */}
        <TouchableOpacity 
          style={styles.brandContainer} 
          onPress={() => handleNavigation('OverviewTab')}
          accessibilityLabel="StudyArena Home"
        >
          <View style={styles.logoIcon}>
            <Target size={19} color={colors.primaryForeground} />
          </View>
          <View>
            <Text style={styles.brandTitle}>StudyArena</Text>
            <Text style={styles.brandSubtitle}>FOCUS, THEN FLOW</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>WORKSPACE</Text>

        <View style={styles.navSection}>
          {visibleNavItems.map((item) => {
            const isActive = false;

            return (
              <TouchableOpacity
                key={item.href}
                style={[styles.navItem, isActive && styles.navItemActive]}
                onPress={() => handleNavigation(item.href)}
                accessibilityLabel={`Navigate to ${item.label}`}
              >
                <item.icon size={17} color={isActive ? colors.primary : colors.mutedForeground} style={{ opacity: isActive ? 1 : 0.75 }} />
                <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>{item.label}</Text>
                {isActive && <ChevronRight size={14} color={colors.mutedForeground} style={{ marginLeft: 'auto', opacity: 0.6 }} />}
              </TouchableOpacity>
            );
          })}
        </View>

      </DrawerContentScrollView>

      {/* Footer / Profile */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.profileBtn}
          onPress={() => handleNavigation('Settings')}
          accessibilityLabel="Settings"
        >
          {user?.profileImageUrl ? (
            <View style={styles.avatarContainer}>
              <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
            </View>
          ) : (
            <View style={[styles.avatarContainer, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>
                {user?.name?.split(' ').map(p => p[0]).join('').slice(0, 2) || 'U'}
              </Text>
            </View>
          )}
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>{user?.name || 'Student'}</Text>
            <Text style={styles.profileDegree} numberOfLines={1}>
              {user?.degree || 'Degree'} {user?.branch ? `/ ${user.branch}` : ''}
            </Text>
          </View>
          <Settings size={15} color={colors.mutedForeground} style={{ opacity: 0.6 }} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityLabel="Log out"
        >
          <LogOut size={15} color={colors.mutedForeground} style={{ opacity: 0.6 }} />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const createStyles = ({ colors, typography, spacing, radii }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.xs,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  brandTitle: {
    fontFamily: typography.serif.medium,
    fontSize: 20,
    color: colors.foreground,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontFamily: typography.mono.regular,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    color: colors.mutedForeground,
    marginTop: 2,
    opacity: 0.55,
  },
  sectionHeader: {
    fontFamily: typography.mono.regular,
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 2,
    color: colors.mutedForeground,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
    opacity: 0.45,
  },
  navSection: {
    marginBottom: spacing.lg,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: colors.accent + '33',
  },
  navLabel: {
    fontFamily: typography.sans.semiBold,
    fontSize: 14,
    color: colors.foreground,
    marginLeft: spacing.sm,
    opacity: 0.65,
  },
  navLabelActive: {
    color: colors.foreground,
    opacity: 1,
  },
  footer: {
    padding: spacing.md,
    paddingTop: spacing.lg,
  },
  profileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.accent + '20',
    marginBottom: spacing.sm,
  },
  avatarContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    overflow: 'hidden',
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: colors.primary + '33', 
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
  },
  avatarText: {
    fontFamily: typography.sans.bold,
    fontSize: 12,
    color: colors.primary,
  },
  profileInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  profileName: {
    fontFamily: typography.sans.medium,
    fontSize: 14,
    color: colors.foreground,
  },
  profileDegree: {
    fontFamily: typography.sans.regular,
    fontSize: 10,
    color: colors.mutedForeground,
    opacity: 0.5,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.lg,
  },
  logoutText: {
    fontFamily: typography.sans.medium,
    fontSize: 14,
    color: colors.mutedForeground,
    marginLeft: spacing.sm,
    opacity: 0.7,
  }
});

export default Sidebar;
