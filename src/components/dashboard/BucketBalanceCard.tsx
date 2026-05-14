/**
 * Bucket Balance Card - Shows individual bucket with balance and progress
 * Displays: emoji, name, percentage, YTD balance, optional progress bar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import type { AllocationBucket } from '../../types/allocation';

interface BucketBalanceCardProps {
  bucket: AllocationBucket;
  ytdBalance: number;
  showProgress?: boolean;
}

export function BucketBalanceCard({ bucket, ytdBalance, showProgress = false }: BucketBalanceCardProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate progress for goals
  const progress = bucket.goal_amount && bucket.goal_amount > 0
    ? Math.min((ytdBalance / bucket.goal_amount) * 100, 100)
    : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
      {/* Header with emoji and name */}
      <View style={styles.header}>
        <Text style={styles.emoji}>{bucket.emoji}</Text>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: colors.text.DEFAULT }]} numberOfLines={1}>
            {bucket.name}
          </Text>
          <Text style={[styles.percentage, { color: colors.text.muted }]}>
            {bucket.percentage}% of income
          </Text>
        </View>
      </View>

      {/* Balance */}
      <View style={styles.balanceRow}>
        <Text style={[styles.balanceLabel, { color: colors.text.muted }]}>YTD Balance</Text>
        <Text style={[styles.balanceValue, { color: colors.success.DEFAULT }]}>
          {formatCurrency(ytdBalance)}
        </Text>
      </View>

      {/* Progress bar for goals */}
      {showProgress && progress !== null && bucket.goal_amount && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={[styles.progressLabel, { color: colors.text.subtle }]}>
              Goal: {formatCurrency(bucket.goal_amount)}
            </Text>
            <Text style={[styles.progressPercent, { color: colors.text.subtle }]}>
              {progress.toFixed(0)}%
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border.muted }]}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress}%`,
                  backgroundColor: bucket.color || colors.brand.DEFAULT,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* Goal name if present */}
      {bucket.goal_name && (
        <Text style={[styles.goalName, { color: colors.text.subtle }]} numberOfLines={1}>
          {bucket.goal_name}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 120,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emoji: {
    fontSize: 32,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  percentage: {
    fontSize: 13,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 13,
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  progressSection: {
    marginTop: 12,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  goalName: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});
