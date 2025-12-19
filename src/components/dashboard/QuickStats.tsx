/**
 * Quick Stats card - 2x2 grid of key metrics
 * Shows: Gigs Logged, Avg per Gig, Expenses, Effective Tax Rate
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  grid: {
    gap: 20,
  },
  row: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    flex: 1,
  },
  statLeft: {
    // No special styling needed
  },
  statRight: {
    // No special styling needed
  },
  statBottom: {
    // No special styling needed
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
});
