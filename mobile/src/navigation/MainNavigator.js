import React, { useContext } from 'react';
import { Dimensions } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { LayoutDashboard, BookOpen, ListChecks, CalendarDays, Award } from 'lucide-react-native';
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

import StartSessionScreen from '../screens/study/StartSessionScreen';
import FocusSessionScreen from '../screens/study/FocusSessionScreen';
import EndSessionScreen from '../screens/study/EndSessionScreen';
import LogSessionScreen from '../screens/study/LogSessionScreen';
import StudyHistoryScreen from '../screens/study/StudyHistoryScreen';
import StudyAnalyticsScreen from '../screens/study/StudyAnalyticsScreen';

import PortalDashboardScreen from '../screens/portal/PortalDashboardScreen';
import AttendanceScreen from '../screens/attendance/AttendanceScreen';
import TimetableScreen from '../screens/timetable/TimetableScreen';
import PortalExamsScreen from '../screens/portal/PortalExamsScreen';
import PortalResultsScreen from '../screens/portal/PortalResultsScreen';
import PortalCalendarScreen from '../screens/portal/PortalCalendarScreen';

import Sidebar from '../components/navigation/Sidebar';

const Tab = createBottomTabNavigator();
const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();
const PortalStack = createStackNavigator();
const { width } = Dimensions.get('window');

const PortalStackNavigator = () => {
  return (
    <PortalStack.Navigator screenOptions={{ headerShown: false }} initialRouteName="PortalDashboardMain">
      <PortalStack.Screen name="PortalDashboardMain" component={PortalDashboardScreen} />
      <PortalStack.Screen name="PortalAttendance" component={AttendanceScreen} />
      <PortalStack.Screen name="PortalTimetable" component={TimetableScreen} />
      <PortalStack.Screen name="PortalExams" component={PortalExamsScreen} />
      <PortalStack.Screen name="PortalResults" component={PortalResultsScreen} />
      <PortalStack.Screen name="PortalCalendar" component={PortalCalendarScreen} />
    </PortalStack.Navigator>
  );
};

const TabNavigator = () => {
  const { colors, typography } = useAppTheme();
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
          else if (route.name === 'ScheduleTab') IconComponent = CalendarDays;
          else if (route.name === 'SubjectsTab') IconComponent = BookOpen;
          else if (route.name === 'TasksTab') IconComponent = ListChecks;
          else if (route.name === 'ExamsTab') IconComponent = Award;

          return <IconComponent size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="OverviewTab" component={DashboardScreen} options={{ title: 'Overview' }} />
      <Tab.Screen name="ScheduleTab" component={TimetableScreen} options={{ title: 'Schedule' }} />
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
      <Drawer.Screen name="PortalDashboard" component={PortalStackNavigator} />
      <Drawer.Screen name="Schedule" component={TimetableScreen} />
      <Drawer.Screen name="Attendance" component={AttendanceScreen} />
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
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="Tasks" component={TasksScreen} />
      <Stack.Screen name="Exams" component={ExamsScreen} />
      <Stack.Screen name="Notes" component={NotesScreen} />

      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Reminders" component={RemindersScreen} />
      <Stack.Screen name="Syllabus" component={SyllabusScreen} />
      <Stack.Screen name="Resources" component={ResourcesScreen} />
      <Stack.Screen name="Progress" component={ProgressScreen} />

      <Stack.Screen name="StartSession" component={StartSessionScreen} />
      <Stack.Screen name="FocusSession" component={FocusSessionScreen} />
      <Stack.Screen name="EndSession" component={EndSessionScreen} />
      <Stack.Screen name="LogSession" component={LogSessionScreen} />
      <Stack.Screen name="StudyAnalytics" component={StudyAnalyticsScreen} />
    </Stack.Navigator>
  );
};

export default MainNavigator;
