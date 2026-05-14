/**
 * Allocation History - Shows how a gig's payment was allocated across buckets
 * Can be added to gig detail views
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';

interface AllocationHistoryProps {
  gigId: string;
}

export function AllocationHistory({ gigId }: AllocationHistoryProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { transactions, isLoading } = useAllocationTransactions({ gigId });

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
        <Text style={[styles.title, { color: colors.text.DEFAULT }]}>
          Money Allocation
        </Text>
        <Text style={[styles.loading, { color: colors.text.muted }]}>Loading...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return null; // Don't show if no allocations
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const totalAllocated = transactions.reduce((sum, t) => sum + t.allocated_amount, 0);

  return (
    <View style={[styles.container, { backgroundColor: colors.surface.elevated, borderColor: colors.border.DEFAULT }]}>
      <Text style={[styles.title, { color: colors.text.DEFAULT }]}>
        💰 Money Allocation
      </Text>
      <Text style={[styles.subtitle, { color: colors.text.muted }]}>
        Where this ${formatCurrency(totalAllocated)} went
      </Text>

      <View style={styles.list}>
        {transactions.map((transaction, index) => (
          <View
            key={index}
            style={[styles.row, { borderBottomColor: colors.border.muted }]}
          >
            <View style={styles.left}>
              <Text style={[styles.bucketName, { color: colors.text.DEFAULT }]}>
                {transaction.percentage_used.toFixed(0)}% allocated
              </Text>
            </View>
            <Text style={[styles.amount, { color: colors.success.DEFAULT }]}>
              {formatCurrency(transaction.allocated_amount)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginVertical: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  loading: {
    fontSize: 14,
    padding: 12,
  },
  list: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  left: {
    flex: 1,
  },
  bucketName: {
    fontSize: 14,
    fontWeight: '500',
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
  },
});
