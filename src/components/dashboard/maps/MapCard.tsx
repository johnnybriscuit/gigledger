/**
 * Map Card Component
 * Wrapper for map visualization with legend and controls
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../lib/charts/colors';
import { ChartCard } from '../../charts/ChartCard';
import { useMapStats } from '../../../hooks/useMapStats';
import type { DateRange } from '../../../hooks/useDashboardData';
import { USMap } from './USMap.web';
import { RegionTooltip } from './RegionTooltip';
import { getColorScaleLegend } from '../../../lib/maps/colorScale';

interface MapCardProps {
  dateRange?: DateRange;
  customStart?: Date;
  customEnd?: Date;
}

export function MapCard({ dateRange = 'ytd', customStart, customEnd }: MapCardProps) {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const isDark = theme === 'dark';

  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();

  // Fetch map data
  const { data: statsMap, isLoading, error } = useMapStats({
    scope: 'US',
    dateRange,
    customStart,
    customEnd,
  });

  const handleRegionHover = (code: string | null, event?: React.MouseEvent) => {
    setHoveredRegion(code);
    if (code && event && Platform.OS === 'web') {
      setTooltipPosition({ x: event.clientX, y: event.clientY });
    } else {
      setTooltipPosition(undefined);
    }
  };

  const handleRegionClick = (code: string) => {
    // TODO: Open drawer with region details
    console.log('Clicked region:', code, statsMap?.[code]);
  };

  if (isLoading) {
    return (
      <ChartCard title="Gig Map" subtitle="Where you've played">
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading map...
          </Text>
        </View>
      </ChartCard>
    );
  }

  if (error) {
    return (
      <ChartCard title="Gig Map" subtitle="Where you've played">
        <View style={styles.error}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Unable to load map data
          </Text>
        </View>
      </ChartCard>
    );
  }

  const hasData = statsMap && Object.keys(statsMap).length > 0;

  if (!hasData) {
    return (
      <ChartCard title="Gig Map" subtitle="Where you've played">
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No gigs with location data yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Add state codes to your gigs to see them on the map
          </Text>
        </View>
      </ChartCard>
    );
  }

  const legendItems = getColorScaleLegend(isDark);
  const hoveredStats = hoveredRegion && statsMap ? statsMap[hoveredRegion] : null;

  return (
    <ChartCard
      title="🗺️ Gig Map"
      subtitle="Where you've played"
      info="Hover over states to see stats, click for details"
    >
      <View style={styles.container}>
        {/* Map */}
        <View style={styles.mapContainer}>
          {Platform.OS === 'web' ? (
            <USMap
              stats={statsMap || {}}
              onRegionHover={handleRegionHover}
              onRegionClick={handleRegionClick}
              hoveredRegion={hoveredRegion}
            />
          ) : (
            <View style={styles.mobileNotice}>
              <Text style={[styles.mobileNoticeText, { color: colors.textMuted }]}>
                Map view available on web
              </Text>
            </View>
          )}
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          {legendItems.map((item, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: item.color }]} />
              <Text style={[styles.legendLabel, { color: colors.textMuted }]}>
                {item.range} gigs
              </Text>
            </View>
          ))}
        </View>

        {/* Tooltip (web only) */}
        {Platform.OS === 'web' && hoveredStats && tooltipPosition && (
          <RegionTooltip region={hoveredStats} position={tooltipPosition} />
        )}
      </View>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  mapContainer: {
    width: '100%',
    minHeight: 400,
    marginBottom: 16,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 12,
  },
  loading: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  error: {
    padding: 60,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
  },
  empty: {
    padding: 60,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
  },
  mobileNotice: {
    padding: 60,
    alignItems: 'center',
  },
  mobileNoticeText: {
    fontSize: 14,
  },
});
