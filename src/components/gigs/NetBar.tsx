/**
 * Sticky Net Bar for Add Gig modal
 * Shows live calculation of net income after all additions, subtractions, and estimated taxes
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TaxEstimate } from '../../hooks/useTaxEstimate';

interface NetBarProps {
  grossAmount: number;
  tips: number;
  perDiem: number;
  otherIncome: number;
  fees: number;
  expenses: number;
  mileageDeduction: number;
  taxEstimate: TaxEstimate;
}

export function NetBar({
  grossAmount,
  tips,
  perDiem,
  otherIncome,
  fees,
  expenses,
  mileageDeduction,
  taxEstimate,
}: NetBarProps) {
  const totalIncome = grossAmount + tips + perDiem + otherIncome;
  const totalDeductions = fees + expenses + mileageDeduction;
  const netBeforeTax = totalIncome - totalDeductions;
  const netAfterTax = netBeforeTax - taxEstimate.total;

  const isNegative = netAfterTax < 0;
  const hasUnusualFees = fees > grossAmount * 0.15; // Warn if fees > 15% of gross

  return (
    <View style={styles.container}>
      {/* Warning Badges */}
      {isNegative && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>⚠️ Net is negative</Text>
        </View>
      )}
      {hasUnusualFees && !isNegative && (
        <View style={styles.warningBadge}>
          <Text style={styles.warningText}>⚠️ High fees ({((fees / grossAmount) * 100).toFixed(0)}%)</Text>
        </View>
      )}

      {/* Calculation Breakdown */}
      <View style={styles.breakdown}>
        <View style={styles.row}>
          <Text style={styles.label}>Income</Text>
          <Text style={styles.value}>+${totalIncome.toFixed(2)}</Text>
        </View>

        {totalDeductions > 0 && (
          <View style={styles.row}>
            <Text style={styles.label}>Deductions</Text>
            <Text style={[styles.value, styles.negative]}>-${totalDeductions.toFixed(2)}</Text>
          </View>
        )}

        {taxEstimate.total > 0 && (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.labelSmall}>Est. Taxes</Text>
              <Text style={[styles.valueSmall, styles.negative]}>-${taxEstimate.total.toFixed(2)}</Text>
            </View>
            <View style={styles.taxBreakdown}>
              <Text style={styles.taxLine}>SE: ${taxEstimate.selfEmployment.toFixed(2)}</Text>
              <Text style={styles.taxLine}>Fed: ${taxEstimate.federalIncome.toFixed(2)}</Text>
              <Text style={styles.taxLine}>State: ${taxEstimate.stateIncome.toFixed(2)}</Text>
            </View>
          </>
        )}

        <View style={styles.divider} />

        {/* Net After Tax */}
        <View style={styles.netRow}>
          <Text style={styles.netLabel}>Net After Tax</Text>
          <Text style={[styles.netValue, isNegative && styles.netNegative]}>
            ${netAfterTax.toFixed(2)}
          </Text>
        </View>
      </View>

      <Text style={styles.disclaimer}>Estimates only. Not tax advice.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  warningBadge: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  warningText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
  },
  breakdown: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  negative: {
    color: '#ef4444',
  },
  labelSmall: {
    fontSize: 12,
    color: '#6b7280',
  },
  valueSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#111827',
  },
  taxBreakdown: {
    flexDirection: 'row',
    gap: 12,
    paddingLeft: 12,
  },
  taxLine: {
    fontSize: 11,
    color: '#9ca3af',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 4,
  },
  netRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  netLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  netValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  netNegative: {
    color: '#ef4444',
  },
  disclaimer: {
    fontSize: 10,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
});
