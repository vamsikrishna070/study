import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

export const typography = {
  sans: { regular: 'Manrope_400Regular', medium: 'Manrope_500Medium', semiBold: 'Manrope_600SemiBold', bold: 'Manrope_700Bold', extraBold: 'Manrope_800ExtraBold' },
  serif: { medium: 'Newsreader_500Medium', semiBold: 'Newsreader_600SemiBold' },
  mono: { regular: 'DMMono_400Regular', medium: 'DMMono_500Medium' },
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 20, xl: 28, xxl: 36 };
export const radii = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, round: 9999 };

const lightColors = {
  background: '#f0ece3', foreground: '#232e43', primary: '#293656', primaryForeground: '#f8f6f0',
  accent: '#df6b47', card: '#fbfaf8', cardBorder: '#e0dac8', muted: '#e7e2d8', mutedForeground: '#69758b', destructive: '#c92c2b'
};

// Export these immediately to prevent circular dependency ReferenceErrors in Hermes
export const colors = lightColors; 
export const theme = { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, ...lightColors } };


const darkColors = {
  background: '#121212', foreground: '#e0e0e0', primary: '#a3b8cc', primaryForeground: '#121212',
  accent: '#df6b47', card: '#1e1e1e', cardBorder: '#333333', muted: '#2c2c2c', mutedForeground: '#888888', destructive: '#ff5252'
};

const defaultFonts = {
  bodyMedium: { fontFamily: typography.sans.medium },
  bodyLarge: { fontFamily: typography.sans.regular },
  labelLarge: { fontFamily: typography.sans.bold },
  titleLarge: { fontFamily: typography.sans.bold },
  titleMedium: { fontFamily: typography.sans.semiBold },
  titleSmall: { fontFamily: typography.sans.medium },
  headlineMedium: { fontFamily: typography.serif.medium },
  headlineSmall: { fontFamily: typography.serif.medium },
};

const paperLightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: lightColors.primary, onPrimary: lightColors.primaryForeground, secondary: lightColors.accent,
    background: lightColors.background, surface: lightColors.card, onSurface: lightColors.foreground,
    error: lightColors.destructive, outline: lightColors.cardBorder,
  },
  fonts: { ...MD3LightTheme.fonts, ...defaultFonts },
};

const paperDarkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: darkColors.primary, onPrimary: darkColors.primaryForeground, secondary: darkColors.accent,
    background: darkColors.background, surface: darkColors.card, onSurface: darkColors.foreground,
    error: darkColors.destructive, outline: darkColors.cardBorder,
  },
  fonts: { ...MD3DarkTheme.fonts, ...defaultFonts },
};

const lightThemeObj = { isDark: false, toggleTheme: () => {}, colors: lightColors, typography, spacing, radii, theme: paperLightTheme };
const darkThemeObj = { isDark: true, toggleTheme: () => {}, colors: darkColors, typography, spacing, radii, theme: paperDarkTheme };

let currentGlobalTheme = lightThemeObj;

export const ThemeContext = createContext(lightThemeObj);

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('theme').then(val => {
      setIsDark(val === 'dark');
      setIsLoaded(true);
    });
  }, []);

  const toggleTheme = (val) => {
    const nextDark = val !== undefined ? val : !isDark;
    setIsDark(nextDark);
    AsyncStorage.setItem('theme', nextDark ? 'dark' : 'light');
  };

  const currentThemeData = isDark ? darkThemeObj : lightThemeObj;
  
  // Update global reference for Proxy access
  currentGlobalTheme = { ...currentThemeData, toggleTheme };

  return (
    <ThemeContext.Provider value={currentGlobalTheme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => {
  const context = useContext(ThemeContext);
  return context || lightThemeObj;
};

export const useStyles = (styleFactory) => {
  const themeData = useAppTheme();
  return React.useMemo(() => styleFactory(themeData), [themeData?.isDark, styleFactory]);
};