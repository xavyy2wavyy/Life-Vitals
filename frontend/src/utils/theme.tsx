import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Minimal cross-platform Platform shim to avoid importing 'react-native' (only checks for web vs native)
const Platform = { OS: typeof window !== 'undefined' && typeof document !== 'undefined' ? 'web' as const : 'native' as const };

// ============================================
// SPACING & SIZING CONSTANTS (Use these in styles!)
// ============================================

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  huge: 32,
};

// ============================================
// GLOBAL THEME DEFINITIONS
// ============================================

export const lightTheme = {
  mode: 'light' as const,
  
  // Primary colors
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',
  primaryBg: '#EDE9FE',
  
  // Secondary colors (green)
  secondary: '#10B981',
  secondaryLight: '#34D399',
  secondaryDark: '#059669',
  secondaryBg: '#D1FAE5',
  
  // Background colors
  background: '#F9FAFB',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  
  // Text colors
  text: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Border & dividers
  border: '#E5E7EB',
  divider: '#E5E7EB',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // Category colors
  health: '#EC4899',
  personal: '#8B5CF6',
  productivity: '#3B82F6',
  work: '#F59E0B',
  school: '#6366F1',
  vanity: '#EC4899',
  
  // Overlay
  overlay: 'rgba(0,0,0,0.5)',
  
  // Tab bar
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
};

export const darkTheme = {
  mode: 'dark' as const,
  
  // Primary colors (adjusted for dark mode)
  primary: '#A78BFA',
  primaryLight: '#C4B5FD',
  primaryDark: '#8B5CF6',
  primaryBg: 'rgba(167, 139, 250, 0.15)',
  
  // Secondary colors (green - adjusted)
  secondary: '#34D399',
  secondaryLight: '#6EE7B7',
  secondaryDark: '#10B981',
  secondaryBg: 'rgba(52, 211, 153, 0.15)',
  
  // Background colors (iOS-style dark)
  background: '#000000',
  card: '#1C1C1E',
  cardElevated: '#2C2C2E',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#EBEBF5',
  textLight: '#8E8E93',
  textInverse: '#000000',
  
  // Border & dividers
  border: '#38383A',
  divider: '#38383A',
  
  // Status colors (brighter for dark mode)
  success: '#30D158',
  warning: '#FFD60A',
  error: '#FF453A',
  info: '#64D2FF',
  
  // Category colors (adjusted for dark mode)
  health: '#FF375F',
  personal: '#BF5AF2',
  productivity: '#64D2FF',
  work: '#FFD60A',
  school: '#5E5CE6',
  vanity: '#FF375F',
  
  // Overlay
  overlay: 'rgba(0,0,0,0.75)',
  
  // Tab bar
  tabBarBackground: '#1C1C1E',
  tabBarBorder: '#38383A',
};

export type Theme = typeof lightTheme | typeof darkTheme;
export type ThemeMode = 'light' | 'dark';

// ============================================
// THEME CONTEXT
// ============================================

interface ThemeContextType {
  theme: Theme;
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = '@life_vitals_theme';

// Simple storage abstraction that works on both web and native
const storage = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        return await AsyncStorage.getItem(key);
      }
    } catch {
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem(key, value);
      }
    } catch {
      // Silently fail
    }
  },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    const savedTheme = await storage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setThemeModeState(savedTheme);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    await storage.setItem(THEME_STORAGE_KEY, mode);
    setThemeModeState(mode);
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

// ============================================
// SHADOW UTILITIES
// ============================================

export const getShadows = (theme: Theme) => ({
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: theme.mode === 'dark' ? 0.3 : 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: theme.mode === 'dark' ? 0.4 : 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: theme.mode === 'dark' ? 0.5 : 0.16,
    shadowRadius: 10,
    elevation: 8,
  },
});
