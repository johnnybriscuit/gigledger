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
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.icon}>{icon}</View>}
      
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
