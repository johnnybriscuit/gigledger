/**
 * 2025 Tax Engine
 * 
 * Pure functions for calculating federal, state, and SE taxes.
 * All calculations are based on the 2025 tax configuration.
 */

import config2025, { type FilingStatus, type Bracket, type StateCode, type JurisdictionConfig } from './config/2025';

// ============================================================================
// TYPES
// ============================================================================

export interface TaxProfile {
  filingStatus: FilingStatus;
  state: StateCode;
  county?: string;          // MD only
  nycResident?: boolean;    // NY only
  yonkersResident?: boolean; // NY only
  deductionMethod: 'standard' | 'itemized';
  itemizedAmount?: number;
  seIncome: boolean;        // Has self-employment income
}

export interface YTDData {
  grossIncome: number;      // Total gross income
  adjustments: number;      // Above-the-line deductions
  netSE: number;            // Net self-employment income (Schedule C)
  w2Wages?: number;         // W-2 wages (if any)
}

export interface GigData {
  gross: number;
  expenses: number;
  // net = gross - expenses (this is what gets added to YTD)
}

export interface TaxResult {
  federal: number;
  state: number;
  local: number;           // NYC, MD county, etc.
  seTax: number;
  total: number;
  effectiveRate: number;   // total / gross income
}

export interface SetAsideResult {
  amount: number;          // Dollar amount to set aside
  rate: number;            // As percentage of gig net
  breakdown: {
    federal: number;
    state: number;
    local: number;
    seTax: number;
  };
}

// ============================================================================
// CORE TAX CALCULATIONS
// ============================================================================

/**
 * Calculate taxable income
 */
export function calcTaxableIncome(
  grossIncome: number,
  adjustments: number,
  deduction: number
): number {
  return Math.max(0, grossIncome - adjustments - deduction);
}

/**
 * Calculate tax using progressive brackets
 */
export function calcBracketTax(amount: number, brackets: Bracket[]): number {
  let tax = 0;
  let previousLimit = 0;

  for (const bracket of brackets) {
    const limit = bracket.upTo ?? Infinity;
    const taxableInThisBracket = Math.min(amount, limit) - previousLimit;
    
    if (taxableInThisBracket <= 0) break;
    
    tax += taxableInThisBracket * bracket.rate;
    previousLimit = limit;
    
    if (amount <= limit) break;
  }

  return tax;
}

/**
 * Get deduction amount based on profile
 */
export function getDeduction(
  profile: TaxProfile,
  jurisdiction: JurisdictionConfig
): number {
  if (profile.deductionMethod === 'itemized' && profile.itemizedAmount) {
    return profile.itemizedAmount;
  }
  return jurisdiction.standardDeduction[profile.filingStatus];
}

// ============================================================================
// FEDERAL TAX
// ============================================================================

/**
 * Calculate federal income tax
 */
export function calcFederalTax(
  ytd: YTDData,
  profile: TaxProfile
): number {
  const deduction = getDeduction(profile, config2025.federal);
  const taxableIncome = calcTaxableIncome(ytd.grossIncome, ytd.adjustments, deduction);
  
  return calcBracketTax(taxableIncome, config2025.federal.brackets[profile.filingStatus]);
}

// ============================================================================
// STATE TAX
// ============================================================================

/**
 * Calculate state income tax with state-specific logic
 */
export function calcStateTax(
  ytd: YTDData,
  profile: TaxProfile
): { state: number; local: number } {
  const stateConfig = config2025.states[profile.state];
  
  // TN and TX have no state income tax
  if (profile.state === 'TN' || profile.state === 'TX') {
    return { state: 0, local: 0 };
  }

  const deduction = getDeduction(profile, stateConfig);
  const taxableIncome = calcTaxableIncome(ytd.grossIncome, ytd.adjustments, deduction);
  
  let stateTax = calcBracketTax(taxableIncome, stateConfig.brackets[profile.filingStatus]);
  let localTax = 0;

  // State-specific additions
  switch (profile.state) {
    case 'CA':
      // California Mental Health Services Tax (1% over $1M)
      if (stateConfig.local?.millionaireSurtax && taxableIncome > stateConfig.local.millionaireSurtax.threshold) {
        const excessIncome = taxableIncome - stateConfig.local.millionaireSurtax.threshold;
        stateTax += excessIncome * stateConfig.local.millionaireSurtax.extraRate;
      }
      break;

    case 'NY':
      // NYC resident tax
      if (profile.nycResident && stateConfig.local?.nycResidentRates) {
        const nycTaxableIncome = taxableIncome; // NYC uses same taxable income as NYS
        localTax = calcBracketTax(nycTaxableIncome, stateConfig.local.nycResidentRates[profile.filingStatus]);
      }
      
      // Yonkers surcharge (% of NYS tax)
      if (profile.yonkersResident && stateConfig.local?.yonkersSurcharge) {
        localTax += stateTax * stateConfig.local.yonkersSurcharge;
      }
      break;

    case 'MD':
      // Maryland county tax (flat % of MD taxable income)
      if (profile.county && stateConfig.local?.mdCountyRates) {
        const countyRate = stateConfig.local.mdCountyRates[profile.county];
        if (countyRate) {
          localTax = taxableIncome * countyRate;
        }
      }
      break;
  }

  return { state: stateTax, local: localTax };
}

// ============================================================================
// SELF-EMPLOYMENT TAX
// ============================================================================

/**
 * Calculate self-employment tax
 * 
 * SE tax = Social Security + Medicare + Additional Medicare
 * - Social Security: 12.4% on first $X of SE income (92.35% of net)
 * - Medicare: 2.9% on all SE income (92.35% of net)
 * - Additional Medicare: 0.9% on SE income over threshold
 */
export function calcSETax(
  ytd: YTDData,
  profile: TaxProfile
): number {
  if (!profile.seIncome || ytd.netSE <= 0) {
    return 0;
  }

  const { seTax } = config2025;
  
  // SE tax base is 92.35% of net SE income
  const seTaxBase = ytd.netSE * 0.9235;
  
  // Social Security tax (capped at wage base)
  const ssWages = Math.min(seTaxBase, seTax.socialSecurityWageBase);
  const socialSecurityTax = ssWages * seTax.socialSecurityRate;
  
  // Medicare tax (no cap)
  const medicareTax = seTaxBase * seTax.medicareRate;
  
  // Additional Medicare tax (0.9% over threshold)
  const additionalMedicareThreshold = seTax.additionalMedicareThreshold[profile.filingStatus];
  const additionalMedicareTax = Math.max(0, seTaxBase - additionalMedicareThreshold) * 0.009;
  
  return socialSecurityTax + medicareTax + additionalMedicareTax;
}

// ============================================================================
// TOTAL TAX CALCULATION
// ============================================================================

/**
 * Calculate total tax liability
 */
export function calcTotalTax(
  ytd: YTDData,
  profile: TaxProfile
): TaxResult {
  const federal = calcFederalTax(ytd, profile);
  const { state, local } = calcStateTax(ytd, profile);
  const seTax = calcSETax(ytd, profile);
  
  const total = federal + state + local + seTax;
  const effectiveRate = ytd.grossIncome > 0 ? total / ytd.grossIncome : 0;
  
  return {
    federal,
    state,
    local,
    seTax,
    total,
    effectiveRate,
  };
}

// ============================================================================
// GIG SET-ASIDE CALCULATION
// ============================================================================

/**
 * Add a gig to YTD data
 */
function addGig(ytd: YTDData, gig: GigData): YTDData {
  const gigNet = gig.gross - gig.expenses;
  
  return {
    ...ytd,
    grossIncome: ytd.grossIncome + gig.gross,
    netSE: ytd.netSE + gigNet,
  };
}

/**
 * Calculate marginal tax effect of a gig
 * 
 * This is the key function for "Set Aside for this Gig"
 * It computes how much additional tax the gig creates
 */
export function taxDeltaForGig(
  ytd: YTDData,
  gig: GigData,
  profile: TaxProfile
): SetAsideResult {
  const gigNet = gig.gross - gig.expenses;
  
  // Edge case: no net income from gig
  if (gigNet <= 0) {
    return {
      amount: 0,
      rate: 0,
      breakdown: { federal: 0, state: 0, local: 0, seTax: 0 },
    };
  }
  
  // Calculate tax before and after adding this gig
  const before = calcTotalTax(ytd, profile);
  const after = calcTotalTax(addGig(ytd, gig), profile);
  
  // Marginal tax increase
  const delta = {
    federal: after.federal - before.federal,
    state: after.state - before.state,
    local: after.local - before.local,
    seTax: after.seTax - before.seTax,
  };
  
  const totalDelta = delta.federal + delta.state + delta.local + delta.seTax;
  const rate = totalDelta / gigNet;
  
  return {
    amount: totalDelta,
    rate,
    breakdown: delta,
  };
}

// ============================================================================
// YTD EFFECTIVE RATE
// ============================================================================

/**
 * Calculate YTD effective tax rate
 * 
 * This is for the dashboard "YTD Effective Tax Rate" card
 */
export function calcYTDEffectiveRate(
  ytd: YTDData,
  profile: TaxProfile
): {
  effectiveRate: number;
  totalTax: number;
  breakdown: {
    federal: number;
    state: number;
    local: number;
    seTax: number;
  };
} {
  const result = calcTotalTax(ytd, profile);
  
  return {
    effectiveRate: result.effectiveRate,
    totalTax: result.total,
    breakdown: {
      federal: result.federal,
      state: result.state,
      local: result.local,
      seTax: result.seTax,
    },
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format tax amount as currency
 */
export function formatTaxAmount(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tax rate as percentage
 */
export function formatTaxRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Get state name from code
 */
export function getStateName(code: StateCode): string {
  const names: Record<StateCode, string> = {
    TN: 'Tennessee',
    TX: 'Texas',
    CA: 'California',
    NY: 'New York',
    MD: 'Maryland',
  };
  return names[code];
}

/**
 * Check if state has income tax
 */
export function stateHasIncomeTax(state: StateCode): boolean {
  return state !== 'TN' && state !== 'TX';
}

/**
 * Check if state needs county selection
 */
export function stateNeedsCounty(state: StateCode): boolean {
  return state === 'MD';
}

/**
 * Check if state has local tax options
 */
export function stateHasLocalTax(state: StateCode): boolean {
  return state === 'NY' || state === 'MD';
}

/**
 * Get available counties for Maryland
 */
export function getMDCounties(): string[] {
  const mdConfig = config2025.states.MD;
  if (!mdConfig.local?.mdCountyRates) return [];
  return Object.keys(mdConfig.local.mdCountyRates).sort();
}
