import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '../ui';
import { colors, spacing, radius, typography } from '../styles/theme';

interface OnboardingHelperCardProps {
  icon: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function OnboardingHelperCard({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: OnboardingHelperCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textContent}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.button}
        onPress={onAction}
        activeOpacity={0.7}
      >
        <Text style={styles.buttonText}>{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#eff6ff',
    borderRadius: parseInt(radius.lg),
    padding: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[4]),
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: parseInt(spacing[3]),
  },
  icon: {
    fontSize: 28,
    marginRight: parseInt(spacing[3]),
  },
  textContent: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
    marginBottom: parseInt(spacing[1]),
  },
  description: {
    fontSize: 14,
    color: colors.text.muted,
    lineHeight: 20,
  },
  button: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: parseInt(radius.md),
    paddingVertical: parseInt(spacing[2]) + 2,
    paddingHorizontal: parseInt(spacing[4]),
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: typography.fontWeight.semibold,
  },
});
