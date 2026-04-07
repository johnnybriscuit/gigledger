/**
 * Tax calculation constants
 *
 * Tax withholding in this module is for planning and cash-reserve guidance only.
 * Do not present these values as filing-ready tax calculations unless the
 * relevant jurisdiction data has been independently verified.
 */

// Self-employment tax components
export const SE_TAX_RATE_SOCIAL_SECURITY = 0.124; // 12.4% Social Security
export const SE_TAX_RATE_MEDICARE = 0.029; // 2.9% Medicare
export const SE_TAX_RATE_COMBINED = SE_TAX_RATE_SOCIAL_SECURITY + SE_TAX_RATE_MEDICARE; // 15.3%

// Planning estimate for the 2025 Social Security wage base used in reserve calculations.
export const SS_WAGE_BASE_2025 = 168600;

// Additional Medicare Tax (not implemented in MVP)
// TODO: Implement 0.9% additional Medicare tax on income over threshold
export const ADDITIONAL_MEDICARE_TAX_RATE = 0.009;
export const ADDITIONAL_MEDICARE_THRESHOLD_SINGLE = 200000;
export const ADDITIONAL_MEDICARE_THRESHOLD_MARRIED = 250000;

// Self-employment tax deduction multiplier
// SE tax is calculated on 92.35% of net earnings per IRS
export const SE_TAX_DEDUCTION_MULTIPLIER = 0.9235;

// Federal Income Tax - flat planning estimates.
// These are conservative reserve defaults, not filing calculations.
export const FEDERAL_FLAT_RATE_SINGLE = parseFloat(
  process.env.EXPO_PUBLIC_FEDERAL_FLAT_RATE_SINGLE || '0.12'
); // 12% conservative estimate
export const FEDERAL_FLAT_RATE_MARRIED = parseFloat(
  process.env.EXPO_PUBLIC_FEDERAL_FLAT_RATE_MARRIED || '0.12'
); // 12% conservative estimate
export const FEDERAL_FLAT_RATE_HOH = parseFloat(
  process.env.EXPO_PUBLIC_FEDERAL_FLAT_RATE_HOH || '0.12'
); // 12% conservative estimate

// Tax year
export const CURRENT_TAX_YEAR = parseInt(
  process.env.EXPO_PUBLIC_TAX_YEAR || new Date().getFullYear().toString(),
  10
);

// Feature flags
export const USE_FEDERAL_BRACKETS = process.env.EXPO_PUBLIC_USE_FEDERAL_BRACKETS === 'true';

/**
 * Get federal flat rate by filing status
 */
export function getFederalFlatRate(filingStatus: 'single' | 'married' | 'hoh'): number {
  switch (filingStatus) {
    case 'single':
      return FEDERAL_FLAT_RATE_SINGLE;
    case 'married':
      return FEDERAL_FLAT_RATE_MARRIED;
    case 'hoh':
      return FEDERAL_FLAT_RATE_HOH;
    default:
      return FEDERAL_FLAT_RATE_SINGLE;
  }
}

/**
 * 2025 federal bracket data used by the verified federal tax engine paths.
 */
export const FEDERAL_BRACKETS_2025 = {
  single: [
    { upTo: 11600, rate: 0.10 },
    { upTo: 47150, rate: 0.12 },
    { upTo: 100525, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243725, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
  married: [
    { upTo: 23200, rate: 0.10 },
    { upTo: 94300, rate: 0.12 },
    { upTo: 201050, rate: 0.22 },
    { upTo: 383900, rate: 0.24 },
    { upTo: 487450, rate: 0.32 },
    { upTo: 731200, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
  hoh: [
    { upTo: 16550, rate: 0.10 },
    { upTo: 63100, rate: 0.12 },
    { upTo: 100500, rate: 0.22 },
    { upTo: 191950, rate: 0.24 },
    { upTo: 243700, rate: 0.32 },
    { upTo: 609350, rate: 0.35 },
    { upTo: null, rate: 0.37 },
  ],
};

// Standard deductions (2025 federal values).
export const STANDARD_DEDUCTION_2025 = {
  single: 14600,
  married: 29200,
  hoh: 21900,
};
