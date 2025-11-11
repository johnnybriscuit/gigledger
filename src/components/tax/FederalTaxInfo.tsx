/**
 * Federal Tax Info Component
 * 
 * Explains when federal income tax starts applying based on user's actual
 * filing status and YTD numbers. Uses our tax engine constants - no hardcoded values.
 * 
 * Example scenarios:
 * 
 * 1. Low income (below standard deduction):
 *    Net: $1,391, SE Tax: $196, Filing: Single
 *    → Federal: $0
 *    → Threshold: ~$15,100 (standard deduction + half SE tax)
 *    → Message: "Federal tax starts once you're above ~$15,100"
 * 
 * 2. Above standard deduction:
 *    Net: $50,000, SE Tax: $7,065, Filing: Single
 *    → Federal: ~$2,800
 *    → Message: "You're above the standard deduction, so we estimate $2,800"
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../lib/charts/colors';
import config2025, { type FilingStatus } from '../../tax/config/2025';

interface FederalTaxInfoProps {
  netProfitYtd: number;
  estimatedSelfEmploymentTaxYtd: number;
  federalTaxEstimate: number;
  filingStatus: FilingStatus;
}

/**
 * Get human-readable filing status label
 */
function getFilingStatusLabel(status: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    single: 'Single',
    married_joint: 'Married Filing Jointly',
    married_separate: 'Married Filing Separately',
    head: 'Head of Household',
  };
  return labels[status];
}

/**
 * Format currency for display (no decimals)
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function FederalTaxInfo({
  netProfitYtd,
  estimatedSelfEmploymentTaxYtd,
  federalTaxEstimate,
  filingStatus,
}: FederalTaxInfoProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  // Get standard deduction from our 2025 config (single source of truth)
  const standardDeduction = config2025.federal.standardDeduction[filingStatus];
  
  // Calculate half SE tax deduction (above-the-line deduction)
  const halfSeDeduction = estimatedSelfEmploymentTaxYtd / 2;
  
  // Calculate taxable income (same formula as tax engine)
  const taxableIncome = Math.max(0, netProfitYtd - halfSeDeduction - standardDeduction);
  
  // Calculate approximate threshold where federal tax starts
  // This is when: netProfit - halfSE - standardDeduction > 0
  // Solving for netProfit: netProfit > standardDeduction + halfSE
  const federalStartThreshold = standardDeduction + halfSeDeduction;
  
  const filingStatusLabel = getFilingStatusLabel(filingStatus);
  const isBelowThreshold = federalTaxEstimate === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
      {/* Info icon */}
      <View style={styles.header}>
        <Text style={styles.icon}>💡</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          Federal Income Tax Explained
        </Text>
      </View>

      {/* Main explanation */}
      <View style={styles.content}>
        {isBelowThreshold ? (
          <>
            <Text style={[styles.mainText, { color: colors.text }]}>
              Because your estimated taxable income is below the standard deduction for{' '}
              <Text style={styles.bold}>{filingStatusLabel}</Text>, your estimated federal 
              income tax is <Text style={styles.bold}>$0</Text> so far.
            </Text>
            
            <Text style={[styles.thresholdText, { color: colors.textMuted }]}>
              Based on your current settings, federal income tax would start once your 
              year-to-date net profit is above approximately{' '}
              <Text style={[styles.bold, { color: colors.text }]}>
                {formatCurrency(federalStartThreshold)}
              </Text>.
            </Text>
          </>
        ) : (
          <Text style={[styles.mainText, { color: colors.text }]}>
            You're above the standard deduction for{' '}
            <Text style={styles.bold}>{filingStatusLabel}</Text>, so we estimate{' '}
            <Text style={styles.bold}>{formatCurrency(federalTaxEstimate)}</Text> in 
            federal income tax so far.
          </Text>
        )}
      </View>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.cardBg }]}>
        <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
          These are simplified estimates for planning only and not tax advice. Actual tax 
          depends on your full-year income and situation.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
      },
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  icon: {
    fontSize: 18,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    gap: 12,
  },
  mainText: {
    fontSize: 14,
    lineHeight: 20,
  },
  thresholdText: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  bold: {
    fontWeight: '600',
  },
  disclaimer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  disclaimerText: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
});
