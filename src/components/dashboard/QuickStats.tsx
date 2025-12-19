/**
 * Quick Stats card - 2x2 grid of key metrics
 * Shows: Gigs Logged, Avg per Gig, Expenses, Effective Tax Rate
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { spacing } from '../../styles/theme';

interface QuickStatsProps {
  gigsCount: number;
  totalGrossIncome: number;
  totalExpenses: number;
  netProfit: number;
  totalTaxes: number;
}

export function QuickStats({
  gigsCount,
  totalGrossIncome,
  totalExpenses,
  netProfit,
  totalTaxes,
}: QuickStatsProps) {
  // Calculate average per gig
  const avgPerGig = gigsCount > 0 ? totalGrossIncome / gigsCount : 0;

  // Calculate effective tax rate
  const effectiveTaxRate = netProfit > 0 ? (totalTaxes / netProfit) * 100 : 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <View style={styles.container}>
      {/* 2x2 Grid */}
      <View style={styles.grid}>
        {/* Row 1 */}
        <View style={styles.row}>
          {/* Gigs Logged */}
          <View style={[styles.stat, styles.statLeft]}>
            <Text style={styles.label}>Gigs Logged</Text>
            <Text style={styles.value}>{gigsCount}</Text>
          </View>

          {/* Avg per Gig */}
          <View style={[styles.stat, styles.statRight]}>
            <Text style={styles.label}>Avg per Gig</Text>
            <Text style={styles.value}>
              {gigsCount > 0 ? formatCurrency(avgPerGig) : '—'}
            </Text>
          </View>
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          {/* Expenses */}
          <View style={[styles.stat, styles.statLeft, styles.statBottom]}>
            <Text style={styles.label}>Expenses</Text>
            <Text style={styles.value}>{formatCurrency(totalExpenses)}</Text>
          </View>

          {/* Effective Tax Rate */}
          <View style={[styles.stat, styles.statRight, styles.statBottom]}>
            <Text style={styles.label}>Effective Tax Rate</Text>
            <Text style={styles.value}>
              {netProfit > 0 ? formatPercent(effectiveTaxRate) : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const spacingNum = {
  3: parseInt(spacing[3]),
  4: parseInt(spacing[4]),
  5: parseInt(spacing[5]),
  6: parseInt(spacing[6]),
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    ...Platform.select({
      web: {
        boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.02), 0 1px 2px 0 rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  grid: {
    padding: spacingNum[6],
  },
  row: {
    flexDirection: 'row',
    gap: spacingNum[4],
  },
  stat: {
    flex: 1,
    paddingVertical: spacingNum[4],
    paddingHorizontal: spacingNum[3],
    borderRightWidth: 1,
    borderRightColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statLeft: {
    paddingLeft: 0,
  },
  statRight: {
    borderRightWidth: 0,
    paddingRight: 0,
  },
  statBottom: {
    borderBottomWidth: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: spacingNum[3],
    letterSpacing: 0.2,
  },
  value: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
});
