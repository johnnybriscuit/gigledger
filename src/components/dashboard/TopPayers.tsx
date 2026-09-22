/**
 * Top Payers - Donut chart
 * Shows income distribution by payer with click-to-filter
 */

import React, { useState } from 'react';
import { View, Text, Platform, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { chartColors, chartPalette, getThemeColors } from '../../lib/charts/colors';
import { colors as themeColors, getDashboardCardTokens } from '../../styles/theme';
import { Kard } from './Kard';
import { useWidgetCollapsed } from '../../hooks/useWidgetCollapsed';
import type { PayerBreakdown } from '../../hooks/useDashboardData';

// Conditional imports
let PieChart: any, Pie: any, Cell: any, ResponsiveContainer: any, Tooltip: any;

if (Platform.OS === 'web') {
  const recharts = require('recharts');
  PieChart = recharts.PieChart;
  Pie = recharts.Pie;
  Cell = recharts.Cell;
  ResponsiveContainer = recharts.ResponsiveContainer;
  Tooltip = recharts.Tooltip;
}

interface TopPayersProps {
  data: PayerBreakdown[];
  onPayerClick?: (payer: string) => void;
}

export function TopPayers({ data, onPayerClick }: TopPayersProps) {
  data = data ?? [];
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  // Dashboard cards are dark regardless of the in-app theme toggle; the
  // static `themeColors` import used by pStyles resolves to the light
  // palette on native, so override colors on the mobile card at usage sites.
  const cardColors = getDashboardCardTokens(theme);
  const [showInfo, setShowInfo] = useState(false);
  // Legend list starts collapsed so this card's bottom edge aligns with the
  // Expense Breakdown card beside it; the pie hover tooltip covers "who's who".
  const [legendCollapsed, toggleLegend] = useWidgetCollapsed('top-payers-legend', true);
  const [cardCollapsed, toggleCard] = useWidgetCollapsed('top-payers', false);

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

  // Hover tooltip for pie slices — shows payer, amount, and share
  const PayerTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0];
      return (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>{item.name}</Text>
          <Text style={styles.tooltipValue}>
            {formatCurrency(item.value)} ({formatPercent(item.value)})
          </Text>
        </View>
      );
    }
    return null;
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
        icon={<Ionicons name="cash-outline" size={20} color={themeColors.text.subtle} />}
        onInfoPress={() => setShowInfo(true)}
        collapsible
        collapseKey="top-payers"
        style={styles.fillCard}
      >
        {isEmpty ? (
          <View style={styles.emptyState}>
            <Ionicons name="file-tray-outline" size={48} color={themeColors.text.subtle} style={styles.emptyIcon} />
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
                <Tooltip content={<PayerTooltip />} />
                {renderCenterLabel()}
              </PieChart>
            </ResponsiveContainer>

            {/* Foldable legend — collapsed by default so this card aligns
                with Expense Breakdown; hover the pie for who's who */}
            <TouchableOpacity
              style={styles.legendToggle}
              onPress={toggleLegend}
              activeOpacity={0.7}
              accessibilityLabel={legendCollapsed ? 'Show payer list' : 'Hide payer list'}
              accessibilityRole="button"
            >
              <Text style={styles.legendToggleText}>
                {legendCollapsed ? `Show payer list (${data.length}) ▾` : 'Hide payer list ▴'}
              </Text>
            </TouchableOpacity>
            {!legendCollapsed && (
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
    <View style={[pStyles.card, { backgroundColor: cardColors.background, borderColor: cardColors.border }]}>
      {/* Header: title + total income */}
      <View style={pStyles.header}>
        <TouchableOpacity
          style={pStyles.titleRow}
          onPress={toggleCard}
          activeOpacity={0.7}
          accessibilityLabel={cardCollapsed ? 'Expand Top Payers' : 'Collapse Top Payers'}
          accessibilityRole="button"
        >
          <Ionicons name="cash-outline" size={18} color={cardColors.title} />
          <Text style={[pStyles.title, { color: cardColors.title }]}>Top Payers</Text>
          <Text style={[pStyles.chevron, { color: cardColors.subtle }]}>
            {cardCollapsed ? '▾' : '▴'}
          </Text>
        </TouchableOpacity>
        <Text style={[pStyles.totalInHeader, { color: cardColors.subtle }]}>{formatCurrency(totalIncome)}</Text>
      </View>

      {cardCollapsed ? null : isEmpty ? (
        <View style={pStyles.emptyState}>
          <Ionicons name="file-tray-outline" size={36} color={cardColors.subtle} style={pStyles.emptyIcon} />
          <Text style={[pStyles.emptyText, { color: cardColors.title }]}>No payers yet</Text>
          <Text style={[pStyles.emptyHint, { color: cardColors.subtle }]}>Add gigs to see your top payers</Text>
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
              style={[pStyles.payerRow, { borderTopColor: cardColors.borderMuted }]}
              onPress={() => onPayerClick?.(item.payer)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  pStyles.dot,
                  { backgroundColor: chartPalette.payers[index % chartPalette.payers.length] },
                ]}
              />
              <Text style={[pStyles.payerName, { color: cardColors.title }]} numberOfLines={1}>{item.payer}</Text>
              <View style={pStyles.payerRight}>
                <Text style={[pStyles.payerAmount, { color: cardColors.title }]}>{formatCurrency(item.amount)}</Text>
                <Text style={[pStyles.payerPct, { color: cardColors.subtle }]}>{formatPercent(item.amount)}</Text>
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
    borderRadius: 20,
    borderWidth: 1,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
  },
  totalInHeader: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 10,
    gap: 6,
  },
  emptyIcon: { fontSize: 36, marginBottom: 4 },
  emptyText: { fontSize: 15, fontWeight: '600' },
  emptyHint: { fontSize: 13 },
  chevron: { fontSize: 11 },
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
  },
  payerRight: {
    alignItems: 'flex-end',
  },
  payerAmount: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  payerPct: {
    fontSize: 12,
    marginTop: 1,
  },
});

// Keep old styles for web Kard / modal usage
const styles = StyleSheet.create({
  fillCard: { flex: 1 },
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
  tooltipValue: { fontSize: 15, fontWeight: '700', color: themeColors.text.DEFAULT },
  legendToggle: { marginTop: 4, paddingVertical: 8, alignItems: 'center' },
  legendToggleText: { fontSize: 13, fontWeight: '600', color: themeColors.text.subtle },
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon: { fontSize: 48, marginBottom: 8 },
  emptyText: { fontSize: 16, fontWeight: '600', color: themeColors.text.DEFAULT },
  emptyHint: { fontSize: 14, color: themeColors.text.subtle },
  legendContainer: { marginTop: 16, gap: 8 },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: themeColors.surface.muted,
    ...Platform.select({ web: { cursor: 'pointer' } as any }),
  },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: themeColors.text.DEFAULT },
  legendValue: { fontSize: 14, fontWeight: '600', color: themeColors.text.DEFAULT },
  legendPercent: { fontSize: 12, color: themeColors.text.subtle, marginLeft: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: {
    backgroundColor: themeColors.surface.DEFAULT, borderRadius: 16, padding: 24, maxWidth: 400, width: '100%',
    ...Platform.select({ web: { boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' } as any, default: { shadowColor: themeColors.text.DEFAULT, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 } }),
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: themeColors.text.DEFAULT, marginBottom: 12 },
  modalText: { fontSize: 14, color: themeColors.text.subtle, lineHeight: 20, marginBottom: 20 },
  modalButton: { backgroundColor: themeColors.brand.DEFAULT, paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  modalButtonText: { color: themeColors.brand.foreground, fontSize: 14, fontWeight: '600' },
  totalContainer: { alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: themeColors.border.DEFAULT },
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
