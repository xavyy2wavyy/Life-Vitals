import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme definitions
export const lightTheme = {
  mode: 'light' as const,
  // Primary Purple shades
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryBg: '#EDE9FE',
  
  // Secondary Green shades
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  secondaryBg: '#D1FAE5',
  
  // Backgrounds & Cards
  background: '#F9FAFB',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  
  // Text colors
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Border
  border: '#E5E7EB',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Mood colors
  moodGreat: '#10B981',
  moodGood: '#34D399',
  moodOkay: '#FBBF24',
  moodBad: '#F97316',
  moodTerrible: '#EF4444',
  
  // Category colors
  health: '#EC4899',
  personal: '#8B5CF6',
  productivity: '#3B82F6',
  work: '#F59E0B',
  school: '#6366F1',
  vanity: '#EC4899',
  
  // Modal overlay
  overlay: 'rgba(0,0,0,0.5)',
  
  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
};

export const darkTheme = {
  mode: 'dark' as const,
  // Primary Purple shades (brighter for dark mode)
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryBg: 'rgba(139, 92, 246, 0.15)',
  
  // Secondary Green shades
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  secondaryBg: 'rgba(16, 185, 129, 0.15)',
  
  // Backgrounds & Cards (iPhone-style dark)
  background: '#1C1C1E',
  card: '#2C2C2E',
  cardElevated: '#3A3A3C',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textLight: '#8E8E93',
  textInverse: '#1F2937',
  
  // Border
  border: '#3A3A3C',
  
  // Status colors
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  info: '#64D2FF',
  
  // Mood colors
  moodGreat: '#30D158',
  moodGood: '#34D399',
  moodOkay: '#FFD60A',
  moodBad: '#FF9F0A',
  moodTerrible: '#FF453A',
  
  // Category colors
  health: '#FF375F',
  personal: '#BF5AF2',
  productivity: '#64D2FF',
  work: '#FFD60A',
  school: '#5E5CE6',
  vanity: '#FF375F',
  
  // Modal overlay
  overlay: 'rgba(0,0,0,0.7)',
  
  // Tab bar
  tabBarBackground: '#1C1C1E',
  tabBarBorder: '#3A3A3C',
};

export type Theme = typeof lightTheme;
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@life_vitals_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark'); // Default to dark

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        setThemeModeState(savedTheme);
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  const toggleTheme = () => {
    const newMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(newMode);
  };

  const theme = themeMode === 'dark' ? darkTheme : lightTheme;
  
  const contextValue = { theme, themeMode, toggleTheme, setThemeMode };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Shadow definitions that work in both themes
export const getShadows = (theme: Theme) => ({
  small: {
    shadowColor: theme.mode === 'dark' ? '#000' : '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.mode === 'dark' ? 0.3 : 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: theme.mode === 'dark' ? '#000' : '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: theme.mode === 'dark' ? '#000' : '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.mode === 'dark' ? 0.5 : 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
});
