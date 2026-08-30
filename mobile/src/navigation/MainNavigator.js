import React, { useContext } from 'react';
import { Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { LayoutDashboard, BookOpen, ListChecks, CalendarDays } from 'lucide-react-native';
import { typography, useAppTheme } from '../theme/theme';
import { AuthContext } from '../context/AuthContext';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import SubjectsScreen from '../screens/subjects/SubjectsScreen';
import SubjectDetailScreen from '../screens/subjects/SubjectDetailScreen';
import TasksScreen from '../screens/tasks/TasksScreen';
import ExamsScreen from '../screens/exams/ExamsScreen';
import NotesScreen from '../screens/notes/NotesScreen';

import SyllabusScreen from '../screens/syllabus/SyllabusScreen';
import ResourcesScreen from '../screens/resources/ResourcesScreen';
import RemindersScreen from '../screens/reminders/RemindersScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

// Study Sessions Feature
import StartSessionScreen from '../screens/study/StartSessionScreen';
import FocusSessionScreen from '../screens/study/FocusSessionScreen';
import EndSessionScreen from '../screens/study/EndSessionScreen';
import LogSessionScreen from '../screens/study/LogSessionScreen';
import StudyHistoryScreen from '../screens/study/StudyHistoryScreen';
import StudyAnalyticsScreen from '../screens/study/StudyAnalyticsScreen';

// SRM Portal Screens
import PortalDashboardScreen from '../screens/portal/PortalDashboardScreen';
import PortalAttendanceScreen from '../screens/portal/PortalAttendanceScreen';
import PortalTimetableScreen from '../screens/portal/PortalTimetableScreen';
import PortalExamsScreen from '../screens/portal/PortalExamsScreen';
import PortalResultsScreen from '../screens/portal/PortalResultsScreen';
import PortalCalendarScreen from '../screens/portal/PortalCalendarScreen';

import Sidebar from '../components/navigation/Sidebar';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
const { width } = Dimensions.get('window');

const TabNavigator = () => {
  const { colors, theme, typography } = useAppTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: `${colors.card}F2`,
          borderTopColor: colors.cardBorder,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarLabelStyle: {
          fontFamily: typography.sans.bold,
          fontSize: 10,
        },
        tabBarIcon: ({ color }) => {
          let IconComponent = LayoutDashboard;
          if (route.name === 'OverviewTab') IconComponent = LayoutDashboard;
          else if (route.name === 'SubjectsTab') IconComponent = BookOpen;
          else if (route.name === 'TasksTab') IconComponent = ListChecks;
          else if (route.name === 'ExamsTab') IconComponent = CalendarDays;
          
          return <IconComponent size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="OverviewTab" component={DashboardScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="SubjectsTab" component={SubjectsScreen} options={{ title: 'Subjects' }} />
      <Tab.Screen name="TasksTab" component={TasksScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="ExamsTab" component={ExamsScreen} options={{ title: 'Exams' }} />
    </Tab.Navigator>
  );
};

const DrawerNavigator = () => {
  return (
    <Drawer.Navigator 
      id="AppDrawer"
      drawerContent={(props) => <Sidebar {...props} />}
      screenOptions={{ 
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          width: width * 0.8,
        },
        overlayColor: 'rgba(0,0,0,0.5)',
      }}
    >
      <Drawer.Screen name="HomeDrawer" component={TabNavigator} />
      <Drawer.Screen name="PortalDashboard" component={PortalDashboardScreen} />
      <Drawer.Screen name="PortalAttendance" component={PortalAttendanceScreen} />
      <Drawer.Screen name="PortalTimetable" component={PortalTimetableScreen} />
      <Drawer.Screen name="PortalExams" component={PortalExamsScreen} />
      <Drawer.Screen name="PortalResults" component={PortalResultsScreen} />
      <Drawer.Screen name="PortalCalendar" component={PortalCalendarScreen} />
      <Drawer.Screen name="StudySessions" component={StartSessionScreen} />
      <Drawer.Screen name="StudyHistory" component={StudyHistoryScreen} />
      <Drawer.Screen name="StudyAnalytics" component={StudyAnalyticsScreen} />
      <Drawer.Screen name="Syllabus" component={SyllabusScreen} />
      <Drawer.Screen name="Notes" component={NotesScreen} />
      <Drawer.Screen name="Resources" component={ResourcesScreen} />
      <Drawer.Screen name="Reminders" component={RemindersScreen} />
      <Drawer.Screen name="Progress" component={ProgressScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Profile" component={ProfileScreen} />
    </Drawer.Navigator>
  );
};

const MainNavigator = () => {
  const { isNewRegistration } = useContext(AuthContext);

  return (
    <Stack.Navigator 
      initialRouteName={isNewRegistration ? 'Onboarding' : 'DrawerRoot'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="DrawerRoot" component={DrawerNavigator} />
      <Stack.Screen name="Onboarding" component={OnboardingScreen} />
      <Stack.Screen name="PortalDashboard" component={PortalDashboardScreen} />
      <Stack.Screen name="PortalAttendance" component={PortalAttendanceScreen} />
      <Stack.Screen name="PortalTimetable" component={PortalTimetableScreen} />
      <Stack.Screen name="PortalExams" component={PortalExamsScreen} />
      <Stack.Screen name="PortalResults" component={PortalResultsScreen} />
      <Stack.Screen name="PortalCalendar" component={PortalCalendarScreen} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Exams" component={ExamsScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />
      
      {/* App Workspace & Management Screens */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Syllabus" component={SyllabusScreen} />
      <Stack.Screen name="Resources" component={ResourcesScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />

      {/* Study Sessions Flow */}
      <Stack.Screen name="StartSession" component={StartSessionScreen} />
      <Stack.Screen name="FocusSession" component={FocusSessionScreen} />
      <Stack.Screen name="EndSession" component={EndSessionScreen} />
      <Stack.Screen name="LogSession" component={LogSessionScreen} />
      <Stack.Screen name="StudyHistory" component={StudyHistoryScreen} />
      <Stack.Screen name="StudyAnalytics" component={StudyAnalyticsScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
