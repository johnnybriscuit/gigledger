/**
 * Reusable Card component for dashboard widgets
 * Provides consistent styling, header layout, and accessibility
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';

interface KardProps {
  /** Card title */
  title: string;
  /** Optional icon to display before title */
  icon?: string;
  /** Optional info button handler */
  onInfoPress?: () => void;
  /** Card content */
  children: ReactNode;
  /** Optional additional styles */
  style?: any;
}

export function Kard({ title, icon, onInfoPress, children, style }: KardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Header Row */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {icon && <Text style={styles.icon}>{icon}</Text>}
          <Text style={styles.title}>{title}</Text>
        </View>
        
        {onInfoPress && (
          <TouchableOpacity
            onPress={onInfoPress}
            style={styles.infoButton}
            accessibilityLabel={`More information about ${title}`}
            accessibilityRole="button"
          >
            <Text style={styles.infoIcon}>ℹ️</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16, // rounded-2xl
    borderWidth: 1,
    borderColor: '#e5e7eb', // border-gray-200
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
    color: '#111827', // text-gray-900
  },
  infoButton: {
    padding: 4,
    borderRadius: 8,
  },
  infoIcon: {
    fontSize: 16,
    opacity: 0.6,
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
