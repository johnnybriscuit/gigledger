/**
 * Tax Payment Reminder - Shows upcoming quarterly tax deadlines
 * Displays how much is set aside in tax buckets
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemePalette } from '../../styles/theme';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';
import { useAllocationTransactions } from '../../hooks/useAllocationTransactions';

interface TaxPaymentReminderProps {
  onDismiss?: () => void;
}

export function TaxPaymentReminder({ onDismiss }: TaxPaymentReminderProps) {
  const { theme } = useTheme();
  const colors = getThemePalette(theme);
  const { buckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();

  // Calculate next quarterly tax deadline
  const getNextTaxDeadline = () => {
    const now = new Date();
    const year = now.getFullYear();
    
    // Q1: April 15, Q2: June 15, Q3: September 15, Q4: January 15 (next year)
    const deadlines = [
      { quarter: 'Q1', date: new Date(year, 3, 15), label: 'April 15' },
      { quarter: 'Q2', date: new Date(year, 5, 15), label: 'June 15' },
      { quarter: 'Q3', date: new Date(year, 8, 15), label: 'September 15' },
      { quarter: 'Q4', date: new Date(year + 1, 0, 15), label: 'January 15' },
    ];

    const upcoming = deadlines.find(d => d.date > now);
    return upcoming || deadlines[0]; // Default to Q1 if past all deadlines
  };

  const deadline = getNextTaxDeadline();
  const daysUntil = Math.ceil((deadline.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  // Get tax bucket balances
  const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
  const stateTax = buckets.find(b => b.bucket_type === 'state_tax');
  
  const federalBalance = ytdTotals.find(t => t.bucket_id === federalTax?.id)?.total || 0;
  const stateBalance = ytdTotals.find(t => t.bucket_id === stateTax?.id)?.total || 0;
  const totalTaxSaved = federalBalance + stateBalance;

  // Don't show if no tax buckets configured
  if (!federalTax && !stateTax) {
    return null;
  }

  // Don't show if deadline is far away (more than 60 days)
  if (daysUntil > 60) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const urgencyLevel = daysUntil <= 7 ? 'urgent' : daysUntil <= 30 ? 'warning' : 'info';

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: urgencyLevel === 'urgent' 
            ? colors.error.muted 
            : urgencyLevel === 'warning'
            ? colors.warning.muted
            : colors.brand.muted,
          borderColor: urgencyLevel === 'urgent'
            ? colors.error.DEFAULT
            : urgencyLevel === 'warning'
            ? colors.warning.DEFAULT
            : colors.brand.DEFAULT,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.icon}>
          {urgencyLevel === 'urgent' ? '🚨' : urgencyLevel === 'warning' ? '⚠️' : '📅'}
        </Text>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text.DEFAULT }]}>
            {deadline.quarter} Tax Payment Due
          </Text>
          <Text style={[styles.subtitle, { color: colors.text.muted }]}>
            {deadline.label} • {daysUntil} days away
          </Text>
        </View>
        {onDismiss && (
          <TouchableOpacity onPress={onDismiss} style={styles.dismissButton}>
            <Text style={[styles.dismissText, { color: colors.text.subtle }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Balance */}
      <View style={styles.balanceSection}>
        <Text style={[styles.balanceLabel, { color: colors.text.muted }]}>
          You've set aside
        </Text>
        <Text style={[styles.balanceAmount, { color: colors.success.DEFAULT }]}>
          {formatCurrency(totalTaxSaved)}
        </Text>
        {federalTax && stateTax && (
          <Text style={[styles.breakdown, { color: colors.text.subtle }]}>
            {formatCurrency(federalBalance)} federal • {formatCurrency(stateBalance)} state
          </Text>
        )}
      </View>

      {/* Action hint */}
      <View style={[styles.actionHint, { backgroundColor: colors.surface.elevated }]}>
        <Text style={[styles.actionText, { color: colors.text.DEFAULT }]}>
          💡 <Text style={{ fontWeight: '400' }}>
            Remember to transfer this to your tax savings account before the deadline
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
  },
  dismissButton: {
    padding: 4,
  },
  dismissText: {
    fontSize: 18,
    fontWeight: '600',
  },
  balanceSection: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  balanceLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  breakdown: {
    fontSize: 12,
  },
  actionHint: {
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
