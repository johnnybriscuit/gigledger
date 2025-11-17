/**
 * SectionHeader Component
 * 
 * Page or section header with title and optional actions.
 * Provides consistent spacing and layout for section titles.
 */

import React from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import { spacing } from '../styles/theme';
import { H2 } from './Typography';

export interface SectionHeaderProps {
  title: string;
  actions?: React.ReactNode;
  subtitle?: string;
  style?: ViewStyle;
}

export function SectionHeader({ title, actions, subtitle, style }: SectionHeaderProps) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.content}>
        <H2>{title}</H2>
        {subtitle && <H2 muted>{subtitle}</H2>}
      </View>
      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: parseInt(spacing[4]),
  },
  
  content: {
    flex: 1,
    gap: parseInt(spacing[1]),
  },
  
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: parseInt(spacing[2]),
    marginLeft: parseInt(spacing[4]),
  },
});
