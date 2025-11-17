/**
 * SkipLink Component
 * 
 * Allows keyboard users to skip navigation and jump to main content.
 * Only visible when focused, following WCAG guidelines.
 */

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, Platform } from 'react-native';
import { colors, spacing, typography, zIndex } from '../styles/theme';

export interface SkipLinkProps {
  targetId?: string;
  label?: string;
  onPress?: () => void;
}

export function SkipLink({ 
  targetId = 'main-content',
  label = 'Skip to main content',
  onPress 
}: SkipLinkProps) {
  // Only render on web
  if (Platform.OS !== 'web') {
    return null;
  }

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else if (targetId) {
      // @ts-ignore - Web-specific API
      const element = document.getElementById(targetId);
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  return (
    <TouchableOpacity
      style={styles.skipLink}
      onPress={handlePress}
      accessible={true}
      accessibilityRole="link"
      accessibilityLabel={label}
      // @ts-ignore - Web-specific props
      tabIndex={0}
    >
      <Text style={styles.skipLinkText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  skipLink: {
    position: 'absolute',
    top: parseInt(spacing[4]),
    left: parseInt(spacing[4]),
    backgroundColor: colors.brand.DEFAULT,
    padding: parseInt(spacing[3]),
    borderRadius: 4,
    zIndex: 9999,
    // Hidden by default, visible on focus
    opacity: 0,
    transform: [{ translateY: -100 }],
  },
  skipLinkText: {
    color: colors.brand.foreground,
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
  },
});
