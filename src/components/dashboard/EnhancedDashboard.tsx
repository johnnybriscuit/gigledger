/**
 * Enhanced Premium Dashboard
 * Features: Hero card, quick actions, interactive charts, drill-through
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Platform } from 'react-native';
import { HeroNetProfit } from './HeroNetProfit';
import { QuickActions } from './QuickActions';
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
import { spacing } from '../../styles/theme';

interface EnhancedDashboardProps {
  dateRange: DateRange;
  customStart?: Date;
  customEnd?: Date;
  onDateRangeChange: (range: DateRange) => void;
  onCustomRangeChange?: (start: Date, end: Date) => void;
  onAddGig: () => void;
  onAddExpense: () => void;
  onExport: () => void;
  onNavigateToExpenses?: () => void;
  onNavigateToGigs?: (payerFilter?: string) => void;
}

export function EnhancedDashboard({
  dateRange,
  customStart,
  customEnd,
  onDateRangeChange,
  onAddGig,
  onAddExpense,
  onExport,
  onNavigateToExpenses,
  onNavigateToGigs,
}: EnhancedDashboardProps) {
  const [drillThroughMonth, setDrillThroughMonth] = useState<string | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);

  // Fetch dashboard data
  const data = useDashboardData(dateRange, customStart, customEnd);

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
        {/* Top Row: Hero + Quick Actions */}
        <View style={styles.topRow}>
          <View style={styles.heroContainer}>
            <HeroNetProfit
              dateRange={dateRange}
              customStart={customStart}
              customEnd={customEnd}
            />
          </View>
          <View style={styles.actionsContainer}>
            <QuickActions
              onAddGig={onAddGig}
              onAddExpense={onAddExpense}
              onExport={onExport}
            />
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
            <TaxSummaryCard dateRange={dateRange} />
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
  topRow: {
    flexDirection: 'row',
    gap: parseInt(spacing[4]),
    marginBottom: parseInt(spacing[6]),
    flexWrap: 'wrap',
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          gap: parseInt(spacing[6]),
          marginBottom: parseInt(spacing[8]),
        },
      },
    }),
  },
  heroContainer: {
    flex: 2,
    minWidth: 320,
  },
  actionsContainer: {
    flex: 1,
    minWidth: 280,
    justifyContent: 'flex-start',
  },
  chartsGrid: {
    gap: parseInt(spacing[4]),
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          gap: parseInt(spacing[6]),
        },
      },
    }),
  },
  fullWidth: {
    width: '100%',
  },
  twoColumn: {
    flexDirection: 'row',
    gap: parseInt(spacing[4]),
    flexWrap: 'wrap',
    ...Platform.select({
      web: {
        '@media (min-width: 768px)': {
          gap: parseInt(spacing[6]),
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
          flexBasis: `calc(50% - ${parseInt(spacing[3])}px)`,
        },
      },
    }),
  },
});
