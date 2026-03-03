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

  // Mobile view
  return (
    <View style={pStyles.card}>
      {/* Header: title + total income */}
      <View style={pStyles.header}>
        <Text style={pStyles.title}>💵 Top Payers</Text>
        <Text style={pStyles.totalInHeader}>{formatCurrency(totalIncome)}</Text>
      </View>

      {isEmpty ? (
        <View style={pStyles.emptyState}>
          <Text style={pStyles.emptyIcon}>📭</Text>
          <Text style={pStyles.emptyText}>No payers yet</Text>
          <Text style={pStyles.emptyHint}>Add gigs to see your top payers</Text>
        </View>
      ) : (
        <>
          {/* Proportion bar */}
          <View style={pStyles.propBarWrap}>
            {data.map((item, index) => (
              <View
                key={index}
                style={[
                  pStyles.propBarSegment,
                  {
                    flex: item.amount / totalIncome,
                    backgroundColor: chartPalette.payers[index % chartPalette.payers.length],
                    borderRadius: index === 0 ? 3 : index === data.length - 1 ? 3 : 0,
                  },
                ]}
              />
            ))}
          </View>

          {/* Payer rows */}
          {data.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={pStyles.payerRow}
              onPress={() => onPayerClick?.(item.payer)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  pStyles.dot,
                  { backgroundColor: chartPalette.payers[index % chartPalette.payers.length] },
                ]}
              />
              <Text style={pStyles.payerName} numberOfLines={1}>{item.payer}</Text>
              <View style={pStyles.payerRight}>
                <Text style={pStyles.payerAmount}>{formatCurrency(item.amount)}</Text>
                <Text style={pStyles.payerPct}>{formatPercent(item.amount)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );
}

const pStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E3DE',
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
    color: '#1A1A1A',
  },
  totalInHeader: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#7A7671',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 10,
    gap: 6,
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: '600', color: '#1A1A1A' },
  emptyHint: { fontSize: 13, color: '#B0ADA8' },
  propBarWrap: {
    flexDirection: 'row',
    height: 6,
    marginHorizontal: 10,
    marginBottom: 16,
    borderRadius: 4,
    overflow: 'hidden',
    gap: 2,
  },
  propBarSegment: {
    height: 6,
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E3DE',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  payerName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  payerRight: {
    alignItems: 'flex-end',
  },
  payerAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    color: '#1A1A1A',
  },
  payerPct: {
    fontSize: 12,
    color: '#B0ADA8',
    marginTop: 1,
  },
});

// Keep old styles for web Kard / modal usage
const styles = StyleSheet.create({
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#111827' },
  emptyHint: { fontSize: 14, color: '#6b7280' },
  legendContainer: { marginTop: 16, gap: 8 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#f9fafb',
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#111827' },
  legendValue: { fontSize: 14, fontWeight: '600', color: '#111827' },
  legendPercent: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24, maxWidth: 400, width: '100%',
    ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' } as any, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 } }),
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 12 },
  modalText: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 20 },
  modalButton: { backgroundColor: '#3b82f6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  totalContainer: { alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  totalLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  totalValue: { fontSize: 24, fontWeight: '700' },
  mobileList: { gap: 0 },
  mobileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  colorDot: { width: 12, height: 12, borderRadius: 6 },
  mobileContent: { flex: 1 },
  payerName: { fontSize: 14, fontWeight: '500', marginBottom: 2 },
  payerPercent: { fontSize: 12 },
  payerAmount: { fontSize: 14, fontWeight: '600' },
});
