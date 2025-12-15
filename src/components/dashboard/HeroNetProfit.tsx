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
}

export function HeroNetProfit({ dateRange = 'ytd', customStart, customEnd }: HeroNetProfitProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false);

  // Get current period data
  const currentData = useDashboardData(dateRange, customStart, customEnd);
  
  // Get last 30 days for comparison
  const last30Data = useDashboardData('last30');

  // Return null if data not ready - parent will show skeleton
  if (!currentData.isReady || !currentData.totals || !last30Data.totals) {
    return null;
  }

  const netProfit = currentData.totals.net;
  const last30Net = last30Data.totals.net;
  const delta = netProfit - last30Net;
  const deltaPercent = last30Net !== 0 ? (delta / Math.abs(last30Net)) * 100 : 0;

  // Get tax profile and calculate accurate breakdown
  const { data: taxProfile } = useTaxProfile();
  
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

  // Sparkline data (last 12 points from cumulative net)
  const sparklineData = currentData.cumulativeNet.slice(-12);

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg }]}>
      {/* Main Net Profit */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>Net Profit {dateRange.toUpperCase()}</Text>
      </View>

      <View style={styles.mainValue}>
        <Text style={[styles.amount, { color: getStatusColor(netProfit) }]}>
          {formatCurrency(netProfit)}
        </Text>

        {/* Delta chip */}
        <View style={[
          styles.deltaChip,
          { backgroundColor: delta >= 0 ? 'rgba(22, 163, 74, 0.1)' : 'rgba(239, 68, 68, 0.1)' }
        ]}>
          <Text style={[styles.deltaText, { color: getStatusColor(delta, 'change') }]}>
            {delta >= 0 ? '↑' : '↓'} {formatCurrency(Math.abs(delta))} ({Math.abs(deltaPercent).toFixed(1)}%)
          </Text>
        </View>
      </View>

      {/* Sparkline */}
      <View style={styles.sparklineContainer}>
        <MiniSparkline data={sparklineData} color={netProfit >= 0 ? chartColors.green : chartColors.red} />
      </View>

      {/* Set Aside pill */}
      <TouchableOpacity
        style={[styles.setAsidePill, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}
        onPress={() => setShowTaxBreakdown(!showTaxBreakdown)}
      >
        <Text style={[styles.setAsideText, { color: chartColors.amber }]}>
          💰 Set Aside: {formatCurrency(currentData.totals.taxes)} • {currentData.totals.effectiveTaxRate.toFixed(1)}% of net
        </Text>
      </TouchableOpacity>

      {/* Tax Breakdown (expandable) */}
      {showTaxBreakdown && taxBreakdown && (
        <View style={[styles.breakdown, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
          <Text style={[styles.breakdownTitle, { color: colors.text }]}>Tax Breakdown</Text>
          <View style={styles.breakdownRow}>
            <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>Self-Employment (15.3%)</Text>
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

// Mini sparkline component (simple line chart)
function MiniSparkline({ data, color }: { data: { month: string; value: number }[]; color: string }) {
  if (data.length === 0) return null;

  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // Calculate points for SVG path
  const width = 120;
  const height = 30;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  });

  const pathData = `M ${points.join(' L ')}`;

  if (Platform.OS === 'web') {
    return (
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        <path
          d={pathData}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // For mobile, show a simple text indicator
  return (
    <Text style={{ color, fontSize: 12 }}>
      {values[values.length - 1] > values[0] ? '📈 Trending up' : '📉 Trending down'}
    </Text>
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
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  mainValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  amount: {
    fontSize: 36,
    fontWeight: '700',
  },
  deltaChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  deltaText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sparklineContainer: {
    height: 30,
    marginBottom: 16,
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
  breakdownLabel: {
    fontSize: 13,
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
