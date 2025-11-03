/**
 * Tax Summary Card for Dashboard
 * Shows YTD effective tax rate and recommended set-aside
 */

import React from 'react';
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
              {formatTaxRate(taxSummary.effectiveRate)}
            </Text>
            <Text style={styles.subtitle}>
              {formatTaxAmount(taxSummary.totalTax)} on {formatTaxAmount(ytdData.grossIncome)} income
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

          {/* Recommendation */}
          <View style={styles.recommendation}>
            <Text style={styles.recommendationText}>
              💡 Set aside {formatTaxRate(taxSummary.effectiveRate)} of each gig for taxes
            </Text>
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
    padding: 12,
  },
  recommendationText: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
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
