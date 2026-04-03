/**
 * Theme context for light/dark mode
 * Persists preference to localStorage (web) or SecureStore (native)
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Appearance, Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { ThemeMode } from '../styles/theme';

type ThemePreference = ThemeMode | null;
const THEME_STORAGE_KEY = 'bozzy-theme-preference';

interface ThemeContextType {
  theme: ThemeMode;
  preference: ThemePreference;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): ThemeMode {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function getStoredWebPreference(): ThemePreference {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return null;
  }

  const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : null;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemTheme, setSystemTheme] = useState<ThemeMode>(getSystemTheme());
  const [preference, setPreference] = useState<ThemePreference>(() => getStoredWebPreference());
  const theme = preference ?? systemTheme;

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemTheme(colorScheme === 'dark' ? 'dark' : 'light');
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    let active = true;
    SecureStore.getItemAsync(THEME_STORAGE_KEY)
      .then((saved) => {
        if (!active) {
          return;
        }

        if (saved === 'light' || saved === 'dark') {
          setPreference(saved);
        }
      })
      .catch(() => {
        // Ignore storage failures and fall back to system preference.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (preference) {
        localStorage.setItem(THEME_STORAGE_KEY, preference);
      } else {
        localStorage.removeItem(THEME_STORAGE_KEY);
      }
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.style.colorScheme = theme;
      return;
    }

    if (preference) {
      SecureStore.setItemAsync(THEME_STORAGE_KEY, preference).catch(() => {
        // Ignore storage failures and keep the in-memory theme active.
      });
    } else {
      SecureStore.deleteItemAsync(THEME_STORAGE_KEY).catch(() => {
        // Ignore storage failures and keep the in-memory theme active.
      });
    }
  }, [preference, theme]);

  const toggleTheme = () => {
    setPreference(theme === 'dark' ? 'light' : 'dark');
  };

  const setTheme = (newTheme: ThemeMode) => {
    setPreference(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, preference, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
