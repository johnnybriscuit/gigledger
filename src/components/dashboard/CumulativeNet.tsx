/**
 * Cumulative Net Profit - Line chart with goal line
 * Shows running total with month-to-month delta
 */

import React from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { chartColors, getThemeColors } from '../../lib/charts/colors';
import { ChartCard } from '../charts/ChartCard';

// Conditional imports
let LineChart: any, Line: any, XAxis: any, YAxis: any, CartesianGrid: any, Tooltip: any, ResponsiveContainer: any, ReferenceLine: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  LineChart = recharts.LineChart;
  Line = recharts.Line;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
  ResponsiveContainer = recharts.ResponsiveContainer;
  ReferenceLine = recharts.ReferenceLine;
}

interface CumulativeNetProps {
  data: { month: string; value: number }[];
  yearlyGoal?: number; // Optional yearly goal
}

export function CumulativeNet({ data, yearlyGoal }: CumulativeNetProps) {
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

    const currentValue = payload[0].value;
    const currentIndex = payload[0].payload.index;
    const previousValue = currentIndex > 0 ? data[currentIndex - 1].value : 0;
    const delta = currentValue - previousValue;

    return (
      <View style={[styles.tooltip, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
        <Text style={[styles.tooltipTitle, { color: colors.text }]}>{payload[0].payload.month}</Text>
        <View style={styles.tooltipRow}>
          <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>Cumulative Net:</Text>
          <Text style={[styles.tooltipValue, { color: chartColors.green }]}>
            {formatCurrency(currentValue)}
          </Text>
        </View>
        {currentIndex > 0 && (
          <View style={styles.tooltipRow}>
            <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>Month Delta:</Text>
            <Text style={[
              styles.tooltipValue,
              { color: delta >= 0 ? chartColors.green : chartColors.red }
            ]}>
              {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
            </Text>
          </View>
        )}
        {yearlyGoal && (
          <View style={[styles.tooltipRow, styles.tooltipGoal]}>
            <Text style={[styles.tooltipLabel, { color: colors.textMuted }]}>Goal Progress:</Text>
            <Text style={[styles.tooltipValue, { color: colors.text }]}>
              {((currentValue / yearlyGoal) * 100).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Add index to data for tooltip delta calculation
  const dataWithIndex = data.map((point, index) => ({ ...point, index }));

  // Determine if on track with goal
  const currentValue = data[data.length - 1]?.value || 0;
  const onTrack = yearlyGoal ? currentValue >= yearlyGoal * (data.length / 12) : null;

  if (Platform.OS === 'web') {
    return (
      <ChartCard
        title="Cumulative Net Profit"
        subtitle={
          yearlyGoal
            ? `Goal: ${formatCurrency(yearlyGoal)} • ${onTrack ? '✅ On track' : '⚠️ Behind'}`
            : 'Running total over time'
        }
        info="Shows your cumulative net profit with month-to-month changes"
      >
        <ResponsiveContainer width="100%" height={300}>
          <LineChart
            data={dataWithIndex}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
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
            <Tooltip content={<CustomTooltip />} />
            
            {/* Goal line if provided */}
            {yearlyGoal && (
              <ReferenceLine
                y={yearlyGoal}
                stroke={chartColors.amber}
                strokeDasharray="5 5"
                label={{
                  value: `Goal: ${formatCurrency(yearlyGoal)}`,
                  position: 'right',
                  fill: chartColors.amber,
                  fontSize: 12,
                }}
              />
            )}
            
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors.green}
              strokeWidth={3}
              dot={{ fill: chartColors.green, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // Mobile fallback
  return (
    <ChartCard
      title="Cumulative Net Profit"
      subtitle={yearlyGoal ? `Goal: ${formatCurrency(yearlyGoal)}` : undefined}
    >
      <View style={styles.mobileList}>
        {data.map((point, index) => {
          const previousValue = index > 0 ? data[index - 1].value : 0;
          const delta = point.value - previousValue;
          
          return (
            <View key={index} style={[styles.mobileRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.mobileMonth, { color: colors.text }]}>{point.month}</Text>
              <View style={styles.mobileValues}>
                <Text style={[styles.mobileValue, { color: chartColors.green }]}>
                  {formatCurrency(point.value)}
                </Text>
                {index > 0 && (
                  <Text style={[
                    styles.mobileDelta,
                    { color: delta >= 0 ? chartColors.green : chartColors.red }
                  ]}>
                    {delta >= 0 ? '+' : ''}{formatCurrency(delta)}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
      },
    }),
  },
  tooltipTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 4,
  },
  tooltipLabel: {
    fontSize: 13,
  },
  tooltipValue: {
    fontSize: 13,
    fontWeight: '500',
  },
  tooltipGoal: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  mobileList: {
    gap: 0,
  },
  mobileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  mobileMonth: {
    fontSize: 14,
    fontWeight: '500',
  },
  mobileValues: {
    alignItems: 'flex-end',
  },
  mobileValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  mobileDelta: {
    fontSize: 12,
  },
});
