// @ts-nocheck
/**
 * Enhanced Premium Dashboard
 * Features: Hero card, quick actions, interactive charts, drill-through
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { HeroNetProfit } from './HeroNetProfit';
import { QuickStats } from './QuickStats';
import { MonthlyOverview } from './MonthlyOverview';
import { CumulativeNet } from './CumulativeNet';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { TopPayers } from './TopPayers';
import { TaxSummaryCard } from './TaxSummaryCard';
import { SidePanel } from '../SidePanel';
import { MonthDrillThrough } from './MonthDrillThrough';
import { PayerDrillThrough } from './PayerDrillThrough';
import { MapCard } from './maps/MapCard';
import { useDashboardData, type DateRange } from '../../hooks/useDashboardData';
import { DateRangeFilter } from '../DateRangeFilter';
import { SkeletonDashboardCard } from '../SkeletonCard';
import { perf } from '../../lib/performance';
import { spacing } from '../../styles/theme';
import { useEffect } from 'react';
import { UsageWidget } from '../UsageWidget';

interface EnhancedDashboardProps {
  dateRange: DateRange;
  customStart?: Date;
  customEnd?: Date;
  payerId?: string | null;
  onDateRangeChange: (range: DateRange) => void;
  onCustomRangeChange?: (start: Date, end: Date) => void;
  onPayerChange?: (payerId: string | null) => void;
  onNavigateToExpenses?: () => void;
  onNavigateToGigs?: (payerFilter?: string) => void;
  onAddGig?: () => void;
  onAddExpense?: () => void;
  onExport?: () => void;
}

export function EnhancedDashboard({
  dateRange,
  customStart,
  customEnd,
  payerId,
  onDateRangeChange,
  onPayerChange,
  onNavigateToExpenses,
  onNavigateToGigs,
  onAddGig,
  onAddExpense,
  onExport,
}: EnhancedDashboardProps) {
  const { isDesktop, isTablet } = useResponsive();
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const [drillThroughMonth, setDrillThroughMonth] = useState<string | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);

  // Fetch dashboard data
  const data = useDashboardData(dateRange, customStart, customEnd, payerId);

  // Mark when dashboard is interactive (data loaded)
  useEffect(() => {
    if (data && data.isReady && data.totals) {
      perf.mark('dashboard-interactive');
      // Log full performance report
      if (typeof window !== 'undefined' && __DEV__) {
        console.log('\n📊 Performance Report:');
        console.log('To view detailed timings, run: perf.getReport()');
        perf.getReport();
      }
    }
  }, [data]);

  const handleMonthClick = (month: string) => {
    setDrillThroughMonth(month);
  };

  const handlePayerClick = (payer: string) => {
    setSelectedPayer(payer);
    // Don't navigate - show filtered view in side panel instead
  };

  const handleViewAllExpenses = () => {
    onNavigateToExpenses?.();
  };

  const handleExportMonth = () => {
    // TODO: Implement CSV export for drill-through month
    alert('Export functionality coming soon!');
  };

  return (
    <View 
      style={styles.container}
      onLayout={(e) => {
        if (__DEV__) {
          console.log('📐 [EnhancedDashboard] Container width:', e.nativeEvent.layout.width);
        }
      }}
    >
      {/* Date Range Filter - tablet only (phone gets it inline in scroll, desktop shows in action bar) */}
      {!isDesktop && !isPhone && <DateRangeFilter selected={dateRange} onSelect={onDateRangeChange} />}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        {isPhone ? (
          /* ── PHONE LAYOUT ── */
          <View style={styles.phoneStack}>
            {/* Hero card */}
            <View style={styles.phoneCard}>
              {!data.isReady || !data.totals ? (
                <SkeletonDashboardCard />
              ) : (
                <HeroNetProfit
                  dateRange={dateRange}
                  customStart={customStart}
                  customEnd={customEnd}
                  payerId={payerId}
                />
              )}
            </View>

            {/* Tax Summary */}
            <View style={styles.phoneCard}>
              {!data.isReady || !data.taxBreakdown ? (
                <SkeletonDashboardCard />
              ) : (
                <TaxSummaryCard dateRange={dateRange} />
              )}
            </View>

            {/* Expense Breakdown */}
            <View style={styles.phoneCard}>
              <ExpenseBreakdown
                data={data.expenseBreakdown}
                onViewAll={handleViewAllExpenses}
              />
            </View>

            {/* Top Payers */}
            <View style={styles.phoneCard}>
              <TopPayers data={data.payerBreakdown} onPayerClick={handlePayerClick} />
            </View>

            {/* Monthly Overview */}
            <View style={styles.phoneCard}>
              <MonthlyOverview data={data.monthly} onMonthClick={handleMonthClick} />
            </View>
          </View>
        ) : (
          /* ── TABLET / DESKTOP LAYOUT ── */
          <>
            {/* Hero Row: Net Profit + Quick Stats */}
            <View style={[styles.heroRow, isDesktop && styles.heroRowDesktop]}>
              <View style={[styles.heroCard, isDesktop && styles.heroCardDesktop]}>
                {!data.isReady || !data.totals ? (
                  <SkeletonDashboardCard />
                ) : (
                  <HeroNetProfit
                    dateRange={dateRange}
                    customStart={customStart}
                    customEnd={customEnd}
                    payerId={payerId}
                  />
                )}
              </View>
              <View style={[styles.quickStatsCard, isDesktop && styles.quickStatsCardDesktop]}>
                {!data.isReady || !data.totals ? (
                  <SkeletonDashboardCard />
                ) : (
                  <QuickStats
                    ytdGigsCount={data.ytdGigsCount}
                    paidGigsCount={data.paidGigsCount}
                    totalGrossIncome={data.totalGrossIncome}
                    estimatedTaxRate={data.totals.effectiveTaxRate}
                  />
                )}
              </View>
            </View>

            {/* Charts Grid */}
            <View style={[styles.chartsGrid, isDesktop && styles.chartsGridDesktop]}>
              <View style={styles.fullWidth}>
                <MonthlyOverview data={data.monthly} onMonthClick={handleMonthClick} />
              </View>
              <View style={styles.fullWidth}>
                <CumulativeNet data={data.cumulativeNet} />
              </View>
              <View style={styles.fullWidth}>
                {!data.isReady || !data.taxBreakdown ? (
                  <SkeletonDashboardCard />
                ) : (
                  <TaxSummaryCard dateRange={dateRange} />
                )}
              </View>
              <View style={styles.twoColumnSideBySide}>
                <View style={styles.columnSideBySide}>
                  <ExpenseBreakdown data={data.expenseBreakdown} onViewAll={handleViewAllExpenses} />
                </View>
                <View style={styles.columnSideBySide}>
                  <TopPayers data={data.payerBreakdown} onPayerClick={handlePayerClick} />
                </View>
              </View>
              <View style={styles.fullWidth}>
                <MapCard dateRange={dateRange} customStart={customStart} customEnd={customEnd} payerId={payerId} />
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Month Drill-Through Panel */}
      <SidePanel
        visible={!!drillThroughMonth}
        onClose={() => setDrillThroughMonth(null)}
        title={drillThroughMonth || ''}
        subtitle="Detailed transactions"
        onExport={handleExportMonth}
      >
        {drillThroughMonth && <MonthDrillThrough month={drillThroughMonth} />}
      </SidePanel>

      {/* Payer Drill-Through Panel */}
      <SidePanel
        visible={!!selectedPayer}
        onClose={() => setSelectedPayer(null)}
        title={selectedPayer || ''}
        subtitle="All gigs from this payer"
      >
        {selectedPayer && <PayerDrillThrough payer={selectedPayer} />}
      </SidePanel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 0,
    paddingBottom: 32,
  },
  scrollContentDesktop: {
    padding: parseInt(spacing[6]),
  },
  heroContainer: {
    width: '100%',
    marginBottom: parseInt(spacing[8]),
  },
  heroContainerDesktop: {
    marginBottom: parseInt(spacing[12]),
  },
  heroRow: {
    flexDirection: 'column',
    gap: parseInt(spacing[5]),
    marginBottom: parseInt(spacing[8]),
  },
  heroRowDesktop: {
    flexDirection: 'row',
    gap: parseInt(spacing[8]),
    marginBottom: parseInt(spacing[12]),
    flexWrap: 'nowrap',
  },
  heroCard: {
    width: '100%',
  },
  heroCardDesktop: {
    flex: 2,
    width: undefined,
  },
  quickStatsCard: {
    width: '100%',
  },
  quickStatsCardDesktop: {
    flex: 1,
    width: undefined,
  },
  chartsGrid: {
    gap: parseInt(spacing[5]),
  },
  chartsGridDesktop: {
    gap: parseInt(spacing[8]),
  },
  fullWidth: {
    width: '100%',
  },
  twoColumn: {
    flexDirection: 'column',
    gap: parseInt(spacing[5]),
  },
  twoColumnSideBySide: {
    flexDirection: 'row',
    gap: parseInt(spacing[5]),
    flexWrap: 'nowrap',
  },
  column: {
    width: '100%',
  },
  columnSideBySide: {
    flex: 1,
    width: undefined,
  },
  // Phone-specific layout
  phoneStack: {
    gap: 10,
    paddingBottom: 24,
  },
  phoneCard: {
    marginHorizontal: 10,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  qaBtn: {
    flex: 1,
    backgroundColor: '#2D5BE3',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaBtnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  qaBtnGhost: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E3DE',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaBtnGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
  },
});
