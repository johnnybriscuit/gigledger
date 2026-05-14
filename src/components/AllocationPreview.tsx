/**
 * Allocation Preview - Shows how money will be split across buckets
 * Used in gig entry flow to preview allocations before saving
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getThemePalette } from '../styles/theme';
import { useAllocationBuckets } from '../hooks/useAllocationBuckets';
import { calculateAllocations } from '../utils/allocationEngine';
import type { AllocationBucket } from '../types/allocation';

interface AllocationPreviewProps {
  grossAmount: number;
  onAdjust?: () => void;
  showAdjustButton?: boolean;
}

export function AllocationPreview({ 
  grossAmount, 
  onAdjust,
  showAdjustButton = false 
}: AllocationPreviewProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();

  // Don't show if no buckets configured
  if (buckets.length === 0) {
    return null;
  }

  const allocations = calculateAllocations(grossAmount, buckets as unknown as AllocationBucket[]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text.DEFAULT }]}>
            💰 Where this money goes
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.muted }]}>
            Based on your bucket setup
          </Text>
        </View>
        {showAdjustButton && onAdjust && (
          <TouchableOpacity
            style={[styles.adjustButton, { borderColor: colors.border.DEFAULT }]}
            onPress={onAdjust}
          >
            <Text style={[styles.adjustButtonText, { color: colors.text.DEFAULT }]}>
              Adjust
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Allocation list */}
      <View style={styles.allocationList}>
        {allocations.map((allocation, index) => {
          const isSpendable = allocation.bucket.bucket_type === 'spendable';
          return (
            <View
              key={index}
              style={[
                styles.allocationRow,
                isSpendable && [styles.spendableRow, { backgroundColor: colors.success.muted }],
                { borderBottomColor: colors.border.muted },
              ]}
            >
              <View style={styles.allocationLeft}>
                <Text style={styles.emoji}>{allocation.bucket.emoji}</Text>
                <View style={styles.allocationInfo}>
                  <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>
                    {allocation.bucket.name}
                  </Text>
                  <Text style={[styles.percentage, { color: colors.text.muted }]}>
                    {allocation.percentage.toFixed(0)}%
                  </Text>
                </View>
              </View>
              <Text
                style={[
                  styles.amount,
                  isSpendable && styles.spendableAmount,
                  { color: isSpendable ? colors.success.DEFAULT : colors.text.DEFAULT },
                ]}
              >
                {formatCurrency(allocation.allocatedAmount)}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Summary */}
      <View style={[styles.summary, { borderTopColor: colors.border.DEFAULT }]}>
        <Text style={[styles.summaryLabel, { color: colors.text.muted }]}>
          Total gross amount
        </Text>
        <Text style={[styles.summaryAmount, { color: colors.text.DEFAULT }]}>
          {formatCurrency(grossAmount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  adjustButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  adjustButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  allocationList: {
    marginBottom: 12,
  },
  allocationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  spendableRow: {
    borderRadius: 8,
    paddingHorizontal: 12,
    marginHorizontal: -4,
  },
  allocationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  emoji: {
    fontSize: 20,
    marginRight: 12,
  },
  allocationInfo: {
    flex: 1,
  },
  bucketName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  percentage: {
    fontSize: 12,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  spendableAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  summary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
});
