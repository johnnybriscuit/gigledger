/**
 * Top Payers - Donut chart
 * Shows income distribution by payer with click-to-filter
 */

import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { chartPalette, getThemeColors } from '../../lib/charts/colors';
import { Kard } from './Kard';
import type { PayerBreakdown } from '../../hooks/useDashboardData';

// Conditional imports
let PieChart: any, Pie: any, Cell: any, ResponsiveContainer: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  PieChart = recharts.PieChart;
  Pie = recharts.Pie;
  Cell = recharts.Cell;
  ResponsiveContainer = recharts.ResponsiveContainer;
}

interface TopPayersProps {
  data: PayerBreakdown[];
  onPayerClick?: (payer: string) => void;
}

export function TopPayers({ data, onPayerClick }: TopPayersProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const [showInfo, setShowInfo] = useState(false);

  const totalIncome = data.reduce((sum, p) => sum + p.amount, 0);
  const isEmpty = data.length === 0;

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
      <Kard
        title="Top Payers"
        icon="💰"
        onInfoPress={() => setShowInfo(true)}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No payers yet</Text>
            <Text style={styles.emptyHint}>Add gigs to see your top payers</Text>
          </View>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amount"
                  nameKey="payer"
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
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
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            <View style={styles.legendContainer}>
              {data.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.legendItem}
                  onPress={() => onPayerClick?.(item.payer)}
                  accessibilityLabel={`${item.payer}: ${formatCurrency(item.amount)}`}
                  accessibilityRole="button"
                >
                  <View
                    style={[
                      styles.legendDot,
                      { backgroundColor: chartPalette.payers[index % chartPalette.payers.length] },
                    ]}
                  />
                  <Text style={styles.legendLabel} numberOfLines={1}>
                    {item.payer}
                  </Text>
                  <Text style={styles.legendValue}>
                    {formatCurrency(item.amount)}
                  </Text>
                  <Text style={styles.legendPercent}>
                    ({formatPercent(item.amount)})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
              <Text style={styles.modalTitle}>Top Payers</Text>
              <Text style={styles.modalText}>
                Shows your income distribution by payer for the selected date range. 
                Click on a payer to filter your gigs and see detailed records.
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

  // Mobile view - list with color indicators
  return (
    <Kard
      title="Top Payers"
      icon="💰"
      onInfoPress={() => setShowInfo(true)}
    >
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
    </Kard>
  );
}

const styles = StyleSheet.create({
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
  // Custom Legend
  legendContainer: {
    marginTop: 16,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'background-color 0.2s',
        ':hover': {
          backgroundColor: '#f3f4f6',
        },
      },
    }),
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  legendValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  legendPercent: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
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
  // Mobile View
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
