/**
 * Centralized color tokens for charts and dashboard
 * Supports light and dark themes
 */

export const chartColors = {
  // Primary brand colors
  blue: '#2563eb',      // --gl-blue (income, primary actions)
  green: '#16a34a',     // --gl-green (net positive, profit)
  red: '#ef4444',       // --gl-red (expenses, negative)
  amber: '#f59e0b',     // --gl-amber (taxes, warnings)
  
  // Neutral colors
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',     // Muted text for grid/axis
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // Theme-specific backgrounds
  light: {
    cardBg: '#f8fafc',
    chartBg: '#ffffff',
    text: '#111827',
    textMuted: '#6b7280',
    border: '#e5e7eb',
  },
  
  dark: {
    cardBg: '#0b1220',
    chartBg: '#1a1f2e',
    text: '#f9fafb',
    textMuted: '#9ca3af',
    border: '#374151',
  },
} as const;

// Chart-specific color arrays for multi-series data
export const chartPalette = {
  income: [chartColors.blue, '#3b82f6', '#60a5fa'],
  expenses: [chartColors.red, '#f87171', '#fca5a5'],
  taxes: [chartColors.amber, '#fbbf24', '#fcd34d'],
  payers: [
    '#2563eb', // blue
    '#16a34a', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
  ],
} as const;

// Gradient definitions for sparklines and area charts
export const chartGradients = {
  profit: {
    start: 'rgba(22, 163, 74, 0.3)',  // green with opacity
    end: 'rgba(22, 163, 74, 0)',
  },
  loss: {
    start: 'rgba(239, 68, 68, 0.3)',   // red with opacity
    end: 'rgba(239, 68, 68, 0)',
  },
  income: {
    start: 'rgba(37, 99, 235, 0.3)',   // blue with opacity
    end: 'rgba(37, 99, 235, 0)',
  },
} as const;

// Helper to get theme-aware colors
export function getThemeColors(theme: 'light' | 'dark') {
  return theme === 'light' ? chartColors.light : chartColors.dark;
}

// Helper for status colors
export function getStatusColor(value: number, type: 'net' | 'change' = 'net') {
  if (value > 0) return chartColors.green;
  if (value < 0) return chartColors.red;
  return chartColors.gray[500];
}

// Map choropleth colors - contrasty palette for readability
export const mapColors = {
  light: {
    zeroFill: '#F1F5F9',      // slate-100 - subtle background for zero states
    zeroStroke: '#94A3B8',     // slate-400 - visible outline
    nonZeroStops: [
      '#93C5FD',  // blue-300 - lightest (1-2 gigs)
      '#60A5FA',  // blue-400 - light (3-5 gigs)
      '#3B82F6',  // blue-500 - medium (6-10 gigs)
      '#2563EB',  // blue-600 - dark (11-20 gigs)
      '#1E40AF',  // blue-700 - darkest (21+ gigs)
    ],
    hoverStroke: '#111827',    // gray-900 - strong contrast on hover
    hoverShadow: 'rgba(0, 0, 0, 0.2)',
  },
  dark: {
    zeroFill: '#1F2937',       // gray-800 - dark background for zero states
    zeroStroke: '#374151',     // gray-700 - subtle outline
    nonZeroStops: [
      '#93C5FD',  // blue-300 - same vibrant palette works in dark
      '#60A5FA',  // blue-400
      '#3B82F6',  // blue-500
      '#2563EB',  // blue-600
      '#1E40AF',  // blue-700
    ],
    hoverStroke: '#F9FAFB',    // gray-50 - light stroke on hover
    hoverShadow: 'rgba(255, 255, 255, 0.2)',
  },
} as const;

// Export for use in styled components or inline styles
export const cssVars = `
  --gl-blue: ${chartColors.blue};
  --gl-green: ${chartColors.green};
  --gl-red: ${chartColors.red};
  --gl-amber: ${chartColors.amber};
  --gl-gray-500: ${chartColors.gray[500]};
`;
