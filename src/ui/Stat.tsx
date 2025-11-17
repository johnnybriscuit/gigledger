/**
 * Stat Component
 * 
 * Display a metric with label, value, and optional delta chip.
 * Perfect for dashboard KPIs and financial metrics.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';
import { Badge } from './Badge';

export interface StatProps {
  label: string;
  value: string | number;
  delta?: {
    value: string;
    variant?: 'success' | 'danger' | 'neutral';
  };
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export function Stat({ label, value, delta, icon, style }: StatProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        {icon}
        <Text style={styles.label}>{label}</Text>
      </View>
      
      <View style={styles.valueRow}>
        <Text style={styles.value}>{value}</Text>
        {delta && (
          <Badge
            variant={delta.variant || 'neutral'}
            size="sm"
          >
            {delta.value}
          </Badge>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: parseInt(spacing[2]),
  },
  
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
  },
  
  label: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    lineHeight: parseInt(typography.fontSize.subtle.size) * parseFloat(typography.fontSize.subtle.lineHeight),
    fontWeight: typography.fontWeight.medium,
    color: colors.text.muted,
  },
  
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: parseInt(spacing[3]),
  },
  
  value: {
    fontSize: parseInt(typography.fontSize.display.sm.size),
    lineHeight: parseInt(typography.fontSize.display.sm.size) * parseFloat(typography.fontSize.display.sm.lineHeight),
    fontWeight: typography.fontWeight.bold,
    color: colors.text.DEFAULT,
  },
});
