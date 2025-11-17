/**
 * EmptyState Component
 * 
 * Friendly empty state with icon, title, description, and CTA.
 * Used when lists or sections have no data yet.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { colors, spacing } from '../styles/theme';
import { H3, Text } from './Typography';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  style?: ViewStyle;
}

export function EmptyState({ icon, title, description, action, style }: EmptyStateProps) {
  // Combine title and description for screen readers
  const accessibilityLabel = description 
    ? `${title}. ${description}`
    : title;

  return (
    <View 
      style={[styles.container, style]}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      {icon && (
        <View 
          style={styles.icon}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        >
          {icon}
        </View>
      )}
      
      <View style={styles.content}>
        <H3 center>{title}</H3>
        {description && (
          <Text muted center>
            {description}
          </Text>
        )}
      </View>
      
      {action && (
        <Button
          variant="primary"
          onPress={action.onPress}
          accessibilityLabel={action.label}
          accessibilityHint="Double tap to perform this action"
        >
          {action.label}
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
  
  icon: {
    marginBottom: parseInt(spacing[2]),
  },
  
  content: {
    alignItems: 'center',
    gap: parseInt(spacing[2]),
    maxWidth: 400,
  },
});
