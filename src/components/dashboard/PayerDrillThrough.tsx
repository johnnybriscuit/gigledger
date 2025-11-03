/**
 * Payer drill-through view
 * Shows all gigs for a specific payer
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { getThemeColors, chartColors } from '../../lib/charts/colors';
import { useGigs } from '../../hooks/useGigs';

interface PayerDrillThroughProps {
  payer: string;
  onGigClick?: (gigId: string) => void;
}

export function PayerDrillThrough({ payer, onGigClick }: PayerDrillThroughProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const { data: allGigs } = useGigs();

  // Filter gigs for this payer
  const gigs = (allGigs || []).filter(gig => gig.payer?.name === payer);

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
      year: 'numeric',
    });
  };

  // Calculate totals
  const totalIncome = gigs.reduce((sum, gig) => {
    return sum + (gig.gross_amount || 0) + (gig.tips || 0) + (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0);
  }, 0);

  const totalGigs = gigs.length;

  return (
    <ScrollView style={styles.container}>
      {/* Summary */}
      <View style={[styles.summary, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Gigs</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {totalGigs}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Income</Text>
          <Text style={[styles.summaryValue, { color: chartColors.green, fontWeight: '600' }]}>
            {formatCurrency(totalIncome)}
          </Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Average per Gig</Text>
          <Text style={[styles.summaryValue, { color: colors.text }]}>
            {formatCurrency(totalGigs > 0 ? totalIncome / totalGigs : 0)}
          </Text>
        </View>
      </View>

      {/* Gigs List */}
      {gigs.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Gigs ({gigs.length})
          </Text>
          {gigs
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map((gig) => {
              const gigIncome = (gig.gross_amount || 0) + (gig.tips || 0) + (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0);
              
              return (
                <TouchableOpacity
                  key={gig.id}
                  style={[styles.record, { borderBottomColor: colors.border }]}
                  onPress={() => onGigClick?.(gig.id)}
                >
                  <View style={styles.recordHeader}>
                    <Text style={[styles.recordDate, { color: colors.textMuted }]}>
                      {formatDate(gig.date)}
                    </Text>
                    <Text style={[styles.recordAmount, { color: chartColors.green }]}>
                      {formatCurrency(gigIncome)}
                    </Text>
                  </View>
                  {gig.notes && (
                    <Text style={[styles.recordDescription, { color: colors.textMuted }]} numberOfLines={2}>
                      {gig.notes}
                    </Text>
                  )}
                  <View style={styles.recordDetails}>
                    {gig.gross_amount > 0 && (
                      <Text style={[styles.recordDetail, { color: colors.textMuted }]}>
                        Base: {formatCurrency(gig.gross_amount)}
                      </Text>
                    )}
                    {gig.tips > 0 && (
                      <Text style={[styles.recordDetail, { color: colors.textMuted }]}>
                        Tips: {formatCurrency(gig.tips)}
                      </Text>
                    )}
                    {gig.fees > 0 && (
                      <Text style={[styles.recordDetail, { color: chartColors.red }]}>
                        Fees: -{formatCurrency(gig.fees)}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
        </View>
      ) : (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No gigs found for {payer}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summary: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 24,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  record: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 4,
  },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordDescription: {
    fontSize: 13,
  },
  recordDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  recordDetail: {
    fontSize: 12,
  },
  empty: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
