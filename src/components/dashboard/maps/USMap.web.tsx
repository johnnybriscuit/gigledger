/**
 * US Map Component - Web Implementation
 * Uses react-simple-maps for choropleth visualization
 */

import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { feature } from 'topojson-client';
import { useTheme } from '../../../contexts/ThemeContext';
import { getRegionColorScale, getStrokeColor, getStrokeWidth } from '../../../lib/maps/colorScale';
import type { RegionStatsMap } from '../../../hooks/useMapStats';
import type { CityGigGroup } from '../../../lib/maps/geocoding';

// Import TopoJSON
const usStatesTopology = require('../../../../assets/maps/us-states-10m.json');

interface USMapProps {
  stats: RegionStatsMap;
  onRegionHover?: (code: string | null, event?: React.MouseEvent) => void;
  onRegionClick?: (code: string) => void;
  hoveredRegion?: string | null;
  cityGroups?: CityGigGroup[];
  selectedState?: string | null;
}

export function USMap({ stats, onRegionHover, onRegionClick, hoveredRegion, cityGroups, selectedState }: USMapProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [cityTooltipPos, setCityTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Convert TopoJSON to GeoJSON features
  const geographies = useMemo(() => {
    const geoData: any = feature(
      usStatesTopology,
      usStatesTopology.objects.states
    );
    return geoData.features || [];
  }, []);

  // Get all gig counts for color scale calculation
  const allCounts = useMemo(() => {
    if (!stats || typeof stats !== 'object') return [];
    return Object.values(stats).map(s => s?.gigsCount || 0);
  }, [stats]);

  return (
    <ComposableMap
      projection="geoAlbersUsa"
      projectionConfig={{
        scale: 1000,
      }}
      style={{
        width: '100%',
        height: 'auto',
      }}
    >
      <Geographies geography={{ type: 'FeatureCollection', features: geographies }}>
        {({ geographies }: any) =>
          geographies.map((geo: any) => {
            // Get state code from properties
            // TopoJSON might use 'name' or 'NAME' property
            const stateName = geo.properties.name || geo.properties.NAME;
            const stateCode = stateName ? getStateCodeFromName(stateName) : null;
            
            // Skip if we can't find a state code (territories, etc.)
            if (!stateCode) return null;

            const regionStats = stats[stateCode];
            const gigsCount = regionStats?.gigsCount || 0;
            const isHovered = hoveredRegion === stateCode;
            const hasGigs = gigsCount > 0;

            return (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                fill={getRegionColorScale(gigsCount, allCounts, isDark)}
                stroke={getStrokeColor(gigsCount, isDark, isHovered)}
                strokeWidth={getStrokeWidth(isHovered)}
                style={{
                  default: { 
                    outline: 'none',
                    transition: 'all 0.15s ease-in-out',
                  },
                  hover: { 
                    outline: 'none', 
                    cursor: hasGigs ? 'pointer' : 'default',
                    filter: isHovered && hasGigs ? `drop-shadow(0 1px 2px ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'})` : 'none',
                  },
                  pressed: { 
                    outline: 'none',
                  },
                }}
                onMouseEnter={(e: any) => {
                  // react-simple-maps passes a synthetic event, we need the native event
                  const nativeEvent = e?.nativeEvent || e;
                  onRegionHover?.(stateCode, nativeEvent);
                }}
                onMouseLeave={(e: any) => {
                  const nativeEvent = e?.nativeEvent || e;
                  onRegionHover?.(null, nativeEvent);
                }}
                onClick={() => hasGigs && onRegionClick?.(stateCode)}
                tabIndex={hasGigs ? 0 : -1}
                role="button"
                aria-label={`${stateName}: ${gigsCount} gig${gigsCount === 1 ? '' : 's'}`}
              />
            );
          })
        }
      </Geographies>

      {/* City-level pins when state is selected */}
      {selectedState && cityGroups && cityGroups.length > 0 && (
        cityGroups.map((cityGroup) => {
          const isHovered = hoveredCity === cityGroup.city;
          return (
            <Marker
              key={cityGroup.city}
              coordinates={[cityGroup.coordinates.lon, cityGroup.coordinates.lat]}
              onMouseEnter={(e: any) => {
                setHoveredCity(cityGroup.city);
                if (e && e.clientX && e.clientY) {
                  setCityTooltipPos({ x: e.clientX, y: e.clientY });
                }
              }}
              onMouseLeave={() => {
                setHoveredCity(null);
                setCityTooltipPos(null);
              }}
            >
              <circle
                r={isHovered ? 6 : 4}
                fill="#3b82f6"
                stroke="#fff"
                strokeWidth={isHovered ? 2 : 1}
                style={{
                  transition: 'all 0.2s ease',
                }}
              />
            </Marker>
          );
        })
      )}

      {/* City tooltip */}
      {hoveredCity && cityTooltipPos && (() => {
        const cityGroup = cityGroups?.find(c => c.city === hoveredCity);
        if (!cityGroup) return null;
        
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
          });
        };

        return (
          <foreignObject
            x={0}
            y={0}
            width="100%"
            height="100%"
            style={{ pointerEvents: 'none', overflow: 'visible' }}
          >
            <div
              style={{
                position: 'fixed',
                left: cityTooltipPos.x + 10,
                top: cityTooltipPos.y + 10,
                backgroundColor: isDark ? '#1f2937' : '#ffffff',
                border: `1px solid ${isDark ? '#374151' : '#e5e7eb'}`,
                borderRadius: '8px',
                padding: '8px 12px',
                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                zIndex: 1000,
                maxWidth: '200px',
                fontSize: '13px',
                color: isDark ? '#f9fafb' : '#111827',
              }}
            >
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                {cityGroup.city}
              </div>
              <div style={{ fontSize: '12px', color: isDark ? '#9ca3af' : '#6b7280' }}>
                {cityGroup.gigs.length} {cityGroup.gigs.length === 1 ? 'gig' : 'gigs'} · {formatCurrency(cityGroup.totalAmount)}
              </div>
              {cityGroup.gigs.length > 0 && cityGroup.gigs[0].payer && (
                <div style={{ fontSize: '11px', color: isDark ? '#9ca3af' : '#6b7280', marginTop: '4px' }}>
                  {formatDate(cityGroup.gigs[0].date)} · {cityGroup.gigs[0].payer}
                </div>
              )}
            </div>
          </foreignObject>
        );
      })()}
    </ComposableMap>
  );
}

// Helper to convert state name to postal code
// TopoJSON uses full state names, we need 2-letter codes
function getStateCodeFromName(name: string): string | null {
  const nameToCode: Record<string, string> = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
    'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
    'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
    'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
    'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
    'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
    'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
    'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
    'Wisconsin': 'WI', 'Wyoming': 'WY', 'District of Columbia': 'DC',
  };
  
  return nameToCode[name] || null;
}
