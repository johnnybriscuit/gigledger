/**
 * Modal Component
 * 
 * Full-screen modal with title, description, content, and actions.
 * Provides consistent modal UX across the app.
 */

import React from 'react';
import { Modal as RNModal, View, Text, TouchableOpacity, StyleSheet, ScrollView, type ViewStyle } from 'react-native';
import { colors, radius, spacing, typography, zIndex } from '../styles/theme';
import { H2 } from './Typography';
import { Button } from './Button';
import { useKeyboard } from '../hooks/useKeyboard';

export interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

export function Modal({
  visible,
  onClose,
  title,
  description,
  children,
  actions,
  size = 'md',
  style,
}: ModalProps) {
  // Combine title and description for screen readers
  const accessibilityLabel = description 
    ? `${title}. ${description}`
    : title;

  // Handle keyboard events (Escape to close)
  useKeyboard({
    onEscape: onClose,
    enabled: visible,
  });

  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close modal"
          accessibilityHint="Double tap to close this dialog"
        />
        
        <View 
          style={[styles.container, styles[`size_${size}`], style]}
          accessible={true}
          accessibilityLabel={accessibilityLabel}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <H2>{title}</H2>
              {description && (
                <Text style={styles.description}>{description}</Text>
              )}
            </View>
            
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title} dialog`}
              accessibilityHint="Double tap to close this dialog"
            >
              <Text 
                style={styles.closeIcon}
                accessibilityElementsHidden={true}
                importantForAccessibility="no"
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
          
          {actions && (
            <View style={styles.actions}>
              {actions}
            </View>
          )}
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: parseInt(spacing[4]),
  },
  
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  
  container: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: parseInt(radius.lg),
    maxHeight: '90%',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  
  // Sizes
  size_sm: {
    maxWidth: 400,
  },
  size_md: {
    maxWidth: 600,
  },
  size_lg: {
    maxWidth: 800,
  },
  
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: parseInt(spacing[6]),
    paddingBottom: parseInt(spacing[4]),
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  
  headerContent: {
    flex: 1,
    gap: parseInt(spacing[1]),
    paddingRight: parseInt(spacing[4]),
  },
  
  description: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    lineHeight: parseInt(typography.fontSize.subtle.size) * parseFloat(typography.fontSize.subtle.lineHeight),
    color: colors.text.muted,
  },
  
  closeButton: {
    padding: parseInt(spacing[1]),
  },
  
  closeIcon: {
    fontSize: 24,
    color: colors.text.muted,
    fontWeight: typography.fontWeight.normal,
  },
  
  content: {
    flex: 1,
    padding: parseInt(spacing[6]),
  },
  
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: parseInt(spacing[3]),
    padding: parseInt(spacing[6]),
    paddingTop: parseInt(spacing[4]),
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
});
