/**
 * Hero Net Profit card with sparkline and "Set Aside" tax breakdown
 * Shows YTD net profit with delta vs last 30 days
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useIsSmallScreen } from '../../hooks/useIsSmallScreen';
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
  const isSmallScreen = useIsSmallScreen();
  const stackLayout = Platform.OS !== 'web' && isSmallScreen;
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
      style={styles.container}
      {...(Platform.OS === 'web' ? { className: 'dashboard-summary' } : {})}
    >
      {/* Decorative circle */}
      <View style={styles.decorCircle} />

      {/* Period label */}
      <Text style={styles.periodLabel}>YEAR TO DATE · NET PROFIT</Text>

      {/* Large net profit number */}
      <Text style={styles.netValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
        {formatCurrency(netProfit)}
      </Text>
      <Text style={styles.netSubtitle}>after expenses & deductions</Text>

      {/* Divider + 3-col row */}
      <View style={styles.divider} />
      <View style={styles.statsRow}>
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Gross Income</Text>
          <Text style={[styles.statValue, styles.statGreen]}>{formatCurrency(grossIncome)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Deductions</Text>
          <Text style={[styles.statValue, styles.statRed]}>−{formatCurrency(totalDeductions)}</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCol}>
          <Text style={styles.statLabel}>Tax Aside</Text>
          <Text style={[styles.statValue, styles.statAmber]}>{formatCurrency(currentData.totals.taxes)}</Text>
        </View>
      </View>

      {/* Callout bar — fold-out trigger */}
      <TouchableOpacity
        style={styles.calloutBar}
        onPress={() => setShowTaxBreakdown(!showTaxBreakdown)}
        activeOpacity={0.8}
      >
        <Text style={styles.calloutIcon}>💰</Text>
        <Text style={styles.calloutText}>See how your taxes are broken down ›</Text>
      </TouchableOpacity>

      {/* Tax Breakdown (expandable) — preserved behavior */}
      {showTaxBreakdown && taxBreakdown && (
        <View style={styles.breakdown}>
          <Text style={styles.breakdownTitle}>Tax Breakdown</Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabelContainer}>
              <View style={styles.breakdownLabelRow}>
                <Text style={styles.breakdownLabel}>Self-Employment (15.3%)</Text>
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
              <Text style={styles.breakdownSubLabel}>
                Applies to 92.35% of net earnings (~{((taxBreakdown.seTax / currentData.totals.net) * 100).toFixed(1)}% of net)
              </Text>
            </View>
            <Text style={styles.breakdownValue}>{formatCurrency(taxBreakdown.seTax)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Federal Income</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(taxBreakdown.federal)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>State Income</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(taxBreakdown.state)}</Text>
          </View>
          {taxBreakdown.local > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Local Income</Text>
              <Text style={styles.breakdownValue}>{formatCurrency(taxBreakdown.local)}</Text>
            </View>
          )}
          <View style={[styles.breakdownRow, styles.breakdownTotal]}>
            <Text style={[styles.breakdownLabel, { fontWeight: '600', color: '#fff' }]}>Total</Text>
            <Text style={[styles.breakdownValue, { color: '#FCD34D', fontWeight: '600' }]}>
              {formatCurrency(totalTaxes)}
            </Text>
          </View>
        </View>
      )}

      {/* Federal + State Tax Explanations (when breakdown is shown) */}
      {showTaxBreakdown && taxBreakdown && taxProfile && (
        <>
          <FederalTaxInfo
            netProfitYtd={currentData.totals.net}
            estimatedSelfEmploymentTaxYtd={taxBreakdown.seTax}
            federalTaxEstimate={taxBreakdown.federal}
            filingStatus={taxProfile.filingStatus}
          />
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
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  periodLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  netValue: {
    fontSize: 42,
    fontWeight: '700',
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 46,
    letterSpacing: -1,
  },
  netSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
    marginBottom: 18,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statCol: {
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: 12,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginBottom: 3,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  statGreen: { color: '#4ADE80' },
  statRed: { color: '#F87171' },
  statAmber: { color: '#FCD34D' },
  calloutBar: {
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  calloutIcon: {
    fontSize: 20,
  },
  calloutText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#D97706',
    flex: 1,
  },
  breakdown: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    color: 'rgba(255,255,255,0.6)',
  },
  breakdownSubLabel: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
    color: 'rgba(255,255,255,0.4)',
  },
  infoIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#fff',
  },
  breakdownTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
  },
});
