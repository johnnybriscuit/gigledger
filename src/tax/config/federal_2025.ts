/**
 * Tax Year 2025 Federal Income Tax Parameters
 * 
 * Official IRS 2025 inflation-adjusted values for:
 * - Standard deductions
 * - Additional standard deductions (age 65+/blind)
 * - Ordinary income tax brackets
 * 
 * SOURCES:
 * 1. IRS Revenue Procedure 2024-40 (November 2024)
 *    https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
 *    Sections: 3.01-3.08 (Standard Deduction, Tax Rate Schedules)
 * 
 * 2. IRS Form 1040 Instructions (Tax Year 2025) - Expected December 2024
 *    https://www.irs.gov/forms-pubs/about-form-1040
 *    Tax Rate Schedules (Schedule X, Y-1, Z)
 * 
 * 3. IRS Publication 501 (2025) - Dependents, Standard Deduction
 *    https://www.irs.gov/publications/p501
 * 
 * CHANGELOG:
 * - 2024-11-03: Initial sync from IRS Revenue Procedure 2024-40
 * - Values are official 2025 inflation-adjusted amounts
 * 
 * NOTE: These are the official 2025 values as published by the IRS.
 * For 2026 and beyond, create a new file (federal_2026.ts) and update
 * the engine to use the appropriate year's constants.
 */

// ============================================================================
// TYPES
// ============================================================================

export type FilingStatus = 'single' | 'married_joint' | 'head';

/**
 * Tax bracket definition
 * - upTo: Upper limit of income for this bracket (null = top bracket, no limit)
 * - rate: Marginal tax rate as decimal (e.g., 0.10 = 10%)
 */
export interface Bracket {
  upTo: number | null;
  rate: number;
}

/**
 * Complete federal tax configuration for a tax year
 */
export interface FederalConfig2025 {
  /** Standard deduction amounts by filing status */
  standardDeduction: Record<FilingStatus, number>;
  
  /** Additional standard deduction for age 65+ or blind */
  additionalStandardDeduction: {
    /** Per eligible spouse (married filing jointly) */
    marriedJointPerEligible: number;
    /** Per eligible person (single or head of household) */
    unmarriedPerEligible: number;
  };
  
  /** Tax brackets by filing status (in ascending order) */
  brackets: Record<FilingStatus, Bracket[]>;
  
  /** Version identifier for these constants */
  constantsVersion: string;
  
  /** IRS document sources used */
  sources: string[];
  
  /** Additional notes or caveats */
  notes?: string;
}

// ============================================================================
// 2025 FEDERAL TAX CONSTANTS
// ============================================================================

/**
 * Official IRS 2025 Federal Income Tax Parameters
 * 
 * All values from IRS Revenue Procedure 2024-40 and Form 1040 Instructions.
 * These are inflation-adjusted amounts for tax year 2025.
 */
export const FEDERAL_2025: FederalConfig2025 = {
  // --------------------------------------------------------------------------
  // STANDARD DEDUCTION (Rev. Proc. 2024-40, Section 3.01)
  // --------------------------------------------------------------------------
  standardDeduction: {
    single: 15000,              // $15,000 for Single filers
    married_joint: 30000,       // $30,000 for Married Filing Jointly
    head: 22500,                // $22,500 for Head of Household
  },

  // --------------------------------------------------------------------------
  // ADDITIONAL STANDARD DEDUCTION (Rev. Proc. 2024-40, Section 3.02)
  // For taxpayers who are 65+ or blind
  // --------------------------------------------------------------------------
  additionalStandardDeduction: {
    marriedJointPerEligible: 1600,  // $1,600 per eligible spouse (MFJ)
    unmarriedPerEligible: 2000,     // $2,000 per eligible person (Single/HOH)
  },

  // --------------------------------------------------------------------------
  // TAX RATE SCHEDULES (Rev. Proc. 2024-40, Sections 3.05-3.07)
  // Ordinary income brackets for 2025
  // --------------------------------------------------------------------------
  
  /**
   * SINGLE FILERS (Schedule X)
   * Rev. Proc. 2024-40, Section 3.05
   */
  brackets: {
    single: [
      { upTo: 11925, rate: 0.10 },      // 10% on income up to $11,925
      { upTo: 48475, rate: 0.12 },      // 12% on income $11,925 - $48,475
      { upTo: 103350, rate: 0.22 },     // 22% on income $48,475 - $103,350
      { upTo: 197300, rate: 0.24 },     // 24% on income $103,350 - $197,300
      { upTo: 250525, rate: 0.32 },     // 32% on income $197,300 - $250,525
      { upTo: 626350, rate: 0.35 },     // 35% on income $250,525 - $626,350
      { upTo: null, rate: 0.37 },       // 37% on income over $626,350
    ],

    /**
     * MARRIED FILING JOINTLY (Schedule Y-1)
     * Rev. Proc. 2024-40, Section 3.06
     */
    married_joint: [
      { upTo: 23850, rate: 0.10 },      // 10% on income up to $23,850
      { upTo: 96950, rate: 0.12 },      // 12% on income $23,850 - $96,950
      { upTo: 206700, rate: 0.22 },     // 22% on income $96,950 - $206,700
      { upTo: 394600, rate: 0.24 },     // 24% on income $206,700 - $394,600
      { upTo: 501050, rate: 0.32 },     // 32% on income $394,600 - $501,050
      { upTo: 751600, rate: 0.35 },     // 35% on income $501,050 - $751,600
      { upTo: null, rate: 0.37 },       // 37% on income over $751,600
    ],

    /**
     * HEAD OF HOUSEHOLD (Schedule Z)
     * Rev. Proc. 2024-40, Section 3.07
     */
    head: [
      { upTo: 17000, rate: 0.10 },      // 10% on income up to $17,000
      { upTo: 64850, rate: 0.12 },      // 12% on income $17,000 - $64,850
      { upTo: 103350, rate: 0.22 },     // 22% on income $64,850 - $103,350
      { upTo: 197300, rate: 0.24 },     // 24% on income $103,350 - $197,300
      { upTo: 250500, rate: 0.32 },     // 32% on income $197,300 - $250,500
      { upTo: 626350, rate: 0.35 },     // 35% on income $250,500 - $626,350
      { upTo: null, rate: 0.37 },       // 37% on income over $626,350
    ],
  },

  // --------------------------------------------------------------------------
  // METADATA
  // --------------------------------------------------------------------------
  constantsVersion: '2025.IRS.v1',
  
  sources: [
    'https://www.irs.gov/pub/irs-drop/rp-24-40.pdf',
    'https://www.irs.gov/forms-pubs/about-form-1040',
    'https://www.irs.gov/publications/p501',
  ],
  
  notes: 'Official 2025 inflation-adjusted values from IRS Revenue Procedure 2024-40. ' +
         'Standard deductions and brackets are indexed for inflation annually. ' +
         'Additional standard deduction applies per eligible person (age 65+ or blind).',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get federal tax configuration for a specific year
 * Currently only supports 2025; extend for future years
 */
export function getFederalConfig(year: number): FederalConfig2025 {
  if (year === 2025) {
    return FEDERAL_2025;
  }
  throw new Error(`Federal tax config not available for year ${year}. Only 2025 is currently supported.`);
}

/**
 * Print federal tax parameters for manual verification
 * Useful for debugging and confirming values match IRS publications
 */
export function printFederalPreview(year: number, filingStatus: FilingStatus): void {
  const config = getFederalConfig(year);
  
  console.log(`\n=== Federal Tax Parameters ${year} (${filingStatus}) ===`);
  console.log(`Version: ${config.constantsVersion}`);
  console.log(`\nStandard Deduction: $${config.standardDeduction[filingStatus].toLocaleString()}`);
  
  console.log(`\nAdditional Standard Deduction:`);
  if (filingStatus === 'married_joint') {
    console.log(`  Per eligible spouse: $${config.additionalStandardDeduction.marriedJointPerEligible.toLocaleString()}`);
  } else {
    console.log(`  Per eligible person: $${config.additionalStandardDeduction.unmarriedPerEligible.toLocaleString()}`);
  }
  
  console.log(`\nTax Brackets:`);
  config.brackets[filingStatus].forEach((bracket, i) => {
    const upToStr = bracket.upTo === null ? 'and above' : `to $${bracket.upTo.toLocaleString()}`;
    const rateStr = `${(bracket.rate * 100).toFixed(0)}%`;
    console.log(`  ${i + 1}. ${rateStr.padStart(4)} - ${upToStr}`);
  });
  
  console.log(`\nSources:`);
  config.sources.forEach(source => console.log(`  - ${source}`));
  console.log('');
}

/**
 * Validate that federal config has required IRS sources
 * Used in CI health checks
 */
export function validateFederalConfig(config: FederalConfig2025): boolean {
  if (!config.sources || config.sources.length === 0) {
    console.error('ERROR: Federal config missing sources');
    return false;
  }
  
  const hasIRSSource = config.sources.some(source => source.includes('irs.gov'));
  if (!hasIRSSource) {
    console.error('ERROR: Federal config missing irs.gov source');
    return false;
  }
  
  // Validate all brackets end with null (top bracket)
  for (const status of ['single', 'married_joint', 'head'] as FilingStatus[]) {
    const brackets = config.brackets[status];
    if (brackets.length === 0 || brackets[brackets.length - 1].upTo !== null) {
      console.error(`ERROR: Brackets for ${status} must end with null (top bracket)`);
      return false;
    }
  }
  
  return true;
}

// Run validation on module load (will throw in tests if invalid)
if (!validateFederalConfig(FEDERAL_2025)) {
  throw new Error('Invalid federal_2025 configuration');
}
