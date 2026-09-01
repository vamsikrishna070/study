import 'react-native-gesture-handler';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useFonts, Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { Newsreader_500Medium, Newsreader_600SemiBold } from '@expo-google-fonts/newsreader';
import { DMMono_400Regular, DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { StudySessionProvider } from './src/context/StudySessionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useAppTheme } from './src/theme/theme';
import { DialogProvider } from './src/components/ui/AppDialog';
import { AppUpdateProvider } from './src/context/AppUpdateContext';
import { Provider as PaperProvider } from 'react-native-paper';

import AppLockProvider from './src/context/AppLockContext';
import { AppLockScreen } from './src/screens/settings/AppLockScreen';

import { StatusBar } from 'expo-status-bar';

import { ErrorBoundary } from './src/components/ErrorBoundary';

const MainApp = () => {
  const { colors, theme, isDark } = useAppTheme();
  return (
    <PaperProvider theme={theme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <DialogProvider>
        <AppUpdateProvider>
          <AppLockProvider>
            <AuthProvider>
              <StudySessionProvider>
                <AppNavigator />
                <AppLockScreen />
              </StudySessionProvider>
            </AuthProvider>
          </AppLockProvider>
        </AppUpdateProvider>
      </DialogProvider>
    </PaperProvider>
  );
};

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold,
    Newsreader_500Medium, Newsreader_600SemiBold,
    DMMono_400Regular, DMMono_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f0ece3', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#182031" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <MainApp />
        </ErrorBoundary>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
