/**
 * TaxSummarySticky - Sticky bottom bar showing tax summary
 * Hidden when the inline TaxSummary is expanded
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

export interface TaxSummaryStickyProps {
  netAfterTax: number;
  setAside: number;
  setAsidePct: number;
  isVisible: boolean;
  onPress: () => void;
}

export function TaxSummarySticky({
  netAfterTax,
  setAside,
  setAsidePct,
  isVisible,
  onPress,
}: TaxSummaryStickyProps) {
  if (!isVisible) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (decimal: number) => {
    return `${(decimal * 100).toFixed(1)}%`;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={`View tax breakdown. Net after tax: ${formatCurrency(netAfterTax)}. Set aside: ${formatCurrency(setAside)}`}
    >
      <View style={styles.content}>
        <View style={styles.left}>
          <Text style={styles.label}>💰 Net after tax:</Text>
          <Text style={styles.amount}>{formatCurrency(netAfterTax)}</Text>
        </View>
        <View style={styles.right}>
          <Text style={styles.setAside}>
            Set aside: {formatCurrency(setAside)} ({formatPercent(setAsidePct)})
          </Text>
          <Text style={styles.expandIcon}>▴</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Platform.select({
      ios: 'rgba(255, 255, 255, 0.9)',
      android: 'rgba(255, 255, 255, 0.95)',
      default: 'rgba(255, 255, 255, 0.9)',
    }),
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  label: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setAside: {
    fontSize: 12,
    color: '#6b7280',
  },
  expandIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
});
