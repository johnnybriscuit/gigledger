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

  if (!region || !position) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // On web, use a native div for proper fixed positioning
  if (Platform.OS === 'web') {
    const tooltipContent = `${region.label} — ${region.gigsCount} ${region.gigsCount === 1 ? 'gig' : 'gigs'} · ${formatCurrency(region.totalIncome)}`;
    
    return (
      <div
        style={{
          position: 'fixed',
          left: position.x + 10,
          top: position.y + 10,
          zIndex: 1000,
          backgroundColor: colors.cardBg,
          border: `1px solid ${colors.border}`,
          borderRadius: '8px',
          padding: '12px',
          maxWidth: '250px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          pointerEvents: 'none',
          fontSize: '14px',
          fontWeight: '600',
          color: colors.text,
        }}
      >
        {tooltipContent}
      </div>
    );
  }

  // Fallback for native (though this component is web-only)
  return (
    <View style={[styles.container, { backgroundColor: colors.cardBg, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {region.label} — {region.gigsCount} {region.gigsCount === 1 ? 'gig' : 'gigs'} · {formatCurrency(region.totalIncome)}
      </Text>
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
