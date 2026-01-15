/**
 * Month drill-through view
 * Shows all gigs, expenses, and tax records for a specific month
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, chartColors } from '../../lib/charts/colors';
import { useGigs } from '../../hooks/useGigs';
import { getGigDisplayName } from '../../lib/gigDisplayName';
import { useExpenses } from '../../hooks/useExpenses';
import { useMileage } from '../../hooks/useMileage';

interface MonthDrillThroughProps {
  month: string; // e.g., "Jan 2025"
  onGigClick?: (gigId: string) => void;
  onExpenseClick?: (expenseId: string) => void;
}

export function MonthDrillThrough({ month, onGigClick, onExpenseClick }: MonthDrillThroughProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const { data: allGigs } = useGigs();
  const { data: allExpenses } = useExpenses();
  const { data: allMileage } = useMileage();

  // Parse month string to get date range
  const [monthName, year] = month.split(' ');
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
  const startDate = new Date(parseInt(year), monthIndex, 1);
  const endDate = new Date(parseInt(year), monthIndex + 1, 0);

  // Filter data for this month
  const gigs = (allGigs || []).filter(gig => {
    const gigDate = new Date(gig.date);
    return gigDate >= startDate && gigDate <= endDate;
  });

  const expenses = (allExpenses || []).filter(exp => {
    const expDate = new Date(exp.date);
    return expDate >= startDate && expDate <= endDate;
  });

  const mileage = (allMileage || []).filter(m => {
    const mDate = new Date(m.date);
    return mDate >= startDate && mDate <= endDate;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate totals
  const totalIncome = gigs.reduce((sum, gig) => {
    return sum + (gig.gross_amount || 0) + (gig.tips || 0) + (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0);
  }, 0);

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalMileage = mileage.reduce((sum, m) => sum + (m.miles * 0.70), 0);

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Income</Text>
          <Text style={[styles.summaryValue, { color: chartColors.blue }]}>
            {formatCurrency(totalIncome)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Expenses</Text>
          <Text style={[styles.summaryValue, { color: chartColors.red }]}>
            {formatCurrency(totalExpenses + totalMileage)}
          </Text>
        </View>
        <View style={[styles.summaryRow, styles.summaryTotal]}>
          <Text style={[styles.summaryLabel, { color: colors.text, fontWeight: '600' }]}>Net</Text>
          <Text style={[styles.summaryValue, { color: chartColors.green, fontWeight: '600' }]}>
            {formatCurrency(totalIncome - totalExpenses - totalMileage)}
          </Text>
        </View>
      </View>

      {/* Gigs */}
      {gigs.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Gigs ({gigs.length})
          </Text>
          {gigs.map((gig) => (
            <TouchableOpacity
              key={gig.id}
              style={[styles.record, { borderBottomColor: colors.border }]}
              onPress={() => onGigClick?.(gig.id)}
            >
              <View style={styles.recordMain}>
                <Text style={[styles.recordTitle, { color: colors.text }]}>{getGigDisplayName(gig)}</Text>
                <Text style={[styles.recordSubtitle, { color: colors.textMuted }]}>
                  {gig.payer?.name} • {formatDate(gig.date)}
                </Text>
              </View>
              <Text style={[styles.recordAmount, { color: chartColors.blue }]}>
                {formatCurrency(
                  (gig.gross_amount || 0) + (gig.tips || 0) + (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0)
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Expenses */}
      {expenses.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Expenses ({expenses.length})
          </Text>
          {expenses.map((exp) => (
            <TouchableOpacity
              key={exp.id}
              style={[styles.record, { borderBottomColor: colors.border }]}
              onPress={() => onExpenseClick?.(exp.id)}
            >
              <View style={styles.recordMain}>
                <Text style={[styles.recordTitle, { color: colors.text }]}>{exp.category}</Text>
                <Text style={[styles.recordSubtitle, { color: colors.textMuted }]}>
                  {exp.description} • {formatDate(exp.date)}
                </Text>
              </View>
              <Text style={[styles.recordAmount, { color: chartColors.red }]}>
                -{formatCurrency(exp.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Mileage */}
      {mileage.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Mileage ({mileage.length})
          </Text>
          {mileage.map((m) => (
            <View
              key={m.id}
              style={[styles.record, { borderBottomColor: colors.border }]}
            >
              <View style={styles.recordMain}>
                <Text style={[styles.recordTitle, { color: colors.text }]}>
                  {m.miles} miles
                </Text>
                <Text style={[styles.recordSubtitle, { color: colors.textMuted }]}>
                  {m.purpose} • {formatDate(m.date)}
                </Text>
              </View>
              <Text style={[styles.recordAmount, { color: chartColors.red }]}>
                -{formatCurrency(m.miles * 0.70)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {gigs.length === 0 && expenses.length === 0 && mileage.length === 0 && (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No records for this month
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  summary: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  summaryTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  section: {
    gap: 0,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  record: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recordMain: {
    flex: 1,
    gap: 4,
  },
  recordTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  recordSubtitle: {
    fontSize: 12,
  },
  recordAmount: {
    fontSize: 15,
    fontWeight: '600',
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
