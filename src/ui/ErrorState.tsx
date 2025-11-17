/**
 * ErrorState Component
 * 
 * Accessible error display with alert role for screen readers.
 * Announces errors immediately to assistive technology.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing } from '../styles/theme';
import { H3, Text } from './Typography';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function ErrorState({ 
  title = 'Error',
  message, 
  retry,
  style 
}: ErrorStateProps) {
  const accessibilityLabel = `${title}. ${message}`;

  return (
    <View 
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="alert"
      accessibilityLabel={accessibilityLabel}
      accessibilityLiveRegion="assertive"
    >
      <View style={styles.content}>
        <H3 style={styles.title}>{title}</H3>
        <Text muted center>
          {message}
        </Text>
      </View>
      
      {retry && (
        <Button
          variant="primary"
          onPress={retry.onPress}
          accessibilityLabel={retry.label}
          accessibilityHint="Double tap to retry the failed operation"
        >
          {retry.label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: parseInt(spacing[6]),
    paddingVertical: parseInt(spacing[12]),
    gap: parseInt(spacing[6]),
  },
  content: {
    alignItems: 'center',
    gap: parseInt(spacing[2]),
    maxWidth: 400,
  },
  title: {
    color: colors.danger.DEFAULT,
    textAlign: 'center',
  },
});
