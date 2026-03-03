/**
 * Tax Summary Card for Dashboard
 * Shows YTD estimated tax rate and recommended set-aside
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
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const { data: taxProfile, isLoading } = useTaxProfile();
  const dashboardData = useDashboardData(dateRange);
  const [showExplanation, setShowExplanation] = useState(false);

  // Now safe to do conditional rendering
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

  // Return null if data not ready - parent will show skeleton
  if (!dashboardData.isReady || !dashboardData.taxBreakdown || !dashboardData.totals) {
    return null;
  }

  // Use tax breakdown from dashboard data (already calculated with new engine)
  const taxBreakdown = dashboardData.taxBreakdown;
  const hasIncome = dashboardData.totals.net > 0;

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
          {/* Rate hero box */}
          <View style={styles.rateHero}>
            <Text style={styles.rateLabel}>YTD ESTIMATED TAX RATE</Text>
            <Text style={styles.rateValue}>
              {formatTaxRate(dashboardData.totals.effectiveTaxRate / 100)}
            </Text>
            <Text style={styles.rateSub}>
              {formatTaxAmount(dashboardData.totals.taxes)} set aside on net income
            </Text>
          </View>

          {/* Divider rows */}
          <View style={styles.taxRow}>
            <Text style={styles.taxRowLabel}>Federal</Text>
            <Text style={styles.taxRowValue}>{formatTaxAmount(taxBreakdown.federal)}</Text>
          </View>
          <View style={styles.taxRow}>
            <Text style={styles.taxRowLabel}>State</Text>
            <Text style={styles.taxRowValue}>{formatTaxAmount(taxBreakdown.state)}</Text>
          </View>
          {taxBreakdown.local > 0 && (
            <View style={styles.taxRow}>
              <Text style={styles.taxRowLabel}>Local</Text>
              <Text style={styles.taxRowValue}>{formatTaxAmount(taxBreakdown.local)}</Text>
            </View>
          )}
          <View style={styles.taxRow}>
            <Text style={styles.taxRowLabel}>SE Tax</Text>
            <Text style={styles.taxRowValue}>{formatTaxAmount(taxBreakdown.seTax)}</Text>
          </View>

          {/* Amber tip — fold-out trigger */}
          <TouchableOpacity
            style={styles.tip}
            onPress={() => setShowExplanation(!showExplanation)}
            activeOpacity={0.7}
          >
            <Text style={styles.tipText}>
              💡 Set aside {formatTaxRate(dashboardData.totals.effectiveTaxRate / 100)} of each net payment for taxes ›
            </Text>
          </TouchableOpacity>

          {showExplanation && (
            <View style={styles.explanation}>
              <Text style={styles.explanationTitle}>How is this calculated?</Text>
              <Text style={styles.explanationText}>
                Your estimated tax rate is based on your year-to-date income and your tax profile settings. Net income = income after expenses, before taxes.
              </Text>
              <View style={styles.explanationSection}>
                <Text style={styles.explanationSubtitle}>📊 What's included:</Text>
                <Text style={styles.explanationBullet}>
                  • <Text style={styles.bold}>Federal Income Tax:</Text> Based on 2025 IRS tax brackets for your filing status
                </Text>
                <Text style={styles.explanationBullet}>
                  • <Text style={styles.bold}>State Tax:</Text> {taxProfile.state === 'TN' || taxProfile.state === 'TX' ? 'No state income tax in your state' : `Based on ${taxProfile.state} state tax rates`}
                </Text>
                {taxBreakdown.local > 0 && (
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
                  As a self-employed musician, taxes aren't automatically withheld from your gigs. Setting aside {formatTaxRate(dashboardData.totals.effectiveTaxRate / 100)} of net income ensures you'll have enough saved when quarterly estimated taxes are due.
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  updateLink: {
    fontSize: 13,
    color: '#2D5BE3',
    fontWeight: '600',
  },
  loading: {
    fontSize: 14,
    color: '#B0ADA8',
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  noProfile: {
    fontSize: 14,
    color: '#B0ADA8',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  setupButton: {
    backgroundColor: '#2D5BE3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 16,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  rateHero: {
    backgroundColor: '#EEF2FF',
    marginHorizontal: 10,
    marginBottom: 14,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  rateLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2D5BE3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#2D5BE3',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 40,
  },
  rateSub: {
    fontSize: 12,
    color: '#B0ADA8',
    marginTop: 2,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E3DE',
  },
  taxRowLabel: {
    fontSize: 14,
    color: '#7A7671',
  },
  taxRowValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#1A1A1A',
  },
  tip: {
    margin: 12,
    marginTop: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  explanation: {
    borderTopWidth: 1,
    borderTopColor: '#FDE68A',
    padding: 16,
    paddingTop: 12,
    backgroundColor: '#FFFBEB',
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
    marginBottom: 12,
  },
  explanationSection: {
    marginBottom: 16,
  },
  explanationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  explanationBullet: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: '#A16207',
    fontStyle: 'italic',
    marginTop: 8,
  },
  noData: {
    paddingVertical: 32,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#7A7671',
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 13,
    color: '#B0ADA8',
  },
});
