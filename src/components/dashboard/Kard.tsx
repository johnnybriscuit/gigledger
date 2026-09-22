/**
 * Reusable Card component for dashboard widgets
 * Provides consistent styling, header layout, and accessibility
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useWidgetCollapsed } from '../../hooks/useWidgetCollapsed';

interface KardProps {
  /** Card title */
  title: string;
  /** Optional icon to display before title — a string renders as emoji/text, a ReactNode (e.g. an Ionicons element) renders as-is */
  icon?: string | ReactNode;
  /** Optional info button handler */
  onInfoPress?: () => void;
  /** Card content */
  children: ReactNode;
  /** Optional additional styles */
  style?: any;
  /** When true, the header becomes a toggle that collapses the card body */
  collapsible?: boolean;
  /** Persistence key for collapsed state (defaults to title) */
  collapseKey?: string;
  /** Initial collapsed state when no persisted value exists */
  defaultCollapsed?: boolean;
}

export function Kard({ title, icon, onInfoPress, children, style, collapsible, collapseKey, defaultCollapsed }: KardProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const [collapsed, toggleCollapsed] = useWidgetCollapsed(collapseKey ?? title, defaultCollapsed ?? false);
  const isCollapsed = collapsible && collapsed;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }, style]}>
      {/* Header Row */}
      <View style={[styles.header, isCollapsed && styles.headerCollapsed]}>
        {collapsible ? (
          <TouchableOpacity
            style={styles.titleRow}
            onPress={toggleCollapsed}
            activeOpacity={0.7}
            accessibilityLabel={`${isCollapsed ? 'Expand' : 'Collapse'} ${title}`}
            accessibilityRole="button"
          >
            {icon && (typeof icon === 'string' ? <Text style={styles.icon}>{icon}</Text> : icon)}
            <Text style={[styles.title, { color: colors.text.DEFAULT }]}>{title}</Text>
            <Text style={[styles.chevron, { color: colors.text.subtle }]}>
              {isCollapsed ? '▾' : '▴'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.titleRow}>
            {icon && (typeof icon === 'string' ? <Text style={styles.icon}>{icon}</Text> : icon)}
            <Text style={[styles.title, { color: colors.text.DEFAULT }]}>{title}</Text>
          </View>
        )}

        {onInfoPress && (
          <TouchableOpacity
            onPress={onInfoPress}
            style={styles.infoButton}
            accessibilityLabel={`More information about ${title}`}
            accessibilityRole="button"
          >
            <Text style={[styles.infoIcon, { backgroundColor: colors.surface.muted, borderRadius: 8 }]}>ℹ️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      {!isCollapsed && (
        <View style={styles.content}>
          {children}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16, // rounded-2xl
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', // shadow-sm
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
    padding: 16, // p-4
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16, // space-y-4
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    fontSize: 20,
  },
  title: {
    fontSize: 18, // text-lg
    fontWeight: '600', // font-semibold
  },
  headerCollapsed: {
    marginBottom: 0,
  },
  chevron: {
    fontSize: 12,
    marginLeft: 2,
  },
  infoButton: {
    padding: 8,
    borderRadius: 8,
    minWidth: 32,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoIcon: {
    fontSize: 18,
    opacity: 0.8,
  },
  content: {
    gap: 16, // space-y-4
  },
});

// Responsive padding for larger screens
if (Platform.OS === 'web') {
  const mediaQuery = '@media (min-width: 768px)';
  // Note: React Native Web doesn't support media queries in StyleSheet
  // We'll handle this with conditional rendering or inline styles
}
