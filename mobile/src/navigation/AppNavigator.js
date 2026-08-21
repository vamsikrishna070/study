import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import { AuthContext } from '../context/AuthContext';
import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import { useAppTheme } from '../theme/theme';

const AppNavigator = () => {
  const { colors, theme, typography } = useAppTheme();
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const navTheme = {
    dark: theme.dark,
    colors: {
      primary: colors.primary,
      background: colors.background,
      card: colors.card,
      text: colors.foreground,
      border: colors.cardBorder,
      notification: colors.accent,
    },
    fonts: {
      regular: { fontFamily: typography.sans.regular, fontWeight: 'normal' },
      medium: { fontFamily: typography.sans.medium, fontWeight: '500' },
      bold: { fontFamily: typography.sans.bold, fontWeight: 'bold' },
      heavy: { fontFamily: typography.sans.extraBold, fontWeight: '900' },
    },
  };

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

export default AppNavigator;
