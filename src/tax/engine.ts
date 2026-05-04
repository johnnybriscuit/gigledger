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

export interface SplitTaxResult {
  income1099: number;
  incomeW2: number;
  netIncome1099: number;
  seTax: number;
  federalTax1099: number;
  stateTax1099: number;
  localTax1099: number;
  totalOwed1099: number;
  effectiveRate1099: number;
  w2Note: string;
  setAsideAmount: number;
  setAsidePercent: number;
  quarterlyPaymentEstimate: number;
  hasUnsupportedState: boolean;
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
 * 
 * IMPORTANT: For self-employed individuals, federal income tax is calculated on:
 * 1. Gross Income
 * 2. Minus: Adjustments (including half of SE tax)
 * 3. Minus: Standard Deduction
 * = Taxable Income
 * 
 * The half SE tax deduction is a critical "above-the-line" deduction that
 * reduces AGI before the standard deduction is applied.
 */
export function calcFederalTax(
  ytd: YTDData,
  profile: TaxProfile
): number {
  // Calculate SE tax first to get the half-SE-tax deduction
  const seTax = calcSETax(ytd, profile);
  const halfSETaxDeduction = seTax * 0.5;
  
  // Total adjustments = provided adjustments + half SE tax
  const totalAdjustments = ytd.adjustments + halfSETaxDeduction;
  
  const deduction = getDeduction(profile, config2025.federal);
  const taxableIncome = calcTaxableIncome(ytd.grossIncome, totalAdjustments, deduction);
  
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
 * 
 * CALCULATION ORDER MATTERS:
 * 1. Calculate SE tax first (needed for federal income tax deduction)
 * 2. Calculate federal income tax (uses half SE tax as adjustment)
 * 3. Calculate state/local tax
 * 4. Sum all components
 */
export function calcTotalTax(
  ytd: YTDData,
  profile: TaxProfile
): TaxResult {
  // Calculate in correct order (SE tax first, then federal)
  const seTax = calcSETax(ytd, profile);
  const federal = calcFederalTax(ytd, profile);
  const { state, local } = calcStateTax(ytd, profile);
  
  const total = federal + state + local + seTax;
  const effectiveRate = ytd.grossIncome > 0 ? total / ytd.grossIncome : 0;
  
  // Debug logging (dev mode only)
  if (process.env.NODE_ENV === 'development') {
    console.log('Tax debug:', {
      netProfit: ytd.netSE,
      seTax,
      federalTax: federal,
      stateTax: state,
      localTax: local,
      totalSetAside: total,
      effectiveRate: (effectiveRate * 100).toFixed(2) + '%',
    });
  }
  
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
 * Federal income tax threshold by filing status
 * Below these amounts, we don't recommend setting aside federal income tax
 * (only SE tax applies)
 */
const FEDERAL_TAX_THRESHOLDS: Record<FilingStatus, number> = {
  single: 30000,           // Single filers under $30k typically owe minimal/no federal
  married_joint: 50000,    // Joint filers under $50k typically owe minimal/no federal
  married_separate: 30000, // Same as single
  head: 40000,             // Head of household under $40k typically owe minimal/no federal
};

/**
 * Calculate marginal tax effect of a gig
 * 
 * This is the key function for "Set Aside for this Gig"
 * It computes how much additional tax the gig creates
 * 
 * SMART THRESHOLDS:
 * - If projected annual income < threshold, federal income tax is zeroed out
 * - SE tax always applies (it's a flat rate regardless of income level)
 * - State/local tax rules vary by state
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
  let delta = {
    federal: after.federal - before.federal,
    state: after.state - before.state,
    local: after.local - before.local,
    seTax: after.seTax - before.seTax,
  };
  
  // SMART THRESHOLD: Don't recommend federal tax for low earners
  // Check projected annual income (YTD + this gig)
  const projectedAnnualIncome = ytd.grossIncome + gig.gross;
  const federalThreshold = FEDERAL_TAX_THRESHOLDS[profile.filingStatus];
  
  if (projectedAnnualIncome < federalThreshold) {
    // Zero out federal tax recommendation for low earners
    // They'll still owe SE tax, but likely won't owe federal income tax
    delta = {
      ...delta,
      federal: 0,
    };
  }
  
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
  const names: Partial<Record<StateCode, string>> = {
    TN: 'Tennessee',
    TX: 'Texas',
    CA: 'California',
    NY: 'New York',
    MD: 'Maryland',
  };
  return names[code] ?? code;
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

// ============================================================================
// SPLIT TAX CALCULATION (W-2 + 1099)
// ============================================================================

/**
 * Calculate split tax for mixed W-2 and 1099 income
 * 
 * W-2 income is excluded from calculations because:
 * - No SE tax applies (employer pays FICA)
 * - Withholding already handled by employer
 * - Deductions do NOT apply against W-2 income
 * 
 * Only 1099 income is subject to:
 * - SE tax (15.3% × 92.35%)
 * - Federal income tax at marginal rates
 * - Full Schedule C deductions
 * 
 * @param gigIncome1099 - Total gross income from 1099/contractor payers
 * @param gigIncomeW2 - Total gross income from W-2/employee payers
 * @param totalDeductions - Schedule C deductions (only apply to 1099 income)
 * @param profile - Tax profile with filing status, state, etc.
 * @returns Comprehensive tax breakdown with quarterly payment estimate
 */
export function calculateSplitTax(
  gigIncome1099: number,
  gigIncomeW2: number,
  totalDeductions: number,
  profile: TaxProfile
): SplitTaxResult {
  const SUPPORTED_STATES: StateCode[] = ['CA', 'NY', 'MD', 'TN', 'TX'];
  
  // Determine W-2 note based on income mix
  let w2Note: string;
  
  if (gigIncome1099 <= 0) {
    // All W-2 income, no 1099
    w2Note = "All income is from W-2 employment. Taxes are withheld by your employer — no estimated tax payments needed for this income.";
    
    return {
      income1099: gigIncome1099,
      incomeW2: gigIncomeW2,
      netIncome1099: 0,
      seTax: 0,
      federalTax1099: 0,
      stateTax1099: 0,
      localTax1099: 0,
      totalOwed1099: 0,
      effectiveRate1099: 0,
      w2Note,
      setAsideAmount: 0,
      setAsidePercent: 0,
      quarterlyPaymentEstimate: 0,
      hasUnsupportedState: !SUPPORTED_STATES.includes(profile.state),
    };
  }
  
  if (gigIncomeW2 === 0) {
    w2Note = "No W-2 income recorded. Add a W-2 payer in Contacts if you have employer income.";
  } else {
    w2Note = "W-2 taxes are withheld by your employer. Verify your W-4 withholding is correct — especially if your gig income is significantly higher than last year.";
  }
  
  // Calculate 1099 net income (gross - deductions)
  const netIncome1099 = Math.max(0, gigIncome1099 - totalDeductions);
  
  // Calculate SE tax on 1099 net income only
  // SE tax base = 92.35% of net SE income
  const seTaxBase = netIncome1099 * 0.9235;
  const seTax = seTaxBase * 0.153; // 15.3% (12.4% SS + 2.9% Medicare)
  
  // Half of SE tax is deductible
  const seDeduction = seTax * 0.5;
  
  // Calculate federal taxable income (1099 net - SE deduction)
  const ytdFor1099: YTDData = {
    grossIncome: netIncome1099,
    adjustments: seDeduction,
    netSE: netIncome1099,
    w2Wages: 0, // W-2 excluded from this calculation
  };
  
  // Calculate federal tax on 1099 income
  const federalTax1099 = calcFederalTax(ytdFor1099, profile);
  
  // Calculate state and local tax on 1099 income
  const { state: stateTax1099, local: localTax1099 } = calcStateTax(ytdFor1099, profile);
  
  // Total tax owed on 1099 income
  const totalOwed1099 = seTax + federalTax1099 + stateTax1099 + localTax1099;
  
  // Effective rate on 1099 income
  const effectiveRate1099 = gigIncome1099 > 0 ? totalOwed1099 / gigIncome1099 : 0;
  
  // Set aside amount (rounded to nearest dollar)
  const setAsideAmount = Math.round(totalOwed1099);
  
  // Set aside percent (rounded to 1 decimal place)
  const setAsidePercent = Math.round(effectiveRate1099 * 1000) / 10;
  
  // Calculate quarterly payment estimate
  // Determine remaining quarters in the year
  const currentMonth = new Date().getMonth(); // 0-11
  const currentQuarter = Math.floor(currentMonth / 3) + 1; // 1-4
  const remainingQuarters = 5 - currentQuarter; // Q1=4, Q2=3, Q3=2, Q4=1
  const quarterlyPaymentEstimate = remainingQuarters > 0 
    ? Math.round(setAsideAmount / remainingQuarters)
    : setAsideAmount;
  
  // Check if state is unsupported
  const hasUnsupportedState = stateTax1099 === 0 && !SUPPORTED_STATES.includes(profile.state);
  
  return {
    income1099: gigIncome1099,
    incomeW2: gigIncomeW2,
    netIncome1099,
    seTax,
    federalTax1099,
    stateTax1099,
    localTax1099,
    totalOwed1099,
    effectiveRate1099,
    w2Note,
    setAsideAmount,
    setAsidePercent,
    quarterlyPaymentEstimate,
    hasUnsupportedState,
  };
}
