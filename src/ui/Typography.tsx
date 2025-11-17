/**
 * Typography Components
 * 
 * Consistent text components with proper hierarchy.
 * H1, H2, H3 for headings, Text for body, Caption for small text.
 */

import React from 'react';
import { Text as RNText, StyleSheet, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { colors, typography } from '../styles/theme';

export interface TextProps extends RNTextProps {
  children: React.ReactNode;
  muted?: boolean;
  subtle?: boolean;
  bold?: boolean;
  semibold?: boolean;
  center?: boolean;
  style?: TextStyle;
}

// Display text (for hero numbers, page titles)
export function Display({ children, style, ...props }: TextProps) {
  return (
    <RNText style={[styles.display, style]} {...props}>
      {children}
    </RNText>
  );
}

// H1 - Main page heading
export function H1({ children, muted, center, style, ...props }: TextProps) {
  return (
    <RNText
      style={[
        styles.h1,
        muted && styles.textMuted,
        center && styles.center,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// H2 - Section heading
export function H2({ children, muted, center, style, ...props }: TextProps) {
  return (
    <RNText
      style={[
        styles.h2,
        muted && styles.textMuted,
        center && styles.center,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// H3 - Subsection heading
export function H3({ children, muted, center, style, ...props }: TextProps) {
  return (
    <RNText
      style={[
        styles.h3,
        muted && styles.textMuted,
        center && styles.center,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// Body text
export function Text({ children, muted, subtle, bold, semibold, center, style, ...props }: TextProps) {
  return (
    <RNText
      style={[
        styles.body,
        muted && styles.textMuted,
        subtle && styles.textSubtle,
        bold && styles.bold,
        semibold && styles.semibold,
        center && styles.center,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

// Caption text (small, for labels and hints)
export function Caption({ children, muted, center, style, ...props }: TextProps) {
  return (
    <RNText
      style={[
        styles.caption,
        muted && styles.textMuted,
        center && styles.center,
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  display: {
    fontSize: parseInt(typography.fontSize.display.md.size),
    lineHeight: parseInt(typography.fontSize.display.md.size) * parseFloat(typography.fontSize.display.md.lineHeight),
    fontWeight: typography.fontWeight.bold,
    color: colors.text.DEFAULT,
  },
  
  h1: {
    fontSize: parseInt(typography.fontSize.h1.size),
    lineHeight: parseInt(typography.fontSize.h1.size) * parseFloat(typography.fontSize.h1.lineHeight),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  
  h2: {
    fontSize: parseInt(typography.fontSize.h2.size),
    lineHeight: parseInt(typography.fontSize.h2.size) * parseFloat(typography.fontSize.h2.lineHeight),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  
  h3: {
    fontSize: parseInt(typography.fontSize.h3.size),
    lineHeight: parseInt(typography.fontSize.h3.size) * parseFloat(typography.fontSize.h3.lineHeight),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  
  body: {
    fontSize: parseInt(typography.fontSize.body.size),
    lineHeight: parseInt(typography.fontSize.body.size) * parseFloat(typography.fontSize.body.lineHeight),
    fontWeight: typography.fontWeight.normal,
    color: colors.text.DEFAULT,
  },
  
  caption: {
    fontSize: parseInt(typography.fontSize.caption.size),
    lineHeight: parseInt(typography.fontSize.caption.size) * parseFloat(typography.fontSize.caption.lineHeight),
    fontWeight: typography.fontWeight.normal,
    color: colors.text.muted,
  },
  
  // Modifiers
  textMuted: {
    color: colors.text.muted,
  },
  
  textSubtle: {
    color: colors.text.subtle,
  },
  
  bold: {
    fontWeight: typography.fontWeight.bold,
  },
  
  semibold: {
    fontWeight: typography.fontWeight.semibold,
  },
  
  center: {
    textAlign: 'center',
  },
});
