/**
 * Top Payers - Donut chart
 * Shows income distribution by payer with click-to-filter
 */

import React from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { chartPalette, getThemeColors } from '../../lib/charts/colors';
import { ChartCard } from '../charts/ChartCard';
import type { PayerBreakdown } from '../../hooks/useDashboardData';

// Conditional imports
let PieChart: any, Pie: any, Cell: any, ResponsiveContainer: any, Legend: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  PieChart = recharts.PieChart;
  Pie = recharts.Pie;
  Cell = recharts.Cell;
  ResponsiveContainer = recharts.ResponsiveContainer;
  Legend = recharts.Legend;
}

interface TopPayersProps {
  data: PayerBreakdown[];
  onPayerClick?: (payer: string) => void;
}

export function TopPayers({ data, onPayerClick }: TopPayersProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  const totalIncome = data.reduce((sum, p) => sum + p.amount, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return ((value / totalIncome) * 100).toFixed(1) + '%';
  };

  // Custom label for center of donut
  const renderCenterLabel = () => {
    return (
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 14, fill: colors.textMuted }}
      >
        <tspan x="50%" dy="-0.5em" style={{ fontSize: 12 }}>Total Income</tspan>
        <tspan x="50%" dy="1.5em" style={{ fontSize: 18, fontWeight: 600, fill: colors.text }}>
          {formatCurrency(totalIncome)}
        </tspan>
      </text>
    );
  };

  if (Platform.OS === 'web') {
    return (
      <ChartCard
        title="Top Payers"
        subtitle="Income distribution"
        info="Click a slice to filter gigs by that payer"
      >
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="payer"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={120}
              paddingAngle={2}
              onClick={(entry: any) => {
                if (onPayerClick) {
                  onPayerClick(entry.payer);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={chartPalette.payers[index % chartPalette.payers.length]}
                />
              ))}
            </Pie>
            {renderCenterLabel()}
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string, entry: any) => {
                const item = data.find(d => d.payer === value);
                return `${value} - ${formatCurrency(item?.amount || 0)} (${formatPercent(item?.amount || 0)})`;
              }}
              wrapperStyle={{ fontSize: 12, color: colors.text }}
            />
          </PieChart>
        </ResponsiveContainer>
      </ChartCard>
    );
  }

  // Mobile view - list with color indicators
  return (
    <ChartCard title="Top Payers" subtitle="Income distribution">
      <View style={styles.totalContainer}>
        <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Income</Text>
        <Text style={[styles.totalValue, { color: colors.text }]}>
          {formatCurrency(totalIncome)}
        </Text>
      </View>

      <View style={styles.mobileList}>
        {data.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.mobileRow, { borderBottomColor: colors.border }]}
            onPress={() => onPayerClick?.(item.payer)}
          >
            <View
              style={[
                styles.colorDot,
                { backgroundColor: chartPalette.payers[index % chartPalette.payers.length] },
              ]}
            />
            <View style={styles.mobileContent}>
              <Text style={[styles.payerName, { color: colors.text }]}>{item.payer}</Text>
              <Text style={[styles.payerPercent, { color: colors.textMuted }]}>
                {formatPercent(item.amount)}
              </Text>
            </View>
            <Text style={[styles.payerAmount, { color: colors.text }]}>
              {formatCurrency(item.amount)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  totalContainer: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  totalLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  mobileList: {
    gap: 0,
  },
  mobileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  mobileContent: {
    flex: 1,
  },
  payerName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  payerPercent: {
    fontSize: 12,
  },
  payerAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
});
