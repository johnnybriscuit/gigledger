import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/theme';
import { formatCurrency } from '../../utils/format';

interface StickySummaryProps {
  grossIncome: number;
  fees: number;
  expenses: number;
  subcontractorPayments: number;
  mileageDeduction: number;
  taxSetAside: number;
  taxRate: number;
}

export function StickySummary({
  grossIncome,
  fees,
  expenses,
  subcontractorPayments,
  mileageDeduction,
  taxSetAside,
  taxRate,
}: StickySummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  const totalDeductions = fees + expenses + subcontractorPayments + mileageDeduction;
  const netBeforeTax = grossIncome - totalDeductions;
  const takeHome = netBeforeTax - taxSetAside;

  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.label}>Estimated take-home</Text>
            <Text style={styles.amount}>{formatCurrency(takeHome)}</Text>
          </View>
          <View style={styles.taxInfo}>
            <Text style={styles.taxLabel}>Set aside</Text>
            <Text style={styles.taxAmount}>
              {formatCurrency(taxSetAside)} ({Math.round(taxRate)}%)
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.detailsButton}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.7}
        >
          <Text style={styles.detailsButtonText}>
            {showDetails ? 'Hide' : 'Show'} breakdown
          </Text>
          <Text style={styles.chevron}>{showDetails ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {showDetails && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>Calculation</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Gross income</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(grossIncome)}</Text>
          </View>
          {fees > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Fees</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                -{formatCurrency(fees)}
              </Text>
            </View>
          )}
          {expenses > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Expenses</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                -{formatCurrency(expenses)}
              </Text>
            </View>
          )}
          {subcontractorPayments > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subcontractors</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                -{formatCurrency(subcontractorPayments)}
              </Text>
            </View>
          )}
          {mileageDeduction > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Mileage</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                -{formatCurrency(mileageDeduction)}
              </Text>
            </View>
          )}
          {taxSetAside > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tax set-aside</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                -{formatCurrency(taxSetAside)}
              </Text>
            </View>
          )}
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Take-home</Text>
            <Text style={styles.totalValue}>{formatCurrency(takeHome)}</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  summary: {
    padding: parseInt(spacing[4]),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  label: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 4,
  },
  amount: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.success.DEFAULT,
  },
  taxInfo: {
    alignItems: 'flex-end',
  },
  taxLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 2,
  },
  taxAmount: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning.DEFAULT,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: parseInt(spacing[2]),
  },
  detailsButtonText: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
    fontWeight: typography.fontWeight.medium,
    marginRight: parseInt(spacing[1]),
  },
  chevron: {
    fontSize: 10,
    color: colors.brand.DEFAULT,
  },
  breakdown: {
    padding: parseInt(spacing[4]),
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  breakdownTitle: {
    fontSize: 12,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: parseInt(spacing[3]),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: parseInt(spacing[2]),
  },
  breakdownLabel: {
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.DEFAULT,
  },
  negative: {
    color: colors.danger.DEFAULT,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border.DEFAULT,
    marginTop: parseInt(spacing[2]),
    paddingTop: parseInt(spacing[3]),
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.DEFAULT,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: typography.fontWeight.bold,
    color: colors.success.DEFAULT,
  },
});
