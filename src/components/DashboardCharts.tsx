import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Platform } from 'react-native';
import { VictoryBar, VictoryChart, VictoryAxis, VictoryStack, VictoryLine, VictoryPie, VictoryTooltip, VictoryLabel, VictoryScatter } from 'victory';
import type { DashboardData } from '../hooks/useDashboardData';

interface DashboardChartsProps {
  data: DashboardData;
  loading?: boolean;
}

const COLORS = {
  income: '#2563EB',
  expenses: '#EF4444',
  taxes: '#F59E0B',
  net: '#10B981',
  gross: '#3b82f6',
  tips: '#f59e0b',
  perDiem: '#8b5cf6',
  other: '#6b7280',
};

const formatCurrency = (value: number) => {
  if (Math.abs(value) >= 1000) {
    return `$${(value / 1000).toFixed(1)}k`;
  }
  return `$${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export function DashboardCharts({ data, loading }: DashboardChartsProps) {
  const screenWidth = Dimensions.get('window').width;
  const isWeb = Platform.OS === 'web';
  const isMobile = screenWidth < 768;

  // Chart dimensions
  const chartWidth = isMobile ? screenWidth - 40 : (screenWidth - 60) / 2;
  const chartHeight = 280;

  // Memoize chart data
  const stackedBarData = useMemo(() => {
    return {
      income: data.monthly.map((m) => ({ x: m.month, y: m.income })),
      expenses: data.monthly.map((m) => ({ x: m.month, y: m.expenses })),
      taxes: data.monthly.map((m) => ({ x: m.month, y: m.taxes })),
    };
  }, [data.monthly]);

  const lineData = useMemo(() => {
    return data.cumulativeNet.map((point) => ({
      x: point.month,
      y: point.value,
    }));
  }, [data.cumulativeNet]);

  const pieData = useMemo(() => {
    if (data.payerBreakdown.length === 0) return [];

    return data.payerBreakdown.map((payer) => ({
      x: payer.payer,
      y: payer.amount,
      label: `${payer.payer}\n${formatCurrencyFull(payer.amount)}`,
    }));
  }, [data.payerBreakdown]);

  const expenseBarData = useMemo(() => {
    return data.expenseBreakdown.map((cat) => ({
      x: cat.category.length > 15 ? cat.category.substring(0, 15) + '...' : cat.category,
      y: cat.amount,
      label: formatCurrencyFull(cat.amount),
    }));
  }, [data.expenseBreakdown]);

  const totalIncome = data.incomeBreakdown.gross + data.incomeBreakdown.tips + 
                      data.incomeBreakdown.perDiem + data.incomeBreakdown.other;

  const lastCumulativeValue = data.cumulativeNet.length > 0 
    ? data.cumulativeNet[data.cumulativeNet.length - 1].value 
    : 0;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.chartGrid, isMobile && styles.chartGridMobile]}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
              <View style={styles.skeleton} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  // Empty state
  if (data.monthly.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>No data yet</Text>
        <Text style={styles.emptyStateText}>
          Add your first gig or expense to see charts
        </Text>
      </View>
    );
  }

  const shouldEnableScroll = data.monthly.length > 7 && isMobile;

  return (
    <View style={styles.container}>
      <View style={[styles.chartGrid, isMobile && styles.chartGridMobile]}>
        {/* Stacked Monthly Bars */}
        <View style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
          <Text style={styles.chartTitle}>Monthly Overview</Text>
          <Text style={styles.chartSubtitle}>Income vs Expenses vs Taxes</Text>
          <ScrollView 
            horizontal={shouldEnableScroll}
            showsHorizontalScrollIndicator={shouldEnableScroll}
          >
            <VictoryChart
              width={shouldEnableScroll ? Math.max(chartWidth, data.monthly.length * 60) : chartWidth}
              height={chartHeight}
              domainPadding={{ x: 20 }}
              padding={{ top: 20, bottom: 50, left: 50, right: 20 }}
            >
              <VictoryAxis
                style={{
                  axis: { stroke: '#e5e7eb' },
                  tickLabels: { fontSize: 10, fill: '#6b7280', angle: -45, textAnchor: 'end' },
                  grid: { stroke: 'none' },
                }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t: number) => formatCurrency(t)}
                style={{
                  axis: { stroke: '#e5e7eb' },
                  tickLabels: { fontSize: 10, fill: '#6b7280' },
                  grid: { stroke: '#f3f4f6', strokeDasharray: '4,4' },
                }}
              />
              <VictoryStack colorScale={[COLORS.income, COLORS.expenses, COLORS.taxes]}>
                <VictoryBar
                  data={stackedBarData.income}
                  labels={({ datum }: any) => formatCurrency(datum.y)}
                  labelComponent={<VictoryTooltip />}
                />
                <VictoryBar
                  data={stackedBarData.expenses}
                  labels={({ datum }: any) => formatCurrency(datum.y)}
                  labelComponent={<VictoryTooltip />}
                />
                <VictoryBar
                  data={stackedBarData.taxes}
                  labels={({ datum }: any) => formatCurrency(datum.y)}
                  labelComponent={<VictoryTooltip />}
                />
              </VictoryStack>
            </VictoryChart>
          </ScrollView>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.income }]} />
              <Text style={styles.legendText}>Income</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.expenses }]} />
              <Text style={styles.legendText}>Expenses</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.taxes }]} />
              <Text style={styles.legendText}>Taxes</Text>
            </View>
          </View>
        </View>

        {/* Cumulative Net Profit Line */}
        <View style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
          <Text style={styles.chartTitle}>Cumulative Net Profit</Text>
          <View style={styles.chipContainer}>
            <View style={[styles.chip, lastCumulativeValue < 0 && styles.chipNegative]}>
              <Text style={styles.chipText}>
                YTD Net: {formatCurrencyFull(lastCumulativeValue)}
              </Text>
            </View>
          </View>
          <VictoryChart
            width={chartWidth}
            height={chartHeight}
            padding={{ top: 20, bottom: 80, left: 60, right: 20 }}
          >
            <VictoryAxis
              style={{
                axis: { stroke: '#e5e7eb' },
                tickLabels: { fontSize: 10, fill: '#6b7280', angle: -45, textAnchor: 'end' },
                grid: { stroke: 'none' },
              }}
            />
            <VictoryAxis
              dependentAxis
              tickFormat={(t: number) => formatCurrency(t)}
              style={{
                axis: { stroke: '#e5e7eb' },
                tickLabels: { fontSize: 10, fill: '#6b7280' },
                grid: { stroke: '#f3f4f6', strokeDasharray: '4,4' },
              }}
            />
            <VictoryLine
              data={lineData}
              style={{
                data: { stroke: COLORS.net, strokeWidth: 3 },
              }}
            />
            <VictoryScatter
              data={lineData}
              size={5}
              style={{
                data: { fill: COLORS.net },
              }}
              labels={({ datum }: any) => `${datum.x}\n${formatCurrencyFull(datum.y)}`}
              labelComponent={
                <VictoryTooltip
                  flyoutStyle={{
                    stroke: COLORS.net,
                    strokeWidth: 1,
                    fill: 'white',
                  }}
                  style={{ fontSize: 11, fill: '#111827' }}
                />
              }
            />
          </VictoryChart>
        </View>

        {/* Expense Breakdown Horizontal Bars */}
        <View style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
          <Text style={styles.chartTitle}>Expense Breakdown</Text>
          <Text style={styles.chartSubtitle}>Top categories</Text>
          {expenseBarData.length > 0 ? (
            <VictoryChart
              width={chartWidth}
              height={chartHeight}
              horizontal
              domainPadding={{ y: 20 }}
              padding={{ top: 20, bottom: 20, left: 100, right: 60 }}
            >
              <VictoryAxis
                style={{
                  axis: { stroke: '#e5e7eb' },
                  tickLabels: { fontSize: 10, fill: '#6b7280' },
                  grid: { stroke: 'none' },
                }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t: number) => formatCurrency(t)}
                style={{
                  axis: { stroke: '#e5e7eb' },
                  tickLabels: { fontSize: 10, fill: '#6b7280' },
                  grid: { stroke: '#f3f4f6', strokeDasharray: '4,4' },
                }}
              />
              <VictoryBar
                data={expenseBarData}
                style={{
                  data: { fill: COLORS.expenses },
                }}
                labels={({ datum }: any) => datum.label}
                labelComponent={
                  <VictoryLabel 
                    dx={5}
                    style={{ fontSize: 10, fill: '#111827' }}
                  />
                }
              />
            </VictoryChart>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No expenses yet</Text>
            </View>
          )}
        </View>

        {/* Income by Payer Donut */}
        <View style={[styles.chartCard, isMobile && styles.chartCardMobile]}>
          <View style={styles.chartHeader}>
            <View>
              <Text style={styles.chartTitle}>Top Payers</Text>
              <Text style={styles.chartSubtitle}>Income by client</Text>
            </View>
            <View style={styles.totalIncomeBadge}>
              <Text style={styles.totalIncomeLabel}>Total Income</Text>
              <Text style={styles.totalIncomeValue}>{formatCurrencyFull(totalIncome)}</Text>
            </View>
          </View>
          {pieData.length > 0 ? (
            <>
              <View style={styles.pieContainer}>
                <VictoryPie
                  data={pieData}
                  width={chartWidth}
                  height={chartHeight}
                  innerRadius={70}
                  colorScale={['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16']}
                  labels={({ datum }: any) => `${((datum.y / totalIncome) * 100).toFixed(1)}%`}
                  style={{
                    labels: { fontSize: 12, fill: '#fff', fontWeight: '700' },
                  }}
                />
              </View>
              <View style={styles.pieLegend}>
                {pieData.map((item, index) => (
                  <View key={item.x} style={styles.pieLegendItem}>
                    <View
                      style={[
                        styles.pieLegendDot,
                        {
                          backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#84cc16'][index % 8],
                        },
                      ]}
                    />
                    <Text style={styles.pieLegendText} numberOfLines={1}>
                      {item.x} - {formatCurrencyFull(item.y)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyChart}>
              <Text style={styles.emptyChartText}>No income yet</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  chartGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 16,
  },
  chartGridMobile: {
    flexDirection: 'column',
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  chartCardMobile: {
    width: '100%',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 0,
  },
  totalIncomeBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'flex-end',
    borderWidth: 1,
    borderColor: '#93c5fd',
  },
  totalIncomeLabel: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '600',
    marginBottom: 2,
  },
  totalIncomeValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#6b7280',
  },
  chipContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  chip: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  chipNegative: {
    backgroundColor: '#fee2e2',
    borderColor: '#EF4444',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065f46',
  },
  pieContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '600',
  },
  pieCenterValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  pieLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    paddingHorizontal: 8,
  },
  pieLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: '45%',
  },
  pieLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  pieLegendText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
  },
  skeleton: {
    width: '100%',
    height: 280,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  emptyChart: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChartText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
