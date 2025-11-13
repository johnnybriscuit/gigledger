/**
 * TaxSummary - Inline collapsible tax breakdown for gig forms
 * Replaces the full-screen modal with a compact, accessible component
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';

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
  filingStatus: 'single' | 'married_joint' | 'married_separate' | 'head';
  state: string;
  taxYear?: number;
  estimate: TaxEstimate;
  onRecalc?: () => void;
  isExpanded?: boolean;
  onToggle?: (expanded: boolean) => void;
}

export function TaxSummary({
  gross,
  tips = 0,
  perDiem = 0,
  fees = 0,
  otherIncome = 0,
  estimate,
  isExpanded: controlledExpanded,
  onToggle,
}: TaxSummaryProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const heightAnim = useRef(new Animated.Value(0)).current;

  // Calculate totals
  const totalIncome = gross + tips + perDiem + otherIncome;
  const netBeforeTax = totalIncome - fees;
  const netAfterTax = netBeforeTax - estimate.setAside;

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
      {/* Collapsed Summary Row */}
      <TouchableOpacity
        style={styles.summaryRow}
        onPress={handleToggle}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Tax summary. Net after tax: ${formatCurrency(netAfterTax)}. Set aside: ${formatCurrency(estimate.setAside)}. ${isExpanded ? 'Collapse' : 'Expand'} for breakdown`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <View style={styles.summaryLeft}>
          <Text style={styles.summaryLabel}>💰 Net after tax:</Text>
          <Text style={styles.summaryAmount}>{formatCurrency(netAfterTax)}</Text>
        </View>
        <View style={styles.summaryRight}>
          <Text style={styles.summarySetAside}>
            Set aside: {formatCurrency(estimate.setAside)} ({formatPercent(estimate.setAsidePct)})
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
              
              {gross > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Gross</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(gross)}</Text>
                </View>
              )}
              
              {tips > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Tips</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(tips)}</Text>
                </View>
              )}
              
              {perDiem > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Per Diem</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(perDiem)}</Text>
                </View>
              )}
              
              {otherIncome > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Other Income</Text>
                  <Text style={styles.breakdownValue}>{formatCurrency(otherIncome)}</Text>
                </View>
              )}
              
              {fees > 0 && (
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Fees</Text>
                  <Text style={[styles.breakdownValue, styles.negative]}>-{formatCurrency(fees)}</Text>
                </View>
              )}
              
              <View style={[styles.breakdownRow, styles.subtotalRow]}>
                <Text style={styles.subtotalLabel}>Subtotal</Text>
                <Text style={styles.subtotalValue}>{formatCurrency(netBeforeTax)}</Text>
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
                  {estimate.federal === 0 && estimate.thresholdNote && (
                    <Text style={styles.thresholdNote}>(below threshold)</Text>
                  )}
                </View>
                <Text style={styles.breakdownValue}>{formatCurrency(estimate.federal)}</Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>State</Text>
                </View>
                <Text style={styles.breakdownValue}>{formatCurrency(estimate.state)}</Text>
              </View>
              
              <View style={styles.breakdownRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>SE Tax</Text>
                </View>
                <Text style={styles.breakdownValue}>{formatCurrency(estimate.se)}</Text>
              </View>
              
              <View style={[styles.breakdownRow, styles.subtotalRow]}>
                <Text style={styles.subtotalLabel}>Total set aside</Text>
                <View style={styles.totalContainer}>
                  <Text style={styles.subtotalValue}>{formatCurrency(estimate.setAside)}</Text>
                  <View style={styles.percentChip}>
                    <Text style={styles.percentChipText}>{formatPercent(estimate.setAsidePct)}</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Footer Note */}
          <View style={styles.footer}>
            <Text style={styles.footerNote}>
              This is the marginal tax rate for this gig based on your projected annual income.
              Your overall effective tax rate may be lower.
            </Text>
            <Text style={styles.disclaimer}>Estimates only. Not tax advice.</Text>
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
});
