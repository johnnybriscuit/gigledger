/**
 * Button Component
 * 
 * Versatile button with multiple variants and sizes.
 * Uses StyleSheet for React Native compatibility.
 */

import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, type TouchableOpacityProps, type ViewStyle, type TextStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../styles/theme';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled,
  loading,
  leftIcon,
  rightIcon,
  style,
  accessibilityLabel,
  accessibilityHint,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ].filter(Boolean) as ViewStyle[];

  const textStyle: TextStyle[] = [
    styles.text,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
  ].filter(Boolean) as TextStyle[];

  // Generate default accessibility label from children if not provided
  const defaultLabel = typeof children === 'string' ? children : undefined;

  return (
    <TouchableOpacity
      style={containerStyle}
      disabled={isDisabled}
      activeOpacity={0.8}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || defaultLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? colors.brand.DEFAULT : colors.brand.foreground}
        />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyle}>
            {children}
          </Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: parseInt(radius.md),
  },
  
  // Variants
  variant_primary: {
    backgroundColor: colors.brand.DEFAULT,
  },
  variant_secondary: {
    backgroundColor: colors.surface.muted,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_destructive: {
    backgroundColor: colors.danger.DEFAULT,
  },
  variant_success: {
    backgroundColor: colors.success.DEFAULT,
  },
  
  // Sizes
  size_sm: {
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: parseInt(spacing[2]),
    gap: 6,
  },
  size_md: {
    paddingHorizontal: parseInt(spacing[4]),
    paddingVertical: 10,
    gap: 8,
  },
  size_lg: {
    paddingHorizontal: parseInt(spacing[6]),
    paddingVertical: parseInt(spacing[3]),
    gap: 10,
  },
  
  fullWidth: {
    width: '100%',
  },
  
  disabled: {
    opacity: 0.5,
  },
  
  // Text styles
  text: {
    fontWeight: typography.fontWeight.semibold,
  },
  text_primary: {
    color: colors.brand.foreground,
  },
  text_secondary: {
    color: colors.text.DEFAULT,
  },
  text_ghost: {
    color: colors.brand.DEFAULT,
  },
  text_destructive: {
    color: colors.danger.foreground,
  },
  text_success: {
    color: colors.success.foreground,
  },
  
  textSize_sm: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    lineHeight: parseInt(typography.fontSize.subtle.size) * parseFloat(typography.fontSize.subtle.lineHeight),
  },
  textSize_md: {
    fontSize: parseInt(typography.fontSize.body.size),
    lineHeight: parseInt(typography.fontSize.body.size) * parseFloat(typography.fontSize.body.lineHeight),
  },
  textSize_lg: {
    fontSize: parseInt(typography.fontSize.h3.size),
    lineHeight: parseInt(typography.fontSize.h3.size) * parseFloat(typography.fontSize.h3.lineHeight),
  },
});
