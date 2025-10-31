/**
 * Expense Breakdown - Horizontal bar chart
 * Shows top 5 categories with "View all" link
 */

import React from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { chartColors, getThemeColors } from '../../lib/charts/colors';
import { ChartCard } from '../charts/ChartCard';
import type { ExpenseCategoryPoint } from '../../hooks/useDashboardData';

// Conditional imports
let BarChart: any, Bar: any, XAxis: any, YAxis: any, Cell: any, ResponsiveContainer: any, LabelList: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  BarChart = recharts.BarChart;
  Bar = recharts.Bar;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  Cell = recharts.Cell;
  ResponsiveContainer = recharts.ResponsiveContainer;
  LabelList = recharts.LabelList;
}

interface ExpenseBreakdownProps {
  data: ExpenseCategoryPoint[];
  onViewAll?: () => void;
}

export function ExpenseBreakdown({ data, onViewAll }: ExpenseBreakdownProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  // Take top 5 for the chart
  const top5 = data.slice(0, 5);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Color palette for categories
  const categoryColors = [
    chartColors.red,
    '#f87171',
    '#fca5a5',
    '#fecaca',
    '#fee2e2',
  ];

  if (Platform.OS === 'web') {
    return (
      <ChartCard
        title="Expense Breakdown"
        subtitle="Top 5 categories"
        info="Click 'View all' to see expenses filtered by current date range"
      >
        <ResponsiveContainer width="100%" height={250}>
          <BarChart
            data={top5}
            layout="vertical"
            margin={{ top: 5, right: 80, left: 100, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="category"
              stroke={colors.textMuted}
              style={{ fontSize: 13 }}
            />
            <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
              {top5.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
              ))}
              <LabelList
                dataKey="amount"
                position="right"
                formatter={formatCurrency}
                style={{ fill: colors.text, fontSize: 13, fontWeight: '500' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {onViewAll && (
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={[styles.viewAllText, { color: chartColors.blue }]}>
              View all expenses →
            </Text>
          </TouchableOpacity>
        )}
      </ChartCard>
    );
  }

  // Mobile view - simple list with bars
  return (
    <ChartCard title="Expense Breakdown" subtitle="Top 5 categories">
      <View style={styles.mobileList}>
        {top5.map((item, index) => {
          const maxAmount = Math.max(...top5.map(d => d.amount));
          const widthPercent = (item.amount / maxAmount) * 100;

          return (
            <View key={index} style={styles.mobileRow}>
              <Text style={[styles.mobileCategory, { color: colors.text }]}>
                {item.category}
              </Text>
              <View style={styles.mobileBarContainer}>
                <View
                  style={[
                    styles.mobileBar,
                    {
                      width: `${widthPercent}%`,
                      backgroundColor: categoryColors[index % categoryColors.length],
                    },
                  ]}
                />
              </View>
              <Text style={[styles.mobileAmount, { color: colors.text }]}>
                {formatCurrency(item.amount)}
              </Text>
            </View>
          );
        })}
      </View>

      {onViewAll && (
        <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
          <Text style={[styles.viewAllText, { color: chartColors.blue }]}>
            View all expenses →
          </Text>
        </TouchableOpacity>
      )}
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  viewAllButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mobileList: {
    gap: 12,
  },
  mobileRow: {
    gap: 8,
  },
  mobileCategory: {
    fontSize: 13,
    fontWeight: '500',
  },
  mobileBarContainer: {
    height: 24,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  mobileBar: {
    height: '100%',
    borderRadius: 4,
  },
  mobileAmount: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
