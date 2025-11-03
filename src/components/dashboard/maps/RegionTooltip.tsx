/**
 * Region Tooltip Component
 * Shows stats on hover over map regions
 */

import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../lib/charts/colors';
import type { RegionStats } from '../../../hooks/useMapStats';

interface RegionTooltipProps {
  region: RegionStats | null;
  position?: { x: number; y: number };
}

export function RegionTooltip({ region, position }: RegionTooltipProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  if (!region) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const tooltipStyle: any = Platform.OS === 'web' && position
    ? {
        position: 'fixed',
        left: position.x + 10,
        top: position.y + 10,
        zIndex: 1000,
      }
    : {};

  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }, tooltipStyle]}>
      {/* Region name */}
      <Text style={[styles.title, { color: colors.text }]}>
        {region.label}
      </Text>

      {/* Gig count and total */}
      <Text style={[styles.stats, { color: colors.text }]}>
        {region.gigsCount} {region.gigsCount === 1 ? 'gig' : 'gigs'} • {formatCurrency(region.totalIncome)} total
      </Text>

      {/* Top payers */}
      {region.topPayers.length > 0 && (
        <Text style={[styles.payers, { color: colors.textMuted }]}>
          Top payers: {region.topPayers.join(', ')}
        </Text>
      )}

      {/* Last gig date */}
      {region.lastGigDate && (
        <Text style={[styles.date, { color: colors.textMuted }]}>
          Last gig: {formatDate(region.lastGigDate)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    maxWidth: 250,
    ...Platform.select({
      web: {
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        pointerEvents: 'none',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  stats: {
    fontSize: 13,
    marginBottom: 6,
  },
  payers: {
    fontSize: 12,
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    fontStyle: 'italic',
  },
});
