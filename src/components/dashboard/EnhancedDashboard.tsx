/**
 * Enhanced Premium Dashboard
 * Features: Hero card, quick actions, interactive charts, drill-through
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
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
    <View style={styles.container}>
      {/* Date Range Filter */}
      <DateRangeFilter selected={dateRange} onSelect={onDateRangeChange} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Row: Net Profit + Quick Stats */}
        <View style={styles.heroRow}>
          <View style={styles.heroCard}>
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
          
          <View style={styles.quickStatsCard}>
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
        <View style={styles.chartsGrid}>
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
          <View style={styles.twoColumn}>
            <View style={styles.column}>
              <ExpenseBreakdown
                data={data.expenseBreakdown}
                onViewAll={handleViewAllExpenses}
              />
            </View>
            <View style={styles.column}>
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
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          padding: parseInt(spacing[6]),
        },
      },
    }),
  },
  heroContainer: {
    width: '100%',
    marginBottom: parseInt(spacing[8]),
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          marginBottom: parseInt(spacing[12]),
        },
      },
    }),
  },
  heroRow: {
    flexDirection: 'column',
    gap: parseInt(spacing[5]),
    marginBottom: parseInt(spacing[8]),
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          flexDirection: 'row',
          gap: parseInt(spacing[8]),
          marginBottom: parseInt(spacing[12]),
          flexWrap: 'nowrap',
        },
      },
    }),
  },
  heroCard: {
    width: '100%',
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          flex: 2,
          minWidth: 320,
          maxWidth: '60%',
        },
      },
    }),
  },
  quickStatsCard: {
    width: '100%',
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          flex: 1,
          minWidth: 280,
          maxWidth: '40%',
        },
      },
    }),
  },
  chartsGrid: {
    gap: parseInt(spacing[5]),
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          gap: parseInt(spacing[8]),
        },
      },
    }),
  },
  fullWidth: {
    width: '100%',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: parseInt(spacing[5]),
    flexWrap: 'wrap',
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          gap: parseInt(spacing[8]),
        },
      },
    }),
  },
  column: {
    flex: 1,
    minWidth: 320,
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          // Each column takes 6/12 of the grid (50%)
          flexBasis: `calc(50% - ${parseInt(spacing[4])}px)`,
        },
      },
    }),
  },
});
