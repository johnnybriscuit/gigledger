/**
 * Color scale for map choropleth visualization
 * Quantize scale based on gig count
 */

export const MAP_COLOR_SCALE = {
  none: '#f3f4f6',      // No gigs - light gray
  low: '#dbeafe',       // 1-5 gigs - light blue
  medium: '#93c5fd',    // 6-15 gigs - medium blue
  high: '#3b82f6',      // 16-50 gigs - blue
  veryHigh: '#1e40af',  // 51+ gigs - dark blue
  stroke: '#e5e7eb',    // Border color
  hover: '#fbbf24',     // Hover/selected - amber
};

export const MAP_COLOR_SCALE_DARK = {
  none: '#374151',      // No gigs - dark gray
  low: '#1e3a8a',       // 1-5 gigs - dark blue
  medium: '#1e40af',    // 6-15 gigs - medium dark blue
  high: '#3b82f6',      // 16-50 gigs - blue
  veryHigh: '#60a5fa',  // 51+ gigs - light blue
  stroke: '#4b5563',    // Border color
  hover: '#fbbf24',     // Hover/selected - amber
};

export interface ColorScaleLegend {
  label: string;
  color: string;
  range: string;
}

export function getColorScaleLegend(isDark: boolean): ColorScaleLegend[] {
  const colors = isDark ? MAP_COLOR_SCALE_DARK : MAP_COLOR_SCALE;
  
  return [
    { label: 'No gigs', color: colors.none, range: '0' },
    { label: 'Few gigs', color: colors.low, range: '1-5' },
    { label: 'Some gigs', color: colors.medium, range: '6-15' },
    { label: 'Many gigs', color: colors.high, range: '16-50' },
    { label: 'Very active', color: colors.veryHigh, range: '51+' },
  ];
}

export function getRegionColor(gigsCount: number, isDark: boolean, isHovered: boolean = false): string {
  const colors = isDark ? MAP_COLOR_SCALE_DARK : MAP_COLOR_SCALE;
  
  if (isHovered) return colors.hover;
  if (gigsCount === 0) return colors.none;
  if (gigsCount <= 5) return colors.low;
  if (gigsCount <= 15) return colors.medium;
  if (gigsCount <= 50) return colors.high;
  return colors.veryHigh;
}

export function getStrokeColor(isDark: boolean): string {
  return isDark ? MAP_COLOR_SCALE_DARK.stroke : MAP_COLOR_SCALE.stroke;
}
