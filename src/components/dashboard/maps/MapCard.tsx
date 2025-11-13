/**
 * Map Card Component
 * Wrapper for map visualization with legend and controls
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Platform, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../contexts/ThemeContext';
import { getThemeColors } from '../../../lib/charts/colors';
import { Kard } from '../Kard';
import { useMapStats } from '../../../hooks/useMapStats';
import type { DateRange } from '../../../hooks/useDashboardData';
import { USMap } from './USMap.web';
import { RegionTooltip } from './RegionTooltip';
import { RegionDrawer } from './RegionDrawer';
import { SidePanel } from '../../SidePanel';
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

  if (!hasData) {
    return (
      <Kard title="Gig Map" icon="🗺️" onInfoPress={() => setShowInfo(true)}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📍</Text>
          <Text style={styles.emptyText}>No gigs with location data yet</Text>
          <Text style={styles.emptyHint}>
            Add state codes to your gigs to see them on the map
          </Text>
        </View>
      </Kard>
    );
  }

  const legendItems = getColorScaleLegend(isDark);
  const hoveredStats = hoveredRegion && statsMap ? statsMap[hoveredRegion] : null;

  return (
    <Kard
      title="Gig Map"
      icon="🗺️"
      onInfoPress={() => setShowInfo(true)}
    >
      <View style={styles.container}>
        {/* Map with aspect ratio constraint */}
        <View style={styles.mapAspectContainer}>
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
          </View>
        </TouchableOpacity>
      </Modal>

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
    position: 'relative',
  },
  // Responsive aspect ratio container
  mapAspectContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    maxHeight: 460,
    marginBottom: 16,
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    ...Platform.select({
      web: {
        '@media (max-width: 768px)': {
          maxHeight: 420,
        },
        '@media (max-width: 640px)': {
          maxHeight: 300,
        },
      },
    }),
  },
  mapWrapper: {
    width: '100%',
    height: '100%',
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
    paddingTop: 12,
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
    color: '#6b7280',
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
    textAlign: 'center',
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
  // Loading/Error States
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
  mobileNotice: {
    padding: 60,
    alignItems: 'center',
  },
  mobileNoticeText: {
    fontSize: 14,
  },
});
