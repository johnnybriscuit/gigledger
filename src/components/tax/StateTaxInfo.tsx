/**
 * State Tax Info Component
 * 
 * Explains state income tax based on user's state of residence.
 * Customized messaging for each state with income tax.
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors } from '../../lib/charts/colors';
import config2025, { type FilingStatus, type StateCode } from '../../tax/config/2025';

interface StateTaxInfoProps {
  netProfitYtd: number;
  estimatedSelfEmploymentTaxYtd: number;
  stateTaxEstimate: number;
  localTaxEstimate: number;
  filingStatus: FilingStatus;
  state: StateCode;
  county?: string;
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

/**
 * Get state name from code
 */
function getStateName(code: StateCode): string {
  const names: Record<StateCode, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas',
    CA: 'California', CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware',
    FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
    IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas',
    KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada',
    NH: 'New Hampshire', NJ: 'New Jersey', NM: 'New Mexico', NY: 'New York',
    NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
    OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah',
    VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia',
    WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
  };
  return names[code];
}

/**
 * Get state-specific explanation
 */
function getStateExplanation(
  state: StateCode,
  stateTaxEstimate: number,
  localTaxEstimate: number,
  filingStatus: FilingStatus,
  standardDeduction: number,
  taxableIncome: number,
  county?: string
): { title: string; mainText: string; additionalInfo?: string } {
  const stateName = getStateName(state);
  const filingStatusLabel = getFilingStatusLabel(filingStatus);
  const isBelowThreshold = stateTaxEstimate === 0;
  const hasLocalTax = localTaxEstimate > 0;

  // No state income tax states
  if (state === 'TN' || state === 'TX' || state === 'FL' || state === 'WA' || 
      state === 'NV' || state === 'SD' || state === 'WY' || state === 'AK') {
    return {
      title: `${stateName} State Income Tax`,
      mainText: `${stateName} does not have a state income tax on wages and self-employment income. You only need to pay federal income tax and self-employment tax.`,
    };
  }

  // Maryland - progressive brackets + county tax
  if (state === 'MD') {
    const countyInfo = county 
      ? ` Your ${county} County tax is calculated as a percentage of your Maryland taxable income.`
      : ' Maryland also has county taxes - set your county in tax settings for accurate estimates.';

    if (isBelowThreshold) {
      return {
        title: 'Maryland State Income Tax Explained',
        mainText: `Because your estimated taxable income is below the Maryland standard deduction for ${filingStatusLabel} (${formatCurrency(standardDeduction)}), your estimated Maryland state income tax is $0 so far.`,
        additionalInfo: `Maryland has progressive tax brackets ranging from 2% to 5.75%.${countyInfo} State tax would start once your year-to-date net profit exceeds approximately ${formatCurrency(standardDeduction)}.`,
      };
    }

    return {
      title: 'Maryland State Income Tax Explained',
      mainText: `You're above the Maryland standard deduction, so we estimate ${formatCurrency(stateTaxEstimate)} in state income tax${hasLocalTax ? ` and ${formatCurrency(localTaxEstimate)} in ${county} County tax` : ''} so far.`,
      additionalInfo: `Maryland uses progressive tax brackets from 2% to 5.75% based on your taxable income.${countyInfo}`,
    };
  }

  // New York - progressive brackets + NYC/Yonkers
  if (state === 'NY') {
    const localInfo = hasLocalTax 
      ? ' You also have NYC or Yonkers local tax based on your residency.'
      : ' If you live in NYC or Yonkers, update your tax settings to include local taxes.';

    if (isBelowThreshold) {
      return {
        title: 'New York State Income Tax Explained',
        mainText: `Because your estimated taxable income is below the New York standard deduction for ${filingStatusLabel} (${formatCurrency(standardDeduction)}), your estimated New York state income tax is $0 so far.`,
        additionalInfo: `New York has progressive tax brackets ranging from 4% to 10.9%.${localInfo}`,
      };
    }

    return {
      title: 'New York State Income Tax Explained',
      mainText: `You're above the New York standard deduction, so we estimate ${formatCurrency(stateTaxEstimate)} in state income tax${hasLocalTax ? ` and ${formatCurrency(localTaxEstimate)} in local tax` : ''} so far.`,
      additionalInfo: `New York uses progressive tax brackets from 4% to 10.9%.${localInfo}`,
    };
  }

  // California - progressive brackets + millionaire surtax
  if (state === 'CA') {
    if (isBelowThreshold) {
      return {
        title: 'California State Income Tax Explained',
        mainText: `Because your estimated taxable income is below the California standard deduction for ${filingStatusLabel} (${formatCurrency(standardDeduction)}), your estimated California state income tax is $0 so far.`,
        additionalInfo: 'California has progressive tax brackets ranging from 1% to 13.3%, with an additional 1% Mental Health Services Tax on income over $1 million.',
      };
    }

    return {
      title: 'California State Income Tax Explained',
      mainText: `You're above the California standard deduction, so we estimate ${formatCurrency(stateTaxEstimate)} in state income tax so far.`,
      additionalInfo: 'California uses progressive tax brackets from 1% to 13.3%, with an additional 1% Mental Health Services Tax on income over $1 million.',
    };
  }

  // Generic state with income tax
  if (isBelowThreshold) {
    return {
      title: `${stateName} State Income Tax Explained`,
      mainText: `Because your estimated taxable income is below the ${stateName} standard deduction for ${filingStatusLabel} (${formatCurrency(standardDeduction)}), your estimated state income tax is $0 so far.`,
      additionalInfo: `State tax would start once your year-to-date net profit exceeds approximately ${formatCurrency(standardDeduction)}.`,
    };
  }

  return {
    title: `${stateName} State Income Tax Explained`,
    mainText: `You're above the ${stateName} standard deduction, so we estimate ${formatCurrency(stateTaxEstimate)} in state income tax so far.`,
  };
}

export function StateTaxInfo({
  netProfitYtd,
  estimatedSelfEmploymentTaxYtd,
  stateTaxEstimate,
  localTaxEstimate,
  filingStatus,
  state,
  county,
}: StateTaxInfoProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  // Get state config
  const stateConfig = config2025.states[state];
  const standardDeduction = stateConfig.standardDeduction[filingStatus];
  
  // Calculate half SE tax deduction
  const halfSeDeduction = estimatedSelfEmploymentTaxYtd / 2;
  
  // Calculate taxable income (same formula as tax engine)
  const taxableIncome = Math.max(0, netProfitYtd - halfSeDeduction - standardDeduction);

  const explanation = getStateExplanation(
    state,
    stateTaxEstimate,
    localTaxEstimate,
    filingStatus,
    standardDeduction,
    taxableIncome,
    county
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
      {/* Info icon */}
      <View style={styles.header}>
        <Text style={styles.icon}>🏛️</Text>
        <Text style={[styles.title, { color: colors.text }]}>
          {explanation.title}
        </Text>
      </View>

      {/* Main explanation */}
      <View style={styles.content}>
        <Text style={[styles.mainText, { color: colors.text }]}>
          {explanation.mainText}
        </Text>
        
        {explanation.additionalInfo && (
          <Text style={[styles.additionalText, { color: colors.textMuted }]}>
            {explanation.additionalInfo}
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
  additionalText: {
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
