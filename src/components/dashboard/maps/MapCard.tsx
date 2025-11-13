/**
 * Map Card Component
 * Wrapper for map visualization with legend and controls
 */

import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../lib/charts/colors';
import { Kard } from '../Kard';
import { useMapStats } from '../../../hooks/useMapStats';
import type { DateRange } from '../../../hooks/useDashboardData';
import { USMap } from './USMap.web';
import { RegionTooltip } from './RegionTooltip';
import { RegionDrawer } from './RegionDrawer';
import { SidePanel } from '../../SidePanel';
import { MapLegend } from './MapLegend';

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
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | undefined>();
  const [showInfo, setShowInfo] = useState(false);

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
    setSelectedRegion(code);
  };

  if (isLoading) {
    return (
      <Kard title="Gig Map" icon="🗺️" onInfoPress={() => setShowInfo(true)}>
        <View style={styles.loading}>
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Loading map...
          </Text>
        </View>
      </Kard>
    );
  }

  if (error) {
    return (
      <Kard title="Gig Map" icon="🗺️" onInfoPress={() => setShowInfo(true)}>
        <View style={styles.error}>
          <Text style={[styles.errorText, { color: colors.textMuted }]}>
            Unable to load map data
          </Text>
        </View>
      </Kard>
    );
  }

  const hasData = statsMap && Object.keys(statsMap).length > 0;
  
  // Get non-zero gig counts for legend
  const nonZeroCounts = useMemo(() => {
    if (!statsMap) return [];
    return Object.values(statsMap)
      .map(s => s.gigsCount || 0)
      .filter(c => c > 0)
      .sort((a, b) => a - b);
  }, [statsMap]);

  if (!hasData) {
    return (
      <Kard title="Gig Map" icon="🗺️" onInfoPress={() => setShowInfo(true)}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={[styles.emptyText, { color: colors.text }]}>No gigs with location data yet</Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Add your first gig with a state to light up the map ✨
          </Text>
        </View>
      </Kard>
    );
  }

  const hoveredStats = hoveredRegion && statsMap ? statsMap[hoveredRegion] : null;

  return (
    <Kard
      title="Gig Map"
      icon="🗺️"
      onInfoPress={() => setShowInfo(true)}
    >
      <View style={styles.container}>
        {/* Map with aspect ratio constraint */}
        <View style={[styles.mapAspectContainer, { backgroundColor: colors.chartBg }]}>
          <View style={styles.mapWrapper}>
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
        </View>

        {/* Legend */}
        {nonZeroCounts.length > 0 && (
          <MapLegend values={nonZeroCounts} isDark={isDark} />
        )}

        {/* Tooltip (web only) */}
        {Platform.OS === 'web' && hoveredStats && tooltipPosition && (
          <RegionTooltip region={hoveredStats} position={tooltipPosition} />
        )}
      </View>

      {/* Info Modal */}
      {showInfo && (
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowInfo(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Gig Map</Text>
            <Text style={styles.modalText}>
              Shows where you've performed gigs across the United States. 
              Hover over states to see stats, click for detailed gig information.
            </Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowInfo(false)}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      )}

      {/* Region Drawer */}
      <SidePanel
        visible={!!selectedRegion}
        onClose={() => setSelectedRegion(null)}
        title={selectedRegion && statsMap?.[selectedRegion] ? statsMap[selectedRegion].label : ''}
        subtitle="Gig details"
      >
        {selectedRegion && statsMap?.[selectedRegion] && (
          <RegionDrawer
            region={statsMap[selectedRegion]}
            onClose={() => setSelectedRegion(null)}
          />
        )}
      </SidePanel>
    </Kard>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  mapAspectContainer: {
    width: '100%',
    minHeight: 320,
    aspectRatio: 2,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  mapWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  mobileNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  mobileNoticeText: {
    fontSize: 14,
    textAlign: 'center',
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loadingText: {
    fontSize: 14,
  },
  error: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  errorText: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  // Modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1000,
  } as any, // Cast to any to allow position: absolute on web
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
});
