/**
 * Bozzy Design Tokens
 * 
 * Single source of truth for colors, spacing, typography, and other design values.
 * These tokens are used in both Tailwind config and component styles.
 * 
 * Design Philosophy: Calm, welcoming, and consistent
 * - Generous whitespace
 * - Soft shadows over hard borders
 * - Subtle interactions (120ms ease-out)
 * - Clear hierarchy through typography and spacing
 */

import { Platform } from 'react-native';

export type ThemeMode = 'light' | 'dark';

const themePalettes = {
  light: {
    brand: {
      DEFAULT: '#2563eb',
      foreground: '#ffffff',
      hover: '#1d4ed8',
      muted: '#dbeafe',
    },
    surface: {
      canvas: '#f6f8fb',
      DEFAULT: '#ffffff',
      muted: '#f3f6fb',
      elevated: '#ffffff',
      inverse: '#101828',
    },
    text: {
      DEFAULT: '#101828',
      muted: '#475467',
      subtle: '#667085',
      inverse: '#ffffff',
    },
    success: {
      DEFAULT: '#15803d',
      foreground: '#ffffff',
      muted: '#dcfce7',
    },
    warning: {
      DEFAULT: '#b45309',
      foreground: '#ffffff',
      muted: '#fef3c7',
    },
    danger: {
      DEFAULT: '#b91c1c',
      foreground: '#ffffff',
      muted: '#fee2e2',
    },
    error: {
      DEFAULT: '#b91c1c',
      foreground: '#ffffff',
      muted: '#fee2e2',
    },
    border: {
      DEFAULT: '#d0d5dd',
      muted: '#eaecf0',
      strong: '#98a2b3',
      focus: '#2563eb',
    },
    overlay: {
      DEFAULT: 'rgba(15, 23, 42, 0.56)',
      muted: 'rgba(15, 23, 42, 0.18)',
    },
    chart: {
      primary: '#2563eb',
      secondary: '#0f766e',
      tertiary: '#15803d',
      quaternary: '#7c3aed',
      quinary: '#db2777',
      income: '#15803d',
      expenses: '#dc2626',
      taxes: '#d97706',
      profit: '#15803d',
    },
  },
  dark: {
    brand: {
      DEFAULT: '#3b82f6',
      foreground: '#f8fafc',
      hover: '#60a5fa',
      muted: '#172554',
    },
    surface: {
      canvas: '#0f1720',
      DEFAULT: '#151b23',
      muted: '#1b2430',
      elevated: '#202a37',
      inverse: '#f8fafc',
    },
    text: {
      DEFAULT: '#f8fafc',
      muted: '#dbe4f0',
      subtle: '#b6c2d2',
      inverse: '#0f1720',
    },
    success: {
      DEFAULT: '#22c55e',
      foreground: '#052e16',
      muted: '#11361f',
    },
    warning: {
      DEFAULT: '#f59e0b',
      foreground: '#1f1300',
      muted: '#3b2a0d',
    },
    danger: {
      DEFAULT: '#f87171',
      foreground: '#2b0b0e',
      muted: '#3f171d',
    },
    error: {
      DEFAULT: '#f87171',
      foreground: '#2b0b0e',
      muted: '#3f171d',
    },
    border: {
      DEFAULT: '#334155',
      muted: '#263241',
      strong: '#64748b',
      focus: '#60a5fa',
    },
    overlay: {
      DEFAULT: 'rgba(2, 6, 23, 0.72)',
      muted: 'rgba(15, 23, 42, 0.4)',
    },
    chart: {
      primary: '#60a5fa',
      secondary: '#2dd4bf',
      tertiary: '#4ade80',
      quaternary: '#a78bfa',
      quinary: '#f472b6',
      income: '#34D399',
      expenses: '#F87171',
      taxes: '#FBBF24',
      profit: '#34D399',
    },
  },
} as const;

export function getThemePalette(theme: ThemeMode) {
  return themePalettes[theme];
}

const cssVar = (token: string, fallback: string) =>
  Platform.OS === 'web' ? `var(${token}, ${fallback})` : fallback;

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Brand colors - clean, trustworthy blue
  brand: {
    DEFAULT: cssVar('--color-brand', themePalettes.light.brand.DEFAULT),
    foreground: cssVar('--color-brand-foreground', themePalettes.light.brand.foreground),
    hover: cssVar('--color-brand-hover', themePalettes.light.brand.hover),
    muted: cssVar('--color-brand-muted', themePalettes.light.brand.muted),
  },
  
  // Surface colors - clean, minimal backgrounds
  surface: {
    canvas: cssVar('--color-surface-canvas', themePalettes.light.surface.canvas),
    DEFAULT: cssVar('--color-surface', themePalettes.light.surface.DEFAULT),
    muted: cssVar('--color-surface-muted', themePalettes.light.surface.muted),
    elevated: cssVar('--color-surface-elevated', themePalettes.light.surface.elevated),
    inverse: cssVar('--color-surface-inverse', themePalettes.light.surface.inverse),
  },
  
  // Text colors - clear hierarchy
  text: {
    DEFAULT: cssVar('--color-text', themePalettes.light.text.DEFAULT),
    muted: cssVar('--color-text-muted', themePalettes.light.text.muted),
    subtle: cssVar('--color-text-subtle', themePalettes.light.text.subtle),
    inverse: cssVar('--color-text-inverse', themePalettes.light.text.inverse),
  },
  
  // Semantic colors
  success: {
    DEFAULT: cssVar('--color-success', themePalettes.light.success.DEFAULT),
    foreground: cssVar('--color-success-foreground', themePalettes.light.success.foreground),
    muted: cssVar('--color-success-muted', themePalettes.light.success.muted),
  },
  
  warning: {
    DEFAULT: cssVar('--color-warning', themePalettes.light.warning.DEFAULT),
    foreground: cssVar('--color-warning-foreground', themePalettes.light.warning.foreground),
    muted: cssVar('--color-warning-muted', themePalettes.light.warning.muted),
  },
  
  danger: {
    DEFAULT: cssVar('--color-danger', themePalettes.light.danger.DEFAULT),
    foreground: cssVar('--color-danger-foreground', themePalettes.light.danger.foreground),
    muted: cssVar('--color-danger-muted', themePalettes.light.danger.muted),
  },
  
  // Error colors (alias for danger)
  error: {
    DEFAULT: cssVar('--color-error', themePalettes.light.error.DEFAULT),
    foreground: cssVar('--color-error-foreground', themePalettes.light.error.foreground),
    muted: cssVar('--color-error-muted', themePalettes.light.error.muted),
  },
  
  // Border colors - subtle, minimal
  border: {
    DEFAULT: cssVar('--color-border', themePalettes.light.border.DEFAULT),
    muted: cssVar('--color-border-muted', themePalettes.light.border.muted),
    strong: cssVar('--color-border-strong', themePalettes.light.border.strong),
    focus: cssVar('--color-border-focus', themePalettes.light.border.focus),
  },

  overlay: {
    DEFAULT: cssVar('--color-overlay', themePalettes.light.overlay.DEFAULT),
    muted: cssVar('--color-overlay-muted', themePalettes.light.overlay.muted),
  },
  
  // Chart colors - harmonious palette
  chart: {
    primary: cssVar('--color-chart-primary', themePalettes.light.chart.primary),
    secondary: cssVar('--color-chart-secondary', themePalettes.light.chart.secondary),
    tertiary: cssVar('--color-chart-tertiary', themePalettes.light.chart.tertiary),
    quaternary: cssVar('--color-chart-quaternary', themePalettes.light.chart.quaternary),
    quinary: cssVar('--color-chart-quinary', themePalettes.light.chart.quinary),
    income: cssVar('--color-chart-income', themePalettes.light.chart.income),
    expenses: cssVar('--color-chart-expenses', themePalettes.light.chart.expenses),
    taxes: cssVar('--color-chart-taxes', themePalettes.light.chart.taxes),
    profit: cssVar('--color-chart-profit', themePalettes.light.chart.profit),
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

// String values for web/CSS (Tailwind compatibility)
export const spacing = {
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  7: '28px',
  8: '32px',
  9: '36px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

// Numeric values for React Native
export const spacingNum = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

// String values for web/CSS
export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
} as const;

// Numeric values for React Native
export const radiusNum = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

// ============================================================================
// SHADOWS
// ============================================================================

export const shadow = {
  card: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  popover: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  elevated: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  none: 'none',
} as const;

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    mono: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
  },
  
  // Font sizes with line heights
  fontSize: {
    // Display sizes (page titles, hero numbers)
    display: {
      sm: { size: '32px', lineHeight: '1.2' },
      md: { size: '36px', lineHeight: '1.2' },
      lg: { size: '48px', lineHeight: '1.2' },
    },
    
    // Headings
    h1: { size: '28px', lineHeight: '1.35' },
    h2: { size: '22px', lineHeight: '1.35' },
    h3: { size: '18px', lineHeight: '1.35' },
    
    // Body text
    body: { size: '16px', lineHeight: '1.55' },
    subtle: { size: '14px', lineHeight: '1.55' },
    caption: { size: '12px', lineHeight: '1.5' },
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// ============================================================================
// TRANSITIONS
// ============================================================================

export const transition = {
  fast: '120ms ease-out',
  base: '180ms ease-out',
  slow: '300ms ease-out',
} as const;

// ============================================================================
// LAYOUT
// ============================================================================

export const layout = {
  // Container max widths
  container: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
    max: '1440px', // Our max content width
  },
  
  // Page padding
  pagePadding: {
    mobile: spacing[6], // 24px
    desktop: spacing[8], // 32px
  },
  
  // Section spacing
  sectionGap: {
    mobile: spacing[6], // 24px
    desktop: spacing[8], // 32px
  },
  
  // Card padding
  cardPadding: {
    mobile: spacing[5], // 20px
    desktop: spacing[6], // 24px
  },
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================================================
// Z-INDEX SCALE
// ============================================================================

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  toast: 1700,
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color with opacity
 * @example getColorWithOpacity(colors.brand.DEFAULT, 0.1) => 'rgb(245 158 11 / 0.1)'
 */
export function getColorWithOpacity(color: string, opacity: number): string {
  // Convert hex to rgb
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgb(${r} ${g} ${b} / ${opacity})`;
}

/**
 * Get spacing value
 * @example getSpacing(4) => '16px'
 */
export function getSpacing(scale: keyof typeof spacing): string {
  return spacing[scale];
}

/**
 * Get multiple spacing values
 * @example getSpacingMultiple(4, 6) => '16px 24px'
 */
export function getSpacingMultiple(...scales: (keyof typeof spacing)[]): string {
  return scales.map(s => spacing[s]).join(' ');
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type ColorToken = typeof colors;
export type SpacingToken = typeof spacing;
export type RadiusToken = typeof radius;
export type ShadowToken = typeof shadow;
export type TypographyToken = typeof typography;
export type TransitionToken = typeof transition;
export type LayoutToken = typeof layout;
export type BreakpointToken = typeof breakpoints;
export type ZIndexToken = typeof zIndex;
