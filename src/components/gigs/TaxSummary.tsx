/**
 * Tax and net summary section at the bottom of the Edit Gig form
 * Uses centralized tax calculation logic to match gig card displays
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { calculateGigTaxSummary, type GigTaxInput, type BusinessStructureGigTaxInput } from '../../utils/gigTaxCalculations';
import type { BusinessStructure } from '../../hooks/useProfile';
import type { PlanId } from '../../lib/businessStructure';

export interface TaxEstimate {
  federal: number;
  state: number;
  se: number;
  setAside: number;
  setAsidePct: number;
  note?: string;
  thresholdNote?: string;
}

export interface TaxSummaryProps {
  gross: number;
  tips?: number;
  perDiem?: number;
  fees?: number;
  otherIncome?: number;
  gigExpenses?: number;
  mileageDeduction?: number;
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head';
  state: string;
  taxYear?: number;
  estimate: TaxEstimate;
  onRecalc?: () => void;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
  business_structure?: BusinessStructure;
  plan?: PlanId;
}

export function TaxSummary({
  gross,
  tips = 0,
  perDiem = 0,
  fees = 0,
  otherIncome = 0,
  gigExpenses = 0,
  mileageDeduction = 0,
  estimate,
  isExpanded: controlledExpanded,
  onToggle,
  business_structure = 'individual',
  plan = 'free',
}: TaxSummaryProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const heightAnim = useRef(new Animated.Value(0)).current;

  const totalGross = gross + tips + perDiem + otherIncome;
  const totalExpenses = fees + gigExpenses + mileageDeduction;

  const taxInput: BusinessStructureGigTaxInput = {
    gross: totalGross,
    expensesTotal: totalExpenses,
    taxBreakdown: {
      federal: estimate.federal,
      state: estimate.state,
      seTax: estimate.se,
      total: estimate.setAside,
    },
    business_structure,
    plan,
  };

  const summary = calculateGigTaxSummary(taxInput);
  const isNoSeTaxMode = summary.mode === 'no_se_tax';

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (decimal: number) => {
    return `${(decimal * 100).toFixed(1)}%`;
  };

  // Handle toggle
  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (onToggle) {
      onToggle(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  // Animate height
  useEffect(() => {
    Animated.timing(heightAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isExpanded, heightAnim]);

  return (
    <View style={styles.container}>
      {/* Summary Row - Shows take-home and tax set-aside */}
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Tax summary. Net after tax: ${formatCurrency(summary.takeHome)}. Set aside: ${formatCurrency(summary.taxToSetAside)}. ${isExpanded ? 'Collapse' : 'Expand'} for breakdown`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>💰 Net after tax (take-home):</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(summary.takeHome)}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summarySetAside}>
            {isNoSeTaxMode ? 'Tax tracking (SE tax not calculated)' : `Set aside: ${formatCurrency(summary.taxToSetAside)} (${formatPercent(summary.effectiveRate)})`}
          </Text>
          <Text style={styles.expandIcon}>{isExpanded ? '▴' : '▾'}</Text>
        </View>
      </TouchableOpacity>

      {/* Expanded Breakdown */}
      {isExpanded && (
        <View style={styles.breakdown}>
          <View style={styles.breakdownGrid}>
            {/* Left Column - Income */}
            <View style={styles.breakdownColumn}>
              <Text style={styles.columnTitle}>Income</Text>
              
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Gross</Text>
                <Text style={styles.breakdownValue}>{formatCurrency(summary.gross)}</Text>
              </View>
              
              {summary.expensesTotal > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Expenses</Text>
                  <Text style={[styles.breakdownValue, styles.negative]}>-{formatCurrency(summary.expensesTotal)}</Text>
                </View>
              )}
              
              <View style={[styles.breakdownRow, styles.subtotalRow]}>
                <Text style={styles.subtotalLabel}>Net before tax</Text>
                <Text style={styles.subtotalValue}>{formatCurrency(summary.netBeforeTax)}</Text>
              </View>
            </View>

            {/* Right Column - Taxes */}
            <View style={styles.breakdownColumn}>
              <Text style={styles.columnTitle}>Taxes</Text>
              
              <View style={styles.breakdownRow}>
                <View style={styles.taxLabelContainer}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>Federal</Text>
                  </View>
                  {summary.federal === 0 && estimate.thresholdNote && (
                    <Text style={styles.thresholdNote}>(below threshold)</Text>
                  )}
                </View>
                <Text style={styles.breakdownValue}>{formatCurrency(summary.federal)}</Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>State</Text>
                </View>
                <Text style={styles.breakdownValue}>{formatCurrency(summary.state)}</Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>SE Tax</Text>
                </View>
                <Text style={styles.breakdownValue}>
                  {isNoSeTaxMode ? 'N/A' : formatCurrency(summary.seTax)}
                </Text>
              </View>
              
              {isNoSeTaxMode && (
                <View style={styles.noSeTaxNote}>
                  <Text style={styles.noSeTaxText}>
                    ℹ️ Self-employment tax not calculated for {business_structure === 'llc_scorp' ? 'S-Corp' : 'multi-member LLC'}
                  </Text>
                </View>
              )}
              
              <View style={[styles.breakdownRow, styles.subtotalRow]}>
                <Text style={styles.subtotalLabel}>Total set aside</Text>
                <View style={styles.totalContainer}>
                  <Text style={styles.subtotalValue}>{formatCurrency(summary.taxToSetAside)}</Text>
                  <View style={styles.percentChip}>
                    <Text style={styles.percentChipText}>{formatPercent(summary.effectiveRate)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={styles.disclaimer}>
              {isNoSeTaxMode 
                ? 'Income tracking only. Consult your tax professional for S-Corp/partnership tax obligations.'
                : 'Estimates only. Not tax advice.'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#1e40af',
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16a34a',
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summarySetAside: {
    fontSize: 13,
    color: '#6b7280',
  },
  expandIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
  breakdown: {
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
    padding: 12,
    backgroundColor: '#fff',
  },
  breakdownGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  breakdownColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  breakdownValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  negative: {
    color: '#dc2626',
  },
  subtotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  subtotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  subtotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    fontVariant: ['tabular-nums'],
  },
  taxLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
  },
  thresholdNote: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  totalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  percentChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#fef3c7',
  },
  percentChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400e',
  },
  footer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 4,
  },
  footerNote: {
    fontSize: 11,
    color: '#6b7280',
    lineHeight: 16,
  },
  disclaimer: {
    fontSize: 10,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  noSeTaxNote: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  noSeTaxText: {
    fontSize: 11,
    color: '#0c4a6e',
    textAlign: 'center',
  },
});
