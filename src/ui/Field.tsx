/**
 * Field Component
 * 
 * Form field wrapper with label, help text, error message, and required indicator.
 * Provides consistent form field styling across the app.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing, typography } from '../styles/theme';

export interface FieldProps {
  label: string;
  children: React.ReactNode;
  help?: string;
  error?: string;
  required?: boolean;
  style?: ViewStyle;
}

export function Field({ label, children, help, error, required, style }: FieldProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}>*</Text>}
      </View>
      
      {children}
      
      {help && !error && (
        <Text style={styles.help}>{help}</Text>
      )}
      
      {error && (
        <Text style={styles.error}>{error}</Text>
      )}
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
    gap: parseInt(spacing[1]),
  },
  
  label: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    lineHeight: parseInt(typography.fontSize.subtle.size) * parseFloat(typography.fontSize.subtle.lineHeight),
    fontWeight: typography.fontWeight.medium,
    color: colors.text.DEFAULT,
  },
  
  required: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.danger.DEFAULT,
    fontWeight: typography.fontWeight.semibold,
  },
  
  help: {
    fontSize: parseInt(typography.fontSize.caption.size),
    lineHeight: parseInt(typography.fontSize.caption.size) * parseFloat(typography.fontSize.caption.lineHeight),
    color: colors.text.muted,
  },
  
  error: {
    fontSize: parseInt(typography.fontSize.caption.size),
    lineHeight: parseInt(typography.fontSize.caption.size) * parseFloat(typography.fontSize.caption.lineHeight),
    color: colors.danger.DEFAULT,
    fontWeight: typography.fontWeight.medium,
  },
});
