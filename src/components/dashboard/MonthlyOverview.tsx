/**
 * Monthly Overview - Grouped bar chart
 * Shows Income (blue), Expenses (red), Taxes (amber) per month
 * Click to drill through to underlying records
 */

import React from 'react';
import { View, Text, Platform, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { chartColors, getThemeColors } from '../../lib/charts/colors';
import { ChartCard } from '../charts/ChartCard';
import type { MonthlyPoint } from '../../hooks/useDashboardData';

// Conditional imports for charts
let BarChart: any, Bar: any, XAxis: any, YAxis: any, CartesianGrid: any, Tooltip: any, Legend: any, ResponsiveContainer: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  BarChart = recharts.BarChart;
  Bar = recharts.Bar;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
  Legend = recharts.Legend;
  ResponsiveContainer = recharts.ResponsiveContainer;
}

interface MonthlyOverviewProps {
  data: MonthlyPoint[];
  onMonthClick?: (month: string) => void;
}

export function MonthlyOverview({ data, onMonthClick }: MonthlyOverviewProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const total = data.income + data.expenses + data.taxes;

    return (
      <View style={[styles.tooltip, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.tooltipTitle, { color: colors.text }]}>{data.month}</Text>
        <View style={styles.tooltipRow}>
          <View style={[styles.tooltipDot, { backgroundColor: chartColors.blue }]} />
          <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>Income:</Text>
          <Text style={[styles.tooltipValue, { color: colors.text }]}>
            {formatCurrency(data.income)} ({((data.income / total) * 100).toFixed(1)}%)
          </Text>
        </View>
        <View style={styles.tooltipRow}>
          <View style={[styles.tooltipDot, { backgroundColor: chartColors.red }]} />
          <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>Expenses:</Text>
          <Text style={[styles.tooltipValue, { color: colors.text }]}>
            {formatCurrency(data.expenses)} ({((data.expenses / total) * 100).toFixed(1)}%)
          </Text>
        </View>
        <View style={styles.tooltipRow}>
          <View style={[styles.tooltipDot, { backgroundColor: chartColors.amber }]} />
          <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>Taxes:</Text>
          <Text style={[styles.tooltipValue, { color: colors.text }]}>
            {formatCurrency(data.taxes)} ({((data.taxes / total) * 100).toFixed(1)}%)
          </Text>
        </View>
        <View style={[styles.tooltipRow, styles.tooltipTotal]}>
          <Text style={[styles.tooltipLabel, { color: colors.text, fontWeight: '600' }]}>Net:</Text>
          <Text style={[styles.tooltipValue, { color: chartColors.green, fontWeight: '600' }]}>
            {formatCurrency(data.net)}
          </Text>
        </View>
      </View>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <ChartCard
        title="Monthly Overview"
        subtitle="Income, expenses, and taxes by month"
        info="Click a month to see detailed transactions"
      >
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            onClick={(e: any) => {
              if (e && e.activeLabel && onMonthClick) {
                onMonthClick(e.activeLabel);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.border} />
            <XAxis
              dataKey="month"
              stroke={colors.textMuted}
              style={{ fontSize: 12 }}
            />
            <YAxis
              stroke={colors.textMuted}
              style={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
            <Legend
              wrapperStyle={{ fontSize: 14, color: colors.text }}
              iconType="square"
            />
            <Bar dataKey="income" fill={chartColors.blue} name="Income" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expenses" fill={chartColors.red} name="Expenses" radius={[4, 4, 0, 0]} />
            <Bar dataKey="taxes" fill={chartColors.amber} name="Taxes" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // Mobile view — compute cumulative net per month
  const cumulativeData = data.map((point, index) => {
    const cumulative = data.slice(0, index + 1).reduce((sum, p) => sum + p.net, 0);
    return { ...point, cumulative };
  });

  return (
    <View style={moStyles.card}>
      <View style={moStyles.header}>
        <Text style={moStyles.title}>📅 Monthly Overview</Text>
      </View>
      {cumulativeData.map((point, index) => {
        const isZero = point.net === 0;
        return (
          <TouchableOpacity
            key={index}
            style={moStyles.monthRow}
            onPress={() => onMonthClick?.(point.month)}
            activeOpacity={0.7}
          >
            <Text style={moStyles.monthLabel}>{point.month}</Text>
            <View style={moStyles.monthRight}>
              <Text style={[moStyles.monthNet, isZero && moStyles.monthNetZero]}>
                {formatCurrency(point.net)}
              </Text>
              <Text style={moStyles.monthSub}>
                {isZero ? 'net' : `net · +${formatCurrency(point.cumulative)} cumulative`}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const moStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E3DE',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  monthRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E3DE',
  },
  monthLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1A1A1A',
  },
  monthRight: {
    alignItems: 'flex-end',
  },
  monthNet: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#1D9B5E',
  },
  monthNetZero: {
    color: '#B0ADA8',
  },
  monthSub: {
    fontSize: 11,
    color: '#B0ADA8',
    marginTop: 1,
  },
});

// Keep old styles for web ChartCard / tooltip usage
const styles = StyleSheet.create({
  tooltip: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({ web: { boxShadow: '0 2px 8px rgba(0,0,0,0.15)' } as any }),
  },
  tooltipTitle: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  tooltipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  tooltipDot: { width: 8, height: 8, borderRadius: 4 },
  tooltipLabel: { fontSize: 13, flex: 1 },
  tooltipValue: { fontSize: 13, fontWeight: '500' },
  tooltipTotal: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  mobileList: { gap: 0 },
  mobileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  mobileMonth: { fontSize: 14, fontWeight: '500' },
  mobileValues: { alignItems: 'flex-end' },
  mobileValue: { fontSize: 16, fontWeight: '600' },
  mobileLabel: { fontSize: 12 },
});
