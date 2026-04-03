import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { Moon, Sun } from 'phosphor-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { colors } from '../styles/theme';

interface ThemeToggleButtonProps {
  compact?: boolean;
}

export function ThemeToggleButton({ compact = false }: ThemeToggleButtonProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const Icon = isDark ? Sun : Moon;
  const label = isDark ? 'Light Mode' : 'Dark Mode';

  return (
    <TouchableOpacity
      onPress={toggleTheme}
      style={[styles.button, compact && styles.buttonCompact]}
      accessibilityRole="button"
      accessibilityLabel={`Switch to ${label}`}
      accessibilityHint="Toggles the application color theme"
    >
      <Icon
        size={compact ? 16 : 18}
        weight="bold"
        color={colors.text.DEFAULT}
      />
      {!compact && <Text style={styles.label}>{label}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.elevated,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  buttonCompact: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
});
