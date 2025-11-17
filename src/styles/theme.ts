/**
 * GigLedger Design Tokens
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

// ============================================================================
// COLORS
// ============================================================================

export const colors = {
  // Brand colors - clean, trustworthy blue
  brand: {
    DEFAULT: '#3b82f6', // blue-500
    foreground: '#ffffff',
    hover: '#2563eb', // blue-600
    muted: '#dbeafe', // blue-100
  },
  
  // Surface colors - clean, minimal backgrounds
  surface: {
    DEFAULT: '#ffffff',
    muted: '#f9fafb', // gray-50
    elevated: '#ffffff',
  },
  
  // Text colors - clear hierarchy
  text: {
    DEFAULT: '#111827', // gray-900
    muted: '#6b7280', // gray-500
    subtle: '#9ca3af', // gray-400
  },
  
  // Semantic colors
  success: {
    DEFAULT: '#10b981', // emerald-500
    foreground: '#ffffff',
    muted: '#d1fae5', // emerald-100
  },
  
  warning: {
    DEFAULT: '#f59e0b', // amber-500
    foreground: '#ffffff',
    muted: '#fef3c7', // amber-100
  },
  
  danger: {
    DEFAULT: '#ef4444', // red-500
    foreground: '#ffffff',
    muted: '#fee2e2', // red-100
  },
  
  // Border colors - subtle, minimal
  border: {
    DEFAULT: '#e5e7eb', // gray-200
    muted: '#f3f4f6', // gray-100
    focus: '#f59e0b', // brand
  },
  
  // Chart colors - harmonious palette
  chart: {
    primary: '#f59e0b', // amber-500
    secondary: '#3b82f6', // blue-500
    tertiary: '#10b981', // emerald-500
    quaternary: '#8b5cf6', // violet-500
    quinary: '#ec4899', // pink-500
  },
} as const;

// ============================================================================
// SPACING
// ============================================================================

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

// ============================================================================
// BORDER RADIUS
// ============================================================================

export const radius = {
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '24px',
  full: '9999px',
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
