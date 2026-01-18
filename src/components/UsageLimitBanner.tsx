/**
 * Reusable Usage Limit Banner Component
 * Shows monthly usage progress for Free plan users (gigs, invoices, etc.)
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius, typography } from '../styles/theme';

interface UsageLimitBannerProps {
  label: string; // e.g., "invoices", "gigs"
  usedCount: number;
  limitCount: number;
  onUpgradePress: () => void;
}

export function UsageLimitBanner({ label, usedCount, limitCount, onUpgradePress }: UsageLimitBannerProps) {
  const remaining = Math.max(0, limitCount - usedCount);
  const percent = Math.min((usedCount / limitCount) * 100, 100);

  // Determine copy based on remaining count
  let primaryText = '';
  let secondaryText = '';

  if (remaining >= 2) {
    primaryText = `You've used ${usedCount} of ${limitCount} ${label} this month`;
    secondaryText = 'Resets on the 1st';
  } else if (remaining === 1) {
    primaryText = `You have 1 ${label.replace(/s$/, '')} left this month`;
    secondaryText = `You've used ${usedCount} of ${limitCount} • Resets on the 1st`;
  } else {
    // remaining === 0
    primaryText = `You've reached your monthly ${label} limit`;
    secondaryText = 'Upgrade to create more invoices now • Resets on the 1st';
  }

  return (
    <View style={styles.usageIndicator}>
      <View style={styles.usageHeader}>
        <View style={styles.textContainer}>
          <Text style={styles.primaryText}>{primaryText}</Text>
          <Text style={styles.secondaryText}>{secondaryText}</Text>
        </View>
        <TouchableOpacity onPress={onUpgradePress} style={styles.upgradeButton}>
          <Text style={styles.upgradeText}>Upgrade</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.progressBar}>
        <View 
          style={[
            styles.progressFill, 
            { width: `${percent}%` }
          ]} 
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  usageIndicator: {
    backgroundColor: colors.warning.muted,
    borderRadius: parseInt(radius.sm),
    padding: parseInt(spacing[3]),
    marginBottom: parseInt(spacing[4]),
    borderWidth: 1,
    borderColor: colors.warning.DEFAULT,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: parseInt(spacing[2]),
  },
  textContainer: {
    flex: 1,
    marginRight: parseInt(spacing[2]),
  },
  primaryText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: '#92400e',
    fontWeight: typography.fontWeight.semibold,
    marginBottom: 2,
  },
  secondaryText: {
    fontSize: 12,
    color: '#92400e',
    opacity: 0.8,
  },
  upgradeButton: {
    paddingHorizontal: parseInt(spacing[2]),
    paddingVertical: parseInt(spacing[1]),
  },
  upgradeText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.DEFAULT,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#fef3c7',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.warning.DEFAULT,
  },
});
