/**
 * Color scale for map choropleth visualization
 * Uses symlog scale and RGB interpolation for readable gradients with few gigs
 */

import { mapColors } from '../charts/colors';

/**
 * Interpolate between RGB colors
 * @param colors Array of hex color strings
 * @param t Value between 0 and 1
 */
function interpolateRgb(colors: string[], t: number): string {
  // Clamp t between 0 and 1
  t = Math.max(0, Math.min(1, t));
  
  // Find the two colors to interpolate between
  const scaledT = t * (colors.length - 1);
  const index = Math.floor(scaledT);
  const localT = scaledT - index;
  
  if (index >= colors.length - 1) {
    return colors[colors.length - 1];
  }
  
  const color1 = hexToRgb(colors[index]);
  const color2 = hexToRgb(colors[index + 1]);
  
  const r = Math.round(color1.r + (color2.r - color1.r) * localT);
  const g = Math.round(color1.g + (color2.g - color1.g) * localT);
  const b = Math.round(color1.b + (color2.b - color1.b) * localT);
  
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

/**
 * Symlog scale for better distribution with few data points
 * Similar to d3.scaleSymlog but simplified
 */
function symlog(value: number, constant: number = 1): number {
  return Math.sign(value) * Math.log1p(Math.abs(value) / constant);
}

/**
 * Get color for a region based on gig count
 * Uses symlog scale for better distribution with few gigs
 */
export function getRegionColorScale(gigsCount: number, allCounts: number[], isDark: boolean): string {
  const colors = isDark ? mapColors.dark : mapColors.light;
  
  // Zero state
  if (gigsCount === 0) {
    return colors.zeroFill;
  }
  
  // Get non-zero counts for scale
  const nonZeroCounts = allCounts.filter(c => c > 0);
  
  if (nonZeroCounts.length === 0) {
    return colors.zeroFill;
  }
  
  const minNonZero = Math.min(...nonZeroCounts);
  const maxNonZero = Math.max(...nonZeroCounts);
  
  // If all values are the same, use middle color
  if (minNonZero === maxNonZero) {
    return colors.nonZeroStops[Math.floor(colors.nonZeroStops.length / 2)];
  }
  
  // Apply symlog transformation for better distribution
  const scaledMin = symlog(minNonZero);
  const scaledMax = symlog(maxNonZero);
  const scaledValue = symlog(gigsCount);
  
  // Normalize to 0-1 range
  let t = (scaledValue - scaledMin) / (scaledMax - scaledMin);
  
  // Floor at 0.12 to ensure minimum visibility (never too close to white)
  t = Math.max(0.12, Math.min(1, t));
  
  return interpolateRgb([...colors.nonZeroStops], t);
}

/**
 * Get stroke color for a region
 */
export function getStrokeColor(gigsCount: number, isDark: boolean, isHovered: boolean = false): string {
  const colors = isDark ? mapColors.dark : mapColors.light;
  
  if (isHovered) {
    return colors.hoverStroke;
  }
  
  // Zero states get subtle stroke
  if (gigsCount === 0) {
    return colors.zeroStroke;
  }
  
  // Non-zero states get white/light stroke for contrast
  return isDark ? '#374151' : '#FFFFFF';
}

/**
 * Get stroke width for a region
 */
export function getStrokeWidth(isHovered: boolean = false): number {
  return isHovered ? 2 : 1;
}

/**
 * Get legend items for the current data
 */
export function getColorScaleLegend(isDark: boolean): Array<{ color: string }> {
  const colors = isDark ? mapColors.dark : mapColors.light;
  return colors.nonZeroStops.map(color => ({ color }));
}
