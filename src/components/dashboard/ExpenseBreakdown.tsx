/**
 * Expense Breakdown - Horizontal bar chart
 * Shows top 5 categories with "View all" link
 */

import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { chartColors, getThemeColors } from '../../lib/charts/colors';
import { colors as themeColors } from '../../styles/theme';
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

  // Color palette for categories - use chart.expenses from theme
  const categoryColors = [
    themeColors.chart.expenses,
    themeColors.chart.expenses,
    themeColors.chart.expenses,
    themeColors.chart.expenses,
    themeColors.chart.expenses,
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
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border.muted} horizontal={false} />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  stroke={themeColors.text.subtle}
                  tick={{ fill: themeColors.text.subtle, fontSize: 14 }}
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
                    style={{ fill: themeColors.text.DEFAULT, fontSize: 14, fontWeight: '600' }}
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

  // Mobile view
  const maxAmount = top5.length > 0 ? Math.max(...top5.map(d => d.amount)) : 1;

  return (
    <View style={mStyles.card}>
      <View style={mStyles.header}>
        <Text style={mStyles.title}>📊 Expense Breakdown</Text>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Text style={mStyles.viewAllLink}>View all →</Text>
          </TouchableOpacity>
        )}
      </View>

      {isEmpty ? (
        <View style={mStyles.emptyState}>
          <Text style={mStyles.emptyIcon}>📭</Text>
          <Text style={mStyles.emptyText}>No expenses yet</Text>
          <Text style={mStyles.emptyHint}>Add expenses to see your breakdown</Text>
        </View>
      ) : (
        top5.map((item, index) => {
          const widthPct = (item.amount / maxAmount) * 100;
          return (
            <View key={index} style={mStyles.expRow}>
              <View style={mStyles.expRowTop}>
                <Text style={mStyles.expName}>{item.category}</Text>
                <Text style={mStyles.expAmount}>{formatCurrency(item.amount)}</Text>
              </View>
              <View style={mStyles.barTrack}>
                <View
                  style={[
                    mStyles.barFill,
                    {
                      width: `${widthPct}%` as any,
                      backgroundColor: categoryColors[index % categoryColors.length],
                    },
                  ]}
                />
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const mStyles = StyleSheet.create({
  card: {
    backgroundColor: themeColors.surface.DEFAULT,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: themeColors.border.DEFAULT,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: themeColors.text.DEFAULT,
  },
  viewAllLink: {
    fontSize: 13,
    fontWeight: '600',
    color: themeColors.brand.DEFAULT,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 10,
    gap: 6,
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: '600', color: themeColors.text.DEFAULT },
  emptyHint: { fontSize: 13, color: themeColors.text.subtle },
  expRow: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: themeColors.border.muted,
  },
  expRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  expName: {
    fontSize: 13,
    fontWeight: '500',
    color: themeColors.text.DEFAULT,
    flex: 1,
  },
  expAmount: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: themeColors.text.DEFAULT,
  },
  barTrack: {
    height: 6,
    backgroundColor: themeColors.surface.muted,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
  },
});

// Keep old styles object for web Kard usage (tooltip, modal, viewAllButton)
const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: themeColors.surface.elevated,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: themeColors.border.DEFAULT,
    ...Platform.select({
      web: { boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' } as any,
      default: { shadowColor: themeColors.text.DEFAULT, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
    }),
  },
  tooltipLabel: { fontSize: 14, fontWeight: '600', color: themeColors.text.DEFAULT, marginBottom: 4 },
  tooltipValue: { fontSize: 16, fontWeight: '700', color: themeColors.chart.expenses },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: themeColors.text.DEFAULT },
  emptyHint: { fontSize: 14, color: themeColors.text.subtle },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    backgroundColor: themeColors.surface.DEFAULT, borderRadius: 16, padding: 24, maxWidth: 400, width: '100%',
    ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' } as any, default: { shadowColor: themeColors.text.DEFAULT, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 } }),
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: themeColors.text.DEFAULT, marginBottom: 12 },
  modalText: { fontSize: 14, color: themeColors.text.subtle, lineHeight: 20, marginBottom: 20 },
  modalButton: { backgroundColor: themeColors.brand.DEFAULT, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: themeColors.brand.foreground, fontSize: 14, fontWeight: '600' },
  viewAllButton: { marginTop: 16, paddingVertical: 8, alignItems: 'center' },
  viewAllText: { fontSize: 14, fontWeight: '600' },
  mobileList: { gap: 12 },
  mobileRow: { gap: 8 },
  mobileCategory: { fontSize: 13, fontWeight: '500' },
  mobileBarContainer: { height: 24, backgroundColor: themeColors.surface.muted, borderRadius: 4, overflow: 'hidden' },
  mobileBar: { height: '100%', borderRadius: 4 },
  mobileAmount: { fontSize: 14, fontWeight: '600', textAlign: 'right' },
});
