/**
 * US Map Component - Web Implementation
 * Uses react-simple-maps for choropleth visualization
 */

import React, { useState, useMemo } from 'react';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { feature } from 'topojson-client';
import { useTheme } from '../../../contexts/ThemeContext';
import { getRegionColorScale, getStrokeColor, getStrokeWidth } from '../../../lib/maps/colorScale';
import type { RegionStatsMap } from '../../../hooks/useMapStats';

// Import TopoJSON
const usStatesTopology = require('../../../../assets/maps/us-states-10m.json');

interface USMapProps {
  stats: RegionStatsMap;
  onRegionHover?: (code: string | null) => void;
  onRegionClick?: (code: string) => void;
  hoveredRegion?: string | null;
}

export function USMap({ stats, onRegionHover, onRegionClick, hoveredRegion }: USMapProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
            
            // Debug: log if we can't find a state code
            if (!stateCode && stateName) {
              console.warn('Could not map state name to code:', stateName, geo.properties);
            }
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
                onMouseEnter={() => onRegionHover?.(stateCode)}
                onMouseLeave={() => onRegionHover?.(null)}
                onClick={() => hasGigs && onRegionClick?.(stateCode)}
                tabIndex={hasGigs ? 0 : -1}
                role="button"
                aria-label={`${stateName}: ${gigsCount} gig${gigsCount === 1 ? '' : 's'}`}
              />
            );
          })
        }
      </Geographies>
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
