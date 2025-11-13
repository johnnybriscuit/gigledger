/**
 * Expense Breakdown - Horizontal bar chart
 * Shows top 5 categories with "View all" link
 */

import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { chartColors, getThemeColors } from '../../lib/charts/colors';
import { Kard } from './Kard';
import type { ExpenseCategoryPoint } from '../../hooks/useDashboardData';

// Conditional imports
let BarChart: any, Bar: any, XAxis: any, YAxis: any, Cell: any, ResponsiveContainer: any, LabelList: any, CartesianGrid: any, Tooltip: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  BarChart = recharts.BarChart;
  Bar = recharts.Bar;
  XAxis = recharts.XAxis;
  YAxis = recharts.YAxis;
  Cell = recharts.Cell;
  ResponsiveContainer = recharts.ResponsiveContainer;
  LabelList = recharts.LabelList;
  CartesianGrid = recharts.CartesianGrid;
  Tooltip = recharts.Tooltip;
}

interface ExpenseBreakdownProps {
  data: ExpenseCategoryPoint[];
  onViewAll?: () => void;
}

export function ExpenseBreakdown({ data, onViewAll }: ExpenseBreakdownProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [showInfo, setShowInfo] = useState(false);

  // Take top 5 for the chart
  const top5 = data.slice(0, 5);
  const isEmpty = top5.length === 0;

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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>{payload[0].payload.category}</Text>
          <Text style={styles.tooltipValue}>{formatCurrency(payload[0].value)}</Text>
        </View>
      );
    }
    return null;
  };

  if (Platform.OS === 'web') {
    return (
      <Kard
        title="Expense Breakdown"
        icon="📊"
        onInfoPress={() => setShowInfo(true)}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No expenses yet</Text>
            <Text style={styles.emptyHint}>Add expenses to see your breakdown</Text>
          </View>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={top5}
                layout="vertical"
                margin={{ top: 5, right: 80, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
                <Bar dataKey="amount" radius={[8, 8, 8, 8]}>
                  {top5.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={categoryColors[index % categoryColors.length]} />
                  ))}
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={formatCurrency}
                    style={{ fill: '#111827', fontSize: 14, fontWeight: '600' }}
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
          </>
        )}

        {/* Info Modal */}
        <Modal
          visible={showInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowInfo(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowInfo(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Expense Breakdown</Text>
              <Text style={styles.modalText}>
                Shows your top 5 expense categories for the selected date range. 
                Click "View all expenses" to see detailed expense records filtered by the current date range.
              </Text>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowInfo(false)}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </Kard>
    );
  }

  // Mobile view - simple list with bars
  return (
    <Kard
      title="Expense Breakdown"
      icon="📊"
      onInfoPress={() => setShowInfo(true)}
    >
      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No expenses yet</Text>
          <Text style={styles.emptyHint}>Add expenses to see your breakdown</Text>
        </View>
      ) : (
        <>
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
        </>
      )}
    </Kard>
  );
}

const styles = StyleSheet.create({
  // Tooltip
  tooltip: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  tooltipLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  tooltipValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ef4444',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  emptyHint: {
    fontSize: 14,
    color: '#6b7280',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 20,
  },
  modalButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // View All Button
  viewAllButton: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Mobile List
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
