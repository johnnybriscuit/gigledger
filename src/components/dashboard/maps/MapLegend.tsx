/**
 * Map Legend Component
 * Shows quantile-based color scale for choropleth map
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { mapColors } from '../../../lib/charts/colors';

interface MapLegendProps {
  values: number[];
  isDark: boolean;
}

export function MapLegend({ values, isDark }: MapLegendProps) {
  const colors = isDark ? mapColors.dark : mapColors.light;
  
  // If no data, don't show legend
  if (values.length === 0) {
    return null;
  }

  // Calculate quantiles for legend labels
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  // Simple quantile breaks
  const q1 = sorted[Math.floor(sorted.length * 0.25)] || min;
  const q2 = sorted[Math.floor(sorted.length * 0.5)] || min;
  const q3 = sorted[Math.floor(sorted.length * 0.75)] || max;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
        Gigs
      </Text>
      
      {/* Color swatches */}
      <View style={styles.swatches}>
        {colors.nonZeroStops.map((color, i) => (
          <View
            key={i}
            style={[styles.swatch, { backgroundColor: color }]}
          />
        ))}
      </View>
      
      {/* Range labels */}
      <Text style={[styles.rangeLabel, { color: isDark ? '#9ca3af' : '#6b7280' }]}>
        {min === max 
          ? `${min}` 
          : `${min} – ${Math.round(q2)} … ${max}+`
        }
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
  },
  swatches: {
    flexDirection: 'row',
    gap: 2,
  },
  swatch: {
    width: 24,
    height: 12,
    borderRadius: 2,
  },
  rangeLabel: {
    fontSize: 11,
    marginLeft: 4,
  },
});
