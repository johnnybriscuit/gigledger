/**
 * Badge Component
 * 
 * Small label for status, categories, or counts.
 * Supports neutral, success, warning, and danger variants.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../styles/theme';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'neutral' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  style,
}: BadgeProps) {
  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
  ].filter(Boolean) as TextStyle[];

  return (
    <View style={containerStyle}>
      <Text style={textStyle}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: parseInt(radius.sm),
    alignSelf: 'flex-start',
  },
  
  // Variants
  variant_neutral: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  variant_success: {
    backgroundColor: colors.success.muted,
    borderWidth: 1,
    borderColor: colors.success.DEFAULT,
  },
  variant_warning: {
    backgroundColor: colors.warning.muted,
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
  },
  variant_danger: {
    backgroundColor: colors.danger.muted,
    borderWidth: 1,
    borderColor: colors.danger.DEFAULT,
  },
  
  // Sizes
  size_sm: {
    paddingHorizontal: parseInt(spacing[2]),
    paddingVertical: 2,
  },
  size_md: {
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: parseInt(spacing[1]),
  },
  
  // Text styles
  text: {
    fontWeight: typography.fontWeight.medium,
  },
  text_neutral: {
    color: colors.text.DEFAULT,
  },
  text_success: {
    color: colors.success.DEFAULT,
  },
  text_warning: {
    color: colors.warning.DEFAULT,
  },
  text_danger: {
    color: colors.danger.DEFAULT,
  },
  
  textSize_sm: {
    fontSize: parseInt(typography.fontSize.caption.size),
    lineHeight: parseInt(typography.fontSize.caption.size) * 1.2,
  },
  textSize_md: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    lineHeight: parseInt(typography.fontSize.subtle.size) * 1.2,
  },
});
