/**
 * Bucket Balances Section - Grid of bucket balance cards
 * Shows all active buckets with YTD balances
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';
import { BucketBalanceCard } from './BucketBalanceCard';
import { useResponsive } from '../../hooks/useResponsive';

interface BucketBalancesSectionProps {
  onManageBuckets?: () => void;
}

export function BucketBalancesSection({ onManageBuckets }: BucketBalancesSectionProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { isMobile, isTablet } = useResponsive();
  const { buckets, isLoading: bucketsLoading } = useAllocationBuckets();
  const { ytdTotals, isLoadingYTD } = useAllocationTransactions();

  // Don't show if no buckets configured
  if (buckets.length === 0) {
    return null;
  }

  if (bucketsLoading || isLoadingYTD) {
    return (
      <View style={styles.container}>
        <Text style={[styles.sectionTitle, { color: colors.text.DEFAULT }]}>
          Your Money Buckets
        </Text>
        <Text style={[styles.loading, { color: colors.text.muted }]}>Loading...</Text>
      </View>
    );
  }

  // Determine grid columns based on screen size
  const columns = isMobile ? 1 : isTablet ? 2 : 3;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.sectionTitle, { color: colors.text.DEFAULT }]}>
            Your Money Buckets
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.text.muted }]}>
            Year-to-date allocations
          </Text>
        </View>
        {onManageBuckets && (
          <TouchableOpacity
            style={[styles.manageButton, { borderColor: colors.border.DEFAULT }]}
            onPress={onManageBuckets}
          >
            <Text style={[styles.manageButtonText, { color: colors.text.DEFAULT }]}>
              Manage
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Bucket grid */}
      <View style={[styles.grid, { gap: 16 }]}>
        {buckets.map((bucket) => {
          const ytd = ytdTotals.find(t => t.bucket_id === bucket.id);
          const balance = ytd?.total || 0;
          
          // Show progress for emergency fund, debt, and goals
          const showProgress = ['emergency_fund', 'debt', 'goal'].includes(bucket.bucket_type);

          // Calculate width based on columns
          const itemWidth = isMobile ? '100%' : isTablet ? '48%' : '31%';

          return (
            <View
              key={bucket.id}
              style={[
                styles.gridItem,
                { width: itemWidth },
              ]}
            >
              <BucketBalanceCard
                bucket={bucket as any}
                ytdBalance={balance}
                showProgress={showProgress}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
  },
  manageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  manageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loading: {
    fontSize: 14,
    textAlign: 'center',
    padding: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    marginBottom: 16,
  },
});
