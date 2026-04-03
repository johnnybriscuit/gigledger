/**
 * Quick Stats card - 2x2 grid of key metrics
 * Shows: Gigs Logged, Avg per Gig, Expenses, Estimated Tax Rate
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../../styles/theme';

interface QuickStatsProps {
  ytdGigsCount: number; // Total gigs logged for the year
  paidGigsCount: number; // Gigs that have been paid
  totalGrossIncome: number;
  estimatedTaxRate: number; // Already calculated as totalTaxes / netBeforeTax
}

export function QuickStats({
  ytdGigsCount,
  paidGigsCount,
  totalGrossIncome,
  estimatedTaxRate,
}: QuickStatsProps) {
  // Calculate average per gig (based on paid gigs)
  const avgPerGig = paidGigsCount > 0 ? totalGrossIncome / paidGigsCount : 0;

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
            <Text style={styles.value}>{ytdGigsCount}</Text>
          </View>

          {/* Avg per Gig */}
          <View style={[styles.stat, styles.statRight]}>
            <Text style={styles.label}>Avg per Gig</Text>
            <Text style={styles.value}>
              {paidGigsCount > 0 ? formatCurrency(avgPerGig) : '—'}
            </Text>
          </View>
        </View>

        {/* Row 2 */}
        <View style={styles.row}>
          {/* Gigs Paid */}
          <View style={[styles.stat, styles.statLeft, styles.statBottom]}>
            <Text style={styles.label}>Gigs Paid</Text>
            <Text style={styles.value}>{paidGigsCount}</Text>
          </View>

          {/* Estimated Tax Rate */}
          <View style={[styles.stat, styles.statRight, styles.statBottom]}>
            <Text style={styles.label}>Estimated Tax Rate</Text>
            <Text style={styles.value}>
              {estimatedTaxRate > 0 ? formatPercent(estimatedTaxRate) : '—'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.DEFAULT,
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
    color: colors.text.muted,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: Platform.OS === 'web' ? 28 : 22,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    letterSpacing: -0.5,
  },
});
