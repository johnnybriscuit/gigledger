// @ts-nocheck
/**
 * Enhanced Premium Dashboard
 * Features: Hero card, quick actions, interactive charts, drill-through
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, useWindowDimensions } from 'react-native';
import { useResponsive } from '../../hooks/useResponsive';
import { MonthlyOverview } from './MonthlyOverview';
import { ExpenseBreakdown } from './ExpenseBreakdown';
import { TopPayers } from './TopPayers';
import { SidePanel } from '../SidePanel';
import { MonthDrillThrough } from './MonthDrillThrough';
import { PayerDrillThrough } from './PayerDrillThrough';
import { useDashboardData, type DateRange } from '../../hooks/useDashboardData';
import { DateRangeFilter } from '../DateRangeFilter';
import { SkeletonDashboardCard } from '../SkeletonCard';
import { perf } from '../../lib/performance';
import { colors, spacing } from '../../styles/theme';
import { DashboardEmptyState } from './DashboardEmptyState';
import { trackDashboardFirstRunViewed } from '../../lib/analytics';
import { FinancialSnapshot } from './FinancialSnapshot';
import { FinancialStatusRow } from './FinancialStatusRow';
import { AICoachCard } from './AICoachCard';
import { OpportunitiesSection } from './OpportunitiesSection';
import { RetroactivePromptBanner } from './RetroactivePromptBanner';
import { HealthScoreWidget } from './HealthScoreWidget';
// import { OpportunityAlertsSection } from './OpportunityAlertsSection'; // replaced by OpportunitiesSection
import { scheduleQuarterlyReminders } from '../../lib/scheduleQuarterlyReminders';
import { useAllocationBuckets } from '../../hooks/useAllocationBuckets';

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
  onNavigateToPayers?: () => void;
  onAddGig?: () => void;
  onAddExpense?: () => void;
  onExport?: () => void;
  onNavigateToBucketSetup?: () => void;
  onNavigateToMyMoney?: () => void;
  onNavigateToRateGuide?: () => void;
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
  onNavigateToPayers,
  onAddGig,
  onAddExpense,
  onExport,
  onNavigateToBucketSetup,
  onNavigateToMyMoney,
  onNavigateToRateGuide,
}: EnhancedDashboardProps) {
  const { buckets } = useAllocationBuckets();
  const { isDesktop, isTablet } = useResponsive();
  const { width } = useWindowDimensions();
  const isPhone = width < 768;
  const [drillThroughMonth, setDrillThroughMonth] = useState<string | null>(null);
  const [selectedPayer, setSelectedPayer] = useState<string | null>(null);

  // Fetch dashboard data
  const data = useDashboardData(dateRange, customStart, customEnd, payerId);

  // Schedule quarterly tax reminders when YTD data is available
  useEffect(() => {
    if (!data.isReady || !data.totalGrossIncome) return;
    const federalTaxBucket = buckets.find(b => b.bucket_type === 'federal_tax');
    const stateTaxBucket = buckets.find(b => b.bucket_type === 'state_tax');
    if (!federalTaxBucket && !stateTaxBucket) return;
    const combinedTaxPct = (federalTaxBucket?.percentage ?? 0) + (stateTaxBucket?.percentage ?? 0);
    const quarterlyEstimate = (data.totalGrossIncome * combinedTaxPct) / 400;
    scheduleQuarterlyReminders(quarterlyEstimate);
  }, [data.isReady, data.totalGrossIncome, buckets]);

  // Mark when dashboard is interactive (data loaded)
  useEffect(() => {
    if (data && data.isReady && data.totals) {
      perf.mark('dashboard-interactive');
      // Log full performance report
      if (typeof window !== 'undefined' && __DEV__) {
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

  const showFirstGigWelcome = data.isReady && data.allTimeGigsCount === 0;

  useEffect(() => {
    if (showFirstGigWelcome) {
      trackDashboardFirstRunViewed();
    }
  }, [showFirstGigWelcome]);

  if (showFirstGigWelcome) {
    return (
      <View style={styles.container}>
        <DashboardEmptyState
          onAddContact={() => onNavigateToPayers?.()}
          onAddGig={() => onAddGig?.()}
          onOpenGigs={() => onNavigateToGigs?.()}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Date Range Filter - tablet only */}
      {!isDesktop && !isPhone && <DateRangeFilter selected={dateRange} onSelect={onDateRangeChange} />}

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.scrollContentDesktop,
        ]}
      >
        {/* 1. Retroactive Allocation Prompt */}
        <RetroactivePromptBanner />

        {/* 2. Financial Snapshot — primary allocation hero */}
        <FinancialSnapshot
          ytdGrossIncome={data.totalGrossIncome ?? 0}
          paidGigsCount={data.paidGigsCount ?? 0}
        />

        {/* 3. Financial Status Row — Tax / Retirement / Emergency */}
        <FinancialStatusRow ytdGrossIncome={data.totalGrossIncome ?? 0} />

        {/* 4. Financial Health Score — actual allocations vs. targets */}
        <HealthScoreWidget ytdGrossIncome={data.totalGrossIncome ?? 0} />

        {/* OLD OpportunityAlertsSection removed — replaced by OpportunitiesSection */}

        {/* 5. AI Financial Coach — compact collapsible */}
        <AICoachCard onAddGig={onAddGig} />

        {/* 6. Tax Opportunities — static musician-specific provisions */}
        <OpportunitiesSection
          onNavigateToExpenses={onNavigateToExpenses}
          onAddExpense={onAddExpense}
          onNavigateToExports={onExport}
        />

        {/* 7. Monthly Overview chart */}
        <View style={styles.chartSection}>
          <MonthlyOverview data={data.monthly} onMonthClick={handleMonthClick} />
        </View>

        {/* 6. Expense Breakdown + Top Payers */}
        <View style={[styles.bottomRow, !isPhone && styles.bottomRowWide]}>
          <View style={[styles.bottomCard, !isPhone && styles.bottomCardHalf]}>
            <ExpenseBreakdown
              data={data.expenseBreakdown}
              onViewAll={handleViewAllExpenses}
            />
          </View>
          <View style={[styles.bottomCard, !isPhone && styles.bottomCardHalf]}>
            <TopPayers data={data.payerBreakdown} onPayerClick={handlePayerClick} />
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
    padding: 0,
    paddingBottom: 40,
  },
  scrollContentDesktop: {
    padding: parseInt(spacing[6]),
  },
  chartSection: {
    marginBottom: 16,
  },
  bottomRow: {
    flexDirection: 'column',
    gap: 12,
  },
  bottomRowWide: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'nowrap',
  },
  bottomCard: {
    width: '100%',
  },
  bottomCardHalf: {
    flex: 1,
    width: undefined,
  },
});
