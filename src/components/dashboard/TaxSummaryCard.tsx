/**
 * Tax Summary Card for Dashboard
 * Shows W-2 and 1099 income in separate sections with split tax calculations
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native';
import { useTaxProfile } from '../../hooks/useTaxProfile';
import { calculateSplitTax, formatTaxAmount, formatTaxRate } from '../../tax/engine';
import { useDashboardData, type DateRange } from '../../hooks/useDashboardData';
import { colors } from '../../styles/theme';

interface TaxSummaryCardProps {
  dateRange?: DateRange;
  onUpdateProfile?: () => void;
}

export function TaxSummaryCard({ dateRange = 'ytd', onUpdateProfile }: TaxSummaryCardProps) {
  // ALL HOOKS MUST BE CALLED FIRST - before any conditional returns
  const { data: taxProfile, isLoading } = useTaxProfile();
  const dashboardData = useDashboardData(dateRange);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showW2Collapsed, setShowW2Collapsed] = useState(true);

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
  if (!dashboardData.isReady) {
    return null;
  }

  // Get income split and calculate total deductions
  const { gigIncome1099, gigIncomeW2, gigIncomeOther, expenseBreakdown } = dashboardData;
  
  // Sum all expense categories to get total deductions
  const totalDeductions = expenseBreakdown.reduce((sum, cat) => sum + cat.amount, 0);
  
  // Calculate split tax using new engine
  const splitTaxResult = calculateSplitTax(
    gigIncome1099,
    gigIncomeW2,
    totalDeductions,
    taxProfile
  );

  const hasIncome = gigIncome1099 > 0 || gigIncomeW2 > 0;

  const handleW4Link = () => {
    Linking.openURL('https://www.irs.gov/individuals/tax-withholding-estimator');
  };

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
          {/* SECTION 1: 1099 / Gig Income */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎵 1099 / Gig Income</Text>
            
            {/* Income breakdown */}
            <View style={styles.incomeRow}>
              <Text style={styles.incomeLabel}>Gross Income</Text>
              <Text style={styles.incomeValue}>{formatTaxAmount(splitTaxResult.income1099)}</Text>
            </View>
            <View style={styles.incomeRow}>
              <Text style={styles.incomeLabel}>Less Deductions</Text>
              <Text style={styles.incomeValueNegative}>-{formatTaxAmount(totalDeductions)}</Text>
            </View>
            <View style={[styles.incomeRow, styles.netRow]}>
              <Text style={styles.netLabel}>Net Income</Text>
              <Text style={styles.netValue}>{formatTaxAmount(splitTaxResult.netIncome1099)}</Text>
            </View>

            {/* Tax breakdown */}
            <View style={styles.divider} />
            
            <View style={styles.taxRow}>
              <Text style={styles.taxRowLabel}>SE Tax</Text>
              <Text style={styles.taxRowValue}>{formatTaxAmount(splitTaxResult.seTax)}</Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.taxRowLabel}>Federal Income Tax</Text>
              <Text style={styles.taxRowValue}>{formatTaxAmount(splitTaxResult.federalTax1099)}</Text>
            </View>
            <View style={styles.taxRow}>
              <Text style={styles.taxRowLabel}>State Tax</Text>
              {splitTaxResult.hasUnsupportedState ? (
                <View style={styles.unsupportedState}>
                  <Text style={styles.unsupportedStateText}>⚠️ Not calculated for {taxProfile.state}</Text>
                </View>
              ) : (
                <Text style={styles.taxRowValue}>{formatTaxAmount(splitTaxResult.stateTax1099)}</Text>
              )}
            </View>
            {splitTaxResult.localTax1099 > 0 && (
              <View style={styles.taxRow}>
                <Text style={styles.taxRowLabel}>Local Tax</Text>
                <Text style={styles.taxRowValue}>{formatTaxAmount(splitTaxResult.localTax1099)}</Text>
              </View>
            )}

            {/* Set aside highlight */}
            <View style={styles.divider} />
            <View style={styles.setAsideBox}>
              <Text style={styles.setAsideLabel}>💰 SET ASIDE FROM EACH GIG</Text>
              <Text style={styles.setAsidePercent}>{splitTaxResult.setAsidePercent}%</Text>
              <Text style={styles.setAsideTotal}>
                ~{formatTaxAmount(splitTaxResult.setAsideAmount)} total this year
              </Text>
            </View>

            {/* Quarterly payment estimate */}
            <View style={styles.quarterlyRow}>
              <Text style={styles.quarterlyLabel}>📅 Next quarterly payment est:</Text>
              <Text style={styles.quarterlyValue}>{formatTaxAmount(splitTaxResult.quarterlyPaymentEstimate)}</Text>
            </View>

            {/* Unsupported state tooltip */}
            {splitTaxResult.hasUnsupportedState && (
              <View style={styles.stateWarning}>
                <Text style={styles.stateWarningText}>
                  ⚠️ State tax estimates are not yet available for your state. Consult a tax professional for state tax guidance.
                </Text>
              </View>
            )}
          </View>

          {/* SECTION 2: W-2 / Employer Income */}
          {gigIncomeW2 > 0 ? (
            <View style={[styles.section, styles.w2Section]}>
              <Text style={styles.sectionTitle}>🏢 W-2 / Employer Income</Text>
              
              <View style={styles.incomeRow}>
                <Text style={styles.incomeLabel}>W-2 Income</Text>
                <Text style={styles.incomeValue}>{formatTaxAmount(gigIncomeW2)}</Text>
              </View>

              <View style={styles.w2Note}>
                <Text style={styles.w2NoteText}>{splitTaxResult.w2Note}</Text>
              </View>

              <TouchableOpacity style={styles.w4Button} onPress={handleW4Link}>
                <Text style={styles.w4ButtonText}>Check W-4 Withholding →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            !showW2Collapsed && (
              <TouchableOpacity 
                style={styles.addW2Row} 
                onPress={() => setShowW2Collapsed(true)}
              >
                <Text style={styles.addW2Text}>+ Have a W-2 job too? Add it in Contacts →</Text>
              </TouchableOpacity>
            )
          )}

          {/* SECTION 3: Other / Mixed Income */}
          {gigIncomeOther > 0 && (
            <View style={styles.otherSection}>
              <Text style={styles.otherText}>
                Mixed Income: {formatTaxAmount(gigIncomeOther)} — Update payer tax treatment for accurate estimates
              </Text>
            </View>
          )}

          {/* Explanation fold-out */}
          <TouchableOpacity
            style={styles.tip}
            onPress={() => setShowExplanation(!showExplanation)}
            activeOpacity={0.7}
          >
            <Text style={styles.tipText}>
              💡 See how your taxes are broken down ›
            </Text>
          </TouchableOpacity>

          {showExplanation && (
            <View style={styles.explanation}>
              <Text style={styles.explanationTitle}>How is this calculated?</Text>
              <Text style={styles.explanationText}>
                Your estimated tax rate is based on your year-to-date 1099 income and your tax profile settings. W-2 income is excluded because taxes are already withheld by your employer.
              </Text>
              <View style={styles.explanationSection}>
                <Text style={styles.explanationSubtitle}>📊 1099 Income Taxes:</Text>
                <Text style={styles.explanationBullet}>
                  • <Text style={styles.bold}>SE Tax:</Text> 15.3% (Social Security + Medicare) on net 1099 earnings
                </Text>
                <Text style={styles.explanationBullet}>
                  • <Text style={styles.bold}>Federal Income Tax:</Text> Based on 2025 IRS tax brackets for your filing status
                </Text>
                <Text style={styles.explanationBullet}>
                  • <Text style={styles.bold}>State Tax:</Text> {taxProfile.state === 'TN' || taxProfile.state === 'TX' ? 'No state income tax in your state' : `Based on ${taxProfile.state} state tax rates`}
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
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
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
    color: colors.text.DEFAULT,
  },
  updateLink: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  loading: {
    fontSize: 14,
    color: colors.text.subtle,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  noProfile: {
    fontSize: 14,
    color: colors.text.subtle,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  setupButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 10,
    marginBottom: 16,
  },
  setupButtonText: {
    color: colors.brand.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  // Section styles
  section: {
    paddingHorizontal: 10,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  w2Section: {
    backgroundColor: colors.surface.muted,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    marginBottom: 12,
  },
  // Income rows
  incomeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  incomeLabel: {
    fontSize: 14,
    color: colors.text.subtle,
  },
  incomeValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: colors.text.DEFAULT,
  },
  incomeValueNegative: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: colors.danger.DEFAULT,
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
    paddingTop: 10,
    marginTop: 4,
  },
  netLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  netValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: colors.text.DEFAULT,
  },
  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border.muted,
    marginVertical: 12,
  },
  // Tax rows
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  taxRowLabel: {
    fontSize: 14,
    color: colors.text.subtle,
  },
  taxRowValue: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: colors.text.DEFAULT,
  },
  unsupportedState: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unsupportedStateText: {
    fontSize: 12,
    color: colors.text.subtle,
    fontStyle: 'italic',
  },
  // Set aside box
  setAsideBox: {
    backgroundColor: colors.brand.muted,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  setAsideLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brand.DEFAULT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  setAsidePercent: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 36,
  },
  setAsideTotal: {
    fontSize: 12,
    color: colors.text.subtle,
    marginTop: 2,
  },
  // Quarterly payment
  quarterlyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.muted,
    borderRadius: 8,
    marginTop: 12,
  },
  quarterlyLabel: {
    fontSize: 13,
    color: colors.text.subtle,
  },
  quarterlyValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: colors.text.DEFAULT,
  },
  // State warning
  stateWarning: {
    backgroundColor: colors.warning.muted,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  stateWarningText: {
    fontSize: 12,
    color: colors.warning.DEFAULT,
    lineHeight: 18,
  },
  // W-2 section
  w2Note: {
    backgroundColor: colors.brand.muted,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 12,
  },
  w2NoteText: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
    lineHeight: 20,
  },
  w4Button: {
    backgroundColor: colors.brand.DEFAULT,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  w4ButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.brand.foreground,
  },
  addW2Row: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.muted,
  },
  addW2Text: {
    fontSize: 13,
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  // Other income section
  otherSection: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: colors.warning.muted,
    borderTopWidth: 1,
    borderTopColor: colors.warning.muted,
  },
  otherText: {
    fontSize: 13,
    color: colors.warning.DEFAULT,
    lineHeight: 18,
  },
  // Explanation
  tip: {
    margin: 12,
    marginTop: 12,
    backgroundColor: colors.warning.muted,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  tipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning.DEFAULT,
  },
  explanation: {
    borderTopWidth: 1,
    borderTopColor: colors.warning.muted,
    padding: 16,
    paddingTop: 12,
    backgroundColor: colors.warning.muted,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning.DEFAULT,
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 13,
    color: colors.warning.DEFAULT,
    lineHeight: 20,
    marginBottom: 12,
  },
  explanationSection: {
    marginBottom: 16,
  },
  explanationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.warning.DEFAULT,
    marginBottom: 8,
  },
  explanationBullet: {
    fontSize: 13,
    color: colors.warning.DEFAULT,
    lineHeight: 20,
    marginBottom: 6,
    paddingLeft: 8,
  },
  bold: {
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 11,
    color: colors.warning.DEFAULT,
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
    color: colors.text.subtle,
    marginBottom: 4,
  },
  noDataSubtext: {
    fontSize: 13,
    color: colors.text.subtle,
  },
});
