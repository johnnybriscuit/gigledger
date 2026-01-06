/**
 * Enhanced Premium Dashboard
 * Features: Hero card, quick actions, interactive charts, drill-through
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
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

interface EnhancedDashboardProps {
  dateRange: DateRange;
  customStart?: Date;
  customEnd?: Date;
  onDateRangeChange: (range: DateRange) => void;
  onCustomRangeChange?: (start: Date, end: Date) => void;
  onNavigateToExpenses?: () => void;
  onNavigateToGigs?: (payerFilter?: string) => void;
}

export function EnhancedDashboard({
  dateRange,
  customStart,
  customEnd,
  onDateRangeChange,
  onNavigateToExpenses,
  onNavigateToGigs,
}: EnhancedDashboardProps) {
  const { isDesktop } = useResponsive();
  const [drillThroughMonth, setDrillThroughMonth] = useState<string | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);

  // Fetch dashboard data
  const data = useDashboardData(dateRange, customStart, customEnd);

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
      {/* Date Range Filter */}
      <DateRangeFilter selected={dateRange} onSelect={onDateRangeChange} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
        onLayout={(e) => {
          if (__DEV__) {
            console.log('📐 [EnhancedDashboard] ScrollView width:', e.nativeEvent.layout.width);
          }
        }}
      >
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
              />
            )}
          </View>
          
          <View style={[styles.quickStatsCard, isDesktop && styles.quickStatsCardDesktop]}>
            {!data.isReady || !data.totals ? (
              <SkeletonDashboardCard />
            ) : (
              <QuickStats
                gigsCount={data.gigsCount}
                totalGrossIncome={data.totalGrossIncome}
                totalExpenses={data.expenseBreakdown.reduce((sum, e) => sum + e.amount, 0)}
                netProfit={data.totals.net}
                totalTaxes={data.totals.taxes}
              />
            )}
          </View>
        </View>

        {/* Charts Grid */}
        <View style={[styles.chartsGrid, isDesktop && styles.chartsGridDesktop]}>
          {/* Monthly Overview - Full Width */}
          <View style={styles.fullWidth}>
            <MonthlyOverview data={data.monthly} onMonthClick={handleMonthClick} />
          </View>

          {/* Cumulative Net - Full Width */}
          <View style={styles.fullWidth}>
            <CumulativeNet data={data.cumulativeNet} />
          </View>

          {/* Tax Summary - Full Width */}
          <View style={styles.fullWidth}>
            {!data.isReady || !data.taxBreakdown ? (
              <SkeletonDashboardCard />
            ) : (
              <TaxSummaryCard dateRange={dateRange} />
            )}
          </View>

          {/* Two Column Layout: Expense Breakdown + Top Payers */}
          <View style={[styles.twoColumn, isDesktop && styles.twoColumnDesktop]}>
            <View style={[styles.column, isDesktop && styles.columnDesktop]}>
              <ExpenseBreakdown
                data={data.expenseBreakdown}
                onViewAll={handleViewAllExpenses}
              />
            </View>
            <View style={[styles.column, isDesktop && styles.columnDesktop]}>
              <TopPayers data={data.payerBreakdown} onPayerClick={handlePayerClick} />
            </View>
          </View>

          {/* Map - Full Width */}
          <View style={styles.fullWidth}>
            <MapCard 
              dateRange={dateRange}
              customStart={customStart}
              customEnd={customEnd}
            />
          </View>
        </View>
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
    padding: parseInt(spacing[4]),
    paddingBottom: parseInt(spacing[12]),
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
    minWidth: 520,
    width: undefined,
  },
  quickStatsCard: {
    width: '100%',
  },
  quickStatsCardDesktop: {
    flex: 1,
    minWidth: 320,
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
    flexDirection: 'row',
    gap: parseInt(spacing[5]),
    flexWrap: 'wrap',
  },
  twoColumnDesktop: {
    gap: parseInt(spacing[8]),
  },
  column: {
    flex: 1,
    minWidth: 320,
  },
  columnDesktop: {
    flexBasis: `calc(50% - ${parseInt(spacing[4])}px)` as any,
  },
});
