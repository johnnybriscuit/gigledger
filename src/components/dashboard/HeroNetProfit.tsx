/**
 * Hero Net Profit card with sparkline and "Set Aside" tax breakdown
 * Shows YTD net profit with delta vs last 30 days
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, chartColors, getStatusColor } from '../../lib/charts/colors';
import { useDashboardData } from '../../hooks/useDashboardData';
import { useTaxProfile } from '../../hooks/useTaxProfile';
import { calcYTDEffectiveRate } from '../../tax/engine';
import { FederalTaxInfo } from '../tax/FederalTaxInfo';
import { StateTaxInfo } from '../tax/StateTaxInfo';

interface HeroNetProfitProps {
  dateRange?: 'ytd' | 'last30' | 'last90' | 'lastYear' | 'custom';
  customStart?: Date;
  customEnd?: Date;
  payerId?: string | null;
}

export function HeroNetProfit({ dateRange = 'ytd', customStart, customEnd, payerId }: HeroNetProfitProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // Get current period data
  const currentData = useDashboardData(dateRange, customStart, customEnd, payerId);
  
  // Get last 30 days for comparison
  const last30Data = useDashboardData('last30', undefined, undefined, payerId);

  // Get tax profile and calculate accurate breakdown
  const { data: taxProfile } = useTaxProfile();

  // Return null if data not ready - parent will show skeleton
  // IMPORTANT: Must be AFTER all hooks to avoid React hooks violation
  if (!currentData.isReady || !currentData.totals || !last30Data.totals) {
    return null;
  }

  const netProfit = currentData.totals.net;
  // Calculate gross income from income breakdown
  const grossIncome = currentData.incomeBreakdown.gross + currentData.incomeBreakdown.tips + 
                      currentData.incomeBreakdown.perDiem + currentData.incomeBreakdown.other;
  // Calculate total deductions from expense breakdown and mileage
  const totalDeductions = currentData.expenseBreakdown.reduce((sum, exp) => sum + exp.amount, 0);
  const last30Net = last30Data.totals.net;
  const delta = netProfit - last30Net;
  const deltaPercent = last30Net !== 0 ? (delta / Math.abs(last30Net)) * 100 : 0;
  
  let taxBreakdown = null;
  let totalTaxes = currentData.totals.taxes;
  let effectiveRate = currentData.totals.effectiveTaxRate;
  
  if (taxProfile && currentData.totals.net > 0) {
    try {
      const ytdData = {
        grossIncome: currentData.totals.net + currentData.totals.taxes,
        adjustments: 0,
        netSE: currentData.totals.net,
      };
      const taxSummary = calcYTDEffectiveRate(ytdData, taxProfile);
      taxBreakdown = taxSummary.breakdown;
      totalTaxes = taxSummary.totalTax;
      effectiveRate = taxSummary.effectiveRate * 100;
    } catch (error) {
      console.error('Error calculating tax breakdown:', error);
    }
  }

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };


  return (
    <View 
      style={[styles.container, { backgroundColor: colors.cardBg }]}
      {...(Platform.OS === 'web' ? { className: 'dashboard-summary' } : {})}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Financial Overview {dateRange.toUpperCase()}</Text>
      </View>

      {/* Three-column layout: Gross → Deductions → Net Profit */}
      <View style={styles.metricsRow}>
        {/* Gross Income */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Gross Income</Text>
          <Text style={[styles.metricAmount, { color: chartColors.green }]}>
            {formatCurrency(grossIncome)}
          </Text>
        </View>

        {/* Arrow */}
        <View style={styles.arrowContainer}>
          <Text style={[styles.arrow, { color: colors.textMuted }]}>−</Text>
        </View>

        {/* Deductions */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Deductions</Text>
          <Text style={[styles.metricAmount, { color: chartColors.red }]}>
            {formatCurrency(totalDeductions)}
          </Text>
        </View>

        {/* Equals */}
        <View style={styles.arrowContainer}>
          <Text style={[styles.arrow, { color: colors.textMuted }]}>=</Text>
        </View>

        {/* Net Profit */}
        <View style={styles.metricItem}>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>Net Profit</Text>
          <Text style={[styles.metricAmount, { color: getStatusColor(netProfit) }]}>
            {formatCurrency(netProfit)}
          </Text>
          {/* Delta chip */}
          <View style={[
            styles.deltaChip,
            { backgroundColor: delta >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
          ]}>
            <Text style={[styles.deltaText, { color: getStatusColor(delta, 'change') }]}>
              {delta >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(delta))}
            </Text>
          </View>
        </View>
      </View>

      {/* Set Aside pill */}
      <TouchableOpacity
        style={[styles.setAsidePill, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
        onPress={() => setShowTaxBreakdown(!showTaxBreakdown)}
      >
        <Text style={[styles.setAsideText, { color: chartColors.amber }]}>
          💰 Set Aside: {formatCurrency(currentData.totals.taxes)} • {currentData.totals.effectiveTaxRate.toFixed(1)}% of net income
        </Text>
      </TouchableOpacity>

      {/* Tax Breakdown (expandable) */}
      {showTaxBreakdown && taxBreakdown && (
        <View style={[styles.breakdown, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
          <Text style={[styles.breakdownTitle, { color: colors.text }]}>Tax Breakdown</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabelContainer}>
              <View style={styles.breakdownLabelRow}>
                <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Self-Employment (15.3%)</Text>
                <TouchableOpacity
                  style={styles.infoIcon}
                  onPress={() => {
                    if (Platform.OS === 'web') {
                      alert('Why 15.3% vs ~14.1%?\n\nSelf-employment tax is 15.3%, but it applies to 92.35% of net earnings. That\'s why it appears as ~14.1% of net.');
                    }
                  }}
                >
                  <Text style={styles.infoIconText}>ⓘ</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.breakdownSubLabel, { color: colors.textMuted }]}>
                Applies to 92.35% of net earnings (~{((taxBreakdown.seTax / currentData.totals.net) * 100).toFixed(1)}% of net)
              </Text>
            </View>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(taxBreakdown.seTax)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Federal Income</Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(taxBreakdown.federal)}
            </Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>State Income</Text>
            <Text style={[styles.breakdownValue, { color: colors.text }]}>
              {formatCurrency(taxBreakdown.state)}
            </Text>
          </View>
          {taxBreakdown.local > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Local Income</Text>
              <Text style={[styles.breakdownValue, { color: colors.text }]}>
                {formatCurrency(taxBreakdown.local)}
              </Text>
            </View>
          )}
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={[styles.breakdownLabel, { color: colors.text, fontWeight: '600' }]}>Total</Text>
            <Text style={[styles.breakdownValue, { color: chartColors.amber, fontWeight: '600' }]}>
              {formatCurrency(totalTaxes)}
            </Text>
          </View>
        </View>
      )}

      {/* Federal Tax Explanation (when breakdown is shown) */}
      {showTaxBreakdown && taxBreakdown && taxProfile && (
        <>
          <FederalTaxInfo
            netProfitYtd={currentData.totals.net}
            estimatedSelfEmploymentTaxYtd={taxBreakdown.seTax}
            federalTaxEstimate={taxBreakdown.federal}
            filingStatus={taxProfile.filingStatus}
          />
          
          {/* State Tax Explanation */}
          <StateTaxInfo
            netProfitYtd={currentData.totals.net}
            estimatedSelfEmploymentTaxYtd={taxBreakdown.seTax}
            stateTaxEstimate={taxBreakdown.state}
            localTaxEstimate={taxBreakdown.local}
            filingStatus={taxProfile.filingStatus}
            state={taxProfile.state}
            county={taxProfile.county}
          />
        </>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
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
  header: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  metricAmount: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  arrowContainer: {
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 24,
    fontWeight: '300',
  },
  deltaChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  deltaText: {
    fontSize: 11,
    fontWeight: '600',
  },
  setAsidePill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  setAsideText: {
    fontSize: 14,
    fontWeight: '600',
  },
  breakdown: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabelContainer: {
    flex: 1,
    marginRight: 12,
  },
  breakdownLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  breakdownLabel: {
    fontSize: 13,
  },
  breakdownSubLabel: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  infoIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(107, 114, 128, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
});
