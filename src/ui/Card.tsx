/**
 * Card Component
 * 
 * Container with header, content, and footer slots.
 * Supports elevated, flat, and muted variants.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { colors, radius, spacing, shadow } from '../styles/theme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'flat' | 'muted';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  accessibilityLabel?: string;
}

export function Card({
  children,
  variant = 'elevated',
  padding = 'md',
  style,
  accessibilityLabel,
  ...props
}: CardProps) {
  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    padding !== 'none' && styles[`padding_${padding}`],
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <View 
      style={containerStyle}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      {...props}
    >
      {children}
    </View>
  );
}

export interface CardHeaderProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardHeader({ children, style, ...props }: CardHeaderProps) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardContentProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardContent({ children, style, ...props }: CardContentProps) {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

export interface CardFooterProps extends ViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function CardFooter({ children, style, ...props }: CardFooterProps) {
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: parseInt(radius.md),
    backgroundColor: colors.surface.DEFAULT,
  },
  
  // Variants
  variant_elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  variant_flat: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  variant_muted: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.muted,
  },
  
  // Padding
  padding_sm: {
    padding: parseInt(spacing[4]),
  },
  padding_md: {
    padding: parseInt(spacing[5]),
  },
  padding_lg: {
    padding: parseInt(spacing[6]),
  },
  
  // Slots
  header: {
    marginBottom: parseInt(spacing[4]),
  },
  content: {
    flex: 1,
  },
  footer: {
    marginTop: parseInt(spacing[4]),
    paddingTop: parseInt(spacing[4]),
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
});
