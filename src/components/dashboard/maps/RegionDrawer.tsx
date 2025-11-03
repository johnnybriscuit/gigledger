/**
 * Region Drawer Component
 * Shows detailed gig list when clicking a map region
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors, chartColors } from '../../../lib/charts/colors';
import { useGigs } from '../../../hooks/useGigs';
import type { RegionStats } from '../../../hooks/useMapStats';

interface RegionDrawerProps {
  region: RegionStats | null;
  onClose: () => void;
}

type Tab = 'gigs' | 'payers';

export function RegionDrawer({ region, onClose }: RegionDrawerProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [activeTab, setActiveTab] = useState<Tab>('gigs');

  const { data: allGigs } = useGigs();

  if (!region) return null;

  // Filter gigs for this region
  const regionGigs = (allGigs || []).filter((gig: any) => {
    // Check if gig matches the region code
    // For US states, check state_code; for countries, check country_code
    if (region.code.length === 2 && region.code === region.code.toUpperCase()) {
      // Likely a state code
      return gig.state_code === region.code;
    } else {
      // Country code
      return gig.country_code === region.code;
    }
  });

  // Group gigs by payer
  const payerStats: Record<string, { count: number; total: number }> = {};
  regionGigs.forEach(gig => {
    const payerName = gig.payer?.name || 'Unknown';
    const income = 
      (gig.gross_amount || 0) +
      (gig.tips || 0) +
      (gig.per_diem || 0) +
      (gig.other_income || 0) -
      (gig.fees || 0);

    if (!payerStats[payerName]) {
      payerStats[payerName] = { count: 0, total: 0 };
    }
    payerStats[payerName].count++;
    payerStats[payerName].total += income;
  });

  const sortedPayers = Object.entries(payerStats)
    .sort(([, a], [, b]) => b.total - a.total);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>{region.label}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {region.gigsCount} {region.gigsCount === 1 ? 'gig' : 'gigs'} • {formatCurrency(region.totalIncome)}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeIcon, { color: colors.text }]}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: colors.cardBg, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'gigs' && styles.tabActive]}
          onPress={() => setActiveTab('gigs')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'gigs' ? chartColors.blue : colors.textMuted }
          ]}>
            Gigs ({regionGigs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payers' && styles.tabActive]}
          onPress={() => setActiveTab('payers')}
        >
          <Text style={[
            styles.tabText,
            { color: activeTab === 'payers' ? chartColors.blue : colors.textMuted }
          ]}>
            Payers ({sortedPayers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content}>
        {activeTab === 'gigs' ? (
          <View style={styles.gigsList}>
            {regionGigs
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              .map((gig) => {
                const income = 
                  (gig.gross_amount || 0) +
                  (gig.tips || 0) +
                  (gig.per_diem || 0) +
                  (gig.other_income || 0) -
                  (gig.fees || 0);

                return (
                  <View key={gig.id} style={[styles.gigCard, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
                    <View style={styles.gigHeader}>
                      <Text style={[styles.gigDate, { color: colors.textMuted }]}>
                        {formatDate(gig.date)}
                      </Text>
                      <Text style={[styles.gigAmount, { color: chartColors.green }]}>
                        {formatCurrency(income)}
                      </Text>
                    </View>
                    {gig.payer && (
                      <Text style={[styles.gigPayer, { color: colors.text }]}>
                        {gig.payer.name}
                      </Text>
                    )}
                    {gig.notes && (
                      <Text style={[styles.gigNotes, { color: colors.textMuted }]} numberOfLines={2}>
                        {gig.notes}
                      </Text>
                    )}
                    <View style={styles.gigDetails}>
                      {gig.gross_amount > 0 && (
                        <Text style={[styles.gigDetail, { color: colors.textMuted }]}>
                          Base: {formatCurrency(gig.gross_amount)}
                        </Text>
                      )}
                      {gig.tips > 0 && (
                        <Text style={[styles.gigDetail, { color: colors.textMuted }]}>
                          Tips: {formatCurrency(gig.tips)}
                        </Text>
                      )}
                      {gig.fees > 0 && (
                        <Text style={[styles.gigDetail, { color: chartColors.red }]}>
                          Fees: -{formatCurrency(gig.fees)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
          </View>
        ) : (
          <View style={styles.payersList}>
            {sortedPayers.map(([payerName, stats]) => (
              <View key={payerName} style={[styles.payerCard, { backgroundColor: colors.chartBg, borderColor: colors.border }]}>
                <View style={styles.payerHeader}>
                  <Text style={[styles.payerName, { color: colors.text }]}>
                    {payerName}
                  </Text>
                  <Text style={[styles.payerAmount, { color: chartColors.green }]}>
                    {formatCurrency(stats.total)}
                  </Text>
                </View>
                <Text style={[styles.payerStats, { color: colors.textMuted }]}>
                  {stats.count} {stats.count === 1 ? 'gig' : 'gigs'} • {formatCurrency(stats.total / stats.count)} avg
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
  },
  closeButton: {
    padding: 4,
  },
  closeIcon: {
    fontSize: 24,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  gigsList: {
    gap: 12,
  },
  gigCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  gigHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  gigDate: {
    fontSize: 12,
  },
  gigAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  gigPayer: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  gigNotes: {
    fontSize: 13,
    marginBottom: 6,
  },
  gigDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gigDetail: {
    fontSize: 12,
  },
  payersList: {
    gap: 12,
  },
  payerCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  payerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  payerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  payerAmount: {
    fontSize: 16,
    fontWeight: '600',
  },
  payerStats: {
    fontSize: 12,
  },
});
