/**
 * LoadingState Component
 * 
 * Accessible loading indicator with live region announcement.
 * Ensures screen readers announce loading state changes.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing } from '../styles/theme';
import { Text } from './Typography';

export interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
  style?: ViewStyle;
}

export function LoadingState({ 
  message = 'Loading...', 
  size = 'large',
  style 
}: LoadingStateProps) {
  return (
    <View 
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator 
        size={size} 
        color={colors.brand.DEFAULT}
        accessibilityElementsHidden={true}
        importantForAccessibility="no"
      />
      <Text 
        muted 
        style={styles.message}
        accessibilityRole="text"
      >
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: parseInt(spacing[10]),
    gap: parseInt(spacing[3]),
  },
  message: {
    textAlign: 'center',
  },
});
