/**
 * Container Component
 * 
 * Page container with consistent max-width and padding.
 * Provides proper content centering and responsive spacing.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle, type ViewProps } from 'react-native';
import { layout, spacing } from '../styles/theme';

export interface ContainerProps extends ViewProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'max';
  padding?: boolean;
  style?: ViewStyle;
}

export function Container({
  children,
  maxWidth = 'max',
  padding = true,
  style,
  ...props
}: ContainerProps) {
  const containerStyle: ViewStyle[] = [
    styles.base,
    styles[`maxWidth_${maxWidth}`],
    padding && styles.padding,
    style,
  ].filter(Boolean) as ViewStyle[];

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: '100%',
    marginHorizontal: 'auto',
  },
  
  padding: {
    paddingHorizontal: parseInt(spacing[6]),
    paddingVertical: parseInt(spacing[6]),
  },
  
  // Max widths
  maxWidth_sm: {
    maxWidth: parseInt(layout.container.sm),
  },
  maxWidth_md: {
    maxWidth: parseInt(layout.container.md),
  },
  maxWidth_lg: {
    maxWidth: parseInt(layout.container.lg),
  },
  maxWidth_xl: {
    maxWidth: parseInt(layout.container.xl),
  },
  maxWidth_max: {
    maxWidth: parseInt(layout.container.max),
  },
});
