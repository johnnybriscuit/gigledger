/**
 * Tax Summary Card for Dashboard
 * Shows YTD effective tax rate and recommended set-aside
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTaxProfile } from '../../hooks/useTaxProfile';
import { calcYTDEffectiveRate, formatTaxAmount, formatTaxRate } from '../../tax/engine';
import { useDashboardData, type DateRange } from '../../hooks/useDashboardData';

interface TaxSummaryCardProps {
  dateRange?: DateRange;
  onUpdateProfile?: () => void;
}

export function TaxSummaryCard({ dateRange = 'ytd', onUpdateProfile }: TaxSummaryCardProps) {
  const { data: taxProfile, isLoading } = useTaxProfile();
  const dashboardData = useDashboardData(dateRange);
  const [showExplanation, setShowExplanation] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Tax Summary</Text>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  if (!taxProfile) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>💰 Tax Summary</Text>
        <Text style={styles.noProfile}>Set up your tax profile to see estimates</Text>
        {onUpdateProfile && (
          <TouchableOpacity style={styles.setupButton} onPress={onUpdateProfile}>
            <Text style={styles.setupButtonText}>Set Up Tax Profile</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Calculate YTD effective rate
  const ytdData = {
    grossIncome: dashboardData.totals.net + dashboardData.totals.taxes, // Approximate
    adjustments: 0,
    netSE: dashboardData.totals.net,
  };

  let taxSummary;
  try {
    taxSummary = calcYTDEffectiveRate(ytdData, taxProfile);
  } catch (error) {
    console.error('Error calculating YTD tax rate:', error);
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Tax Summary</Text>
        <Text style={styles.error}>Unable to calculate tax estimate</Text>
      </View>
    );
  }

  const hasIncome = ytdData.grossIncome > 0;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Tax Summary</Text>
        {onUpdateProfile && (
          <TouchableOpacity onPress={onUpdateProfile}>
            <Text style={styles.updateLink}>Update</Text>
          </TouchableOpacity>
        )}
      </View>

      {hasIncome ? (
        <>
          {/* Effective Tax Rate */}
          <View style={styles.mainMetric}>
            <Text style={styles.label}>YTD Effective Tax Rate</Text>
            <Text style={styles.bigNumber}>
              {formatTaxRate(dashboardData.totals.effectiveTaxRate / 100)}
            </Text>
            <Text style={styles.subtitle}>
              {formatTaxAmount(dashboardData.totals.taxes)} set aside on {formatTaxAmount(dashboardData.totals.net)} net profit
            </Text>
          </View>

          {/* Breakdown */}
          <View style={styles.breakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Federal</Text>
              <Text style={styles.breakdownValue}>
                {formatTaxAmount(taxSummary.breakdown.federal)}
              </Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>State</Text>
              <Text style={styles.breakdownValue}>
                {formatTaxAmount(taxSummary.breakdown.state)}
              </Text>
            </View>
            {taxSummary.breakdown.local > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Local</Text>
                <Text style={styles.breakdownValue}>
                  {formatTaxAmount(taxSummary.breakdown.local)}
                </Text>
              </View>
            )}
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>SE Tax</Text>
              <Text style={styles.breakdownValue}>
                {formatTaxAmount(taxSummary.breakdown.seTax)}
              </Text>
            </View>
          </View>

          {/* Recommendation with Explanation */}
          <View style={styles.recommendation}>
            <TouchableOpacity 
              style={styles.recommendationHeader}
              onPress={() => setShowExplanation(!showExplanation)}
              activeOpacity={0.7}
            >
              <Text style={styles.recommendationText}>
                💡 Set aside {formatTaxRate(taxSummary.effectiveRate)} of each gig for taxes
              </Text>
              <Text style={styles.expandIcon}>
                {showExplanation ? '▼' : '▶'}
              </Text>
            </TouchableOpacity>
            
            {showExplanation && (
              <View style={styles.explanation}>
                <Text style={styles.explanationTitle}>How is this calculated?</Text>
                
                <Text style={styles.explanationText}>
                  Your effective tax rate is based on your year-to-date income and your tax profile settings.
                </Text>
                
                <View style={styles.explanationSection}>
                  <Text style={styles.explanationSubtitle}>📊 What's included:</Text>
                  <Text style={styles.explanationBullet}>
                    • <Text style={styles.bold}>Federal Income Tax:</Text> Based on 2025 IRS tax brackets for your filing status
                  </Text>
                  <Text style={styles.explanationBullet}>
                    • <Text style={styles.bold}>State Tax:</Text> {taxProfile.state === 'TN' || taxProfile.state === 'TX' ? 'No state income tax in your state' : `Based on ${taxProfile.state} state tax rates`}
                  </Text>
                  {taxSummary.breakdown.local > 0 && (
                    <Text style={styles.explanationBullet}>
                      • <Text style={styles.bold}>Local Tax:</Text> Additional local taxes for your area
                    </Text>
                  )}
                  <Text style={styles.explanationBullet}>
                    • <Text style={styles.bold}>Self-Employment Tax:</Text> 15.3% (Social Security + Medicare) on net earnings
                  </Text>
                </View>
                
                <View style={styles.explanationSection}>
                  <Text style={styles.explanationSubtitle}>💰 Why set aside this amount?</Text>
                  <Text style={styles.explanationText}>
                    As a self-employed musician, taxes aren't automatically withheld from your gigs. Setting aside {formatTaxRate(taxSummary.effectiveRate)} ensures you'll have enough saved when quarterly estimated taxes are due.
                  </Text>
                </View>
                
                <View style={styles.explanationSection}>
                  <Text style={styles.explanationSubtitle}>📅 When to pay:</Text>
                  <Text style={styles.explanationText}>
                    Quarterly estimated taxes are due April 15, June 15, September 15, and January 15. You can also pay annually when filing your tax return.
                  </Text>
                </View>
                
                <Text style={styles.disclaimer}>
                  💡 This is an estimate based on your profile. Consult a tax professional for personalized advice.
                </Text>
              </View>
            )}
          </View>
        </>
      ) : (
        <View style={styles.noData}>
          <Text style={styles.noDataText}>No income recorded yet</Text>
          <Text style={styles.noDataSubtext}>Add your first gig to see tax estimates</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  updateLink: {
    fontSize: 14,
    color: '#2563eb',
    fontWeight: '500',
  },
  loading: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  noProfile: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  setupButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  error: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
    paddingVertical: 20,
  },
  mainMetric: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  breakdown: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#374151',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  recommendation: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    overflow: 'hidden',
  },
  recommendationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  recommendationText: {
    fontSize: 13,
    color: '#92400e',
    flex: 1,
  },
  expandIcon: {
    fontSize: 12,
    color: '#92400e',
    marginLeft: 8,
  },
  explanation: {
    borderTopWidth: 1,
    borderTopColor: '#fde68a',
    padding: 16,
    paddingTop: 12,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
    marginBottom: 12,
  },
  explanationSection: {
    marginBottom: 16,
  },
  explanationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  explanationBullet: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: '#a16207',
    fontStyle: 'italic',
    marginTop: 8,
  },
  noData: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 13,
    color: '#9ca3af',
  },
});
