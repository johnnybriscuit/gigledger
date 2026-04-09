import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../styles/theme';
import { formatCurrency } from '../../utils/format';

interface StickySummaryProps {
  basePay: number;
  tips: number;
  perDiem: number;
  otherIncome: number;
  fees: number;
  expenses: number;
  subcontractorPayments: number;
  mileageDeduction: number;
  taxSetAside?: number;
  taxRate?: number;
  taxEstimateAvailable?: boolean;
  showTopBorder?: boolean;
  variant?: 'compact' | 'default';
}

export function StickySummary({
  basePay,
  tips,
  perDiem,
  otherIncome,
  fees,
  expenses,
  subcontractorPayments,
  mileageDeduction,
  taxSetAside = 0,
  taxRate = 0,
  taxEstimateAvailable = false,
  showTopBorder = true,
  variant = 'compact',
}: StickySummaryProps) {
  const [showDetails, setShowDetails] = useState(false);

  const totalIncome = basePay + tips + perDiem + otherIncome;
  const totalDeductions = fees + expenses + subcontractorPayments + mileageDeduction;
  const netBeforeTax = totalIncome - totalDeductions;
  const takeHome = netBeforeTax - taxSetAside;

  const isCompact = variant === 'compact';
  const primaryLabel = taxEstimateAvailable ? 'Estimated take-home' : 'Net so far';

  return (
    <View style={[styles.container, !showTopBorder && styles.containerNoBorder]}>
      <View style={[styles.summary, isCompact && styles.summaryCompact]}>
        <View style={[styles.summaryRow, isCompact && styles.summaryRowCompact]}>
          <View>
            <Text style={[styles.label, isCompact && styles.labelCompact]}>{primaryLabel}</Text>
            <Text style={[styles.amount, isCompact && styles.amountCompact]}>{formatCurrency(takeHome)}</Text>
          </View>
          <View style={styles.taxInfo}>
            {taxEstimateAvailable ? (
              <>
                <Text style={[styles.taxLabel, isCompact && styles.taxLabelCompact]}>Set aside</Text>
                <Text style={[styles.taxAmount, isCompact && styles.taxAmountCompact]}>
                  {formatCurrency(taxSetAside)} ({Math.round(taxRate)}%)
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.taxLabel, isCompact && styles.taxLabelCompact]}>Tax estimate</Text>
                <Text style={[styles.taxHint, isCompact && styles.taxHintCompact]}>
                  Add tax profile
                </Text>
              </>
            )}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.detailsButton, isCompact && styles.detailsButtonCompact]}
          onPress={() => setShowDetails(!showDetails)}
          activeOpacity={0.7}
        >
          <Text style={[styles.detailsButtonText, isCompact && styles.detailsButtonTextCompact]}>
            {showDetails ? 'Hide' : 'Show'} breakdown
          </Text>
          <Text style={[styles.chevron, isCompact && styles.chevronCompact]}>{showDetails ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {showDetails && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>Calculation</Text>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Base pay</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(basePay)}</Text>
          </View>
          {tips > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tips</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(tips)}</Text>
            </View>
          )}
          {perDiem > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Per diem</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(perDiem)}</Text>
            </View>
          )}
          {otherIncome > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Other income</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(otherIncome)}</Text>
            </View>
          )}
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
          {taxEstimateAvailable && taxSetAside > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Tax set-aside</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                -{formatCurrency(taxSetAside)}
              </Text>
            </View>
          )}
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{primaryLabel}</Text>
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
  containerNoBorder: {
    borderTopWidth: 0,
  },
  summary: {
    padding: parseInt(spacing[4]),
  },
  summaryCompact: {
    padding: parseInt(spacing[3]),
    paddingBottom: parseInt(spacing[2]),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: parseInt(spacing[3]),
  },
  summaryRowCompact: {
    marginBottom: parseInt(spacing[2]),
  },
  label: {
    fontSize: 13,
    color: colors.text.muted,
    marginBottom: 4,
  },
  labelCompact: {
    fontSize: 11,
    marginBottom: 2,
  },
  amount: {
    fontSize: 24,
    fontWeight: typography.fontWeight.bold,
    color: colors.success.DEFAULT,
  },
  amountCompact: {
    fontSize: 20,
  },
  taxInfo: {
    alignItems: 'flex-end',
  },
  taxLabel: {
    fontSize: 12,
    color: colors.text.muted,
    marginBottom: 2,
  },
  taxLabelCompact: {
    fontSize: 10,
  },
  taxAmount: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.warning.DEFAULT,
  },
  taxAmountCompact: {
    fontSize: 12,
  },
  taxHint: {
    fontSize: 14,
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
  },
  taxHintCompact: {
    fontSize: 12,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: parseInt(spacing[2]),
  },
  detailsButtonCompact: {
    paddingVertical: parseInt(spacing[1]),
  },
  detailsButtonText: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
    fontWeight: typography.fontWeight.medium,
    marginRight: parseInt(spacing[1]),
  },
  detailsButtonTextCompact: {
    fontSize: 11,
  },
  chevron: {
    fontSize: 10,
    color: colors.brand.DEFAULT,
  },
  chevronCompact: {
    fontSize: 9,
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
