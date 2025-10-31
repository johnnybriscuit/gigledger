/**
 * Tax withholding calculation engine
 * 
 * Calculates recommended tax withholding for self-employed/1099 workers
 * based on federal, self-employment, and state tax obligations.
 */

import {
  SE_TAX_RATE_COMBINED,
  SE_TAX_RATE_SOCIAL_SECURITY,
  SE_TAX_RATE_MEDICARE,
  SE_TAX_DEDUCTION_MULTIPLIER,
  SS_WAGE_BASE_2025,
  getFederalFlatRate,
  CURRENT_TAX_YEAR,
} from './constants';

export type FilingStatus = 'single' | 'married' | 'hoh';

export interface WithholdingInput {
  amount: number; // gross gig amount
  stateCode: string; // e.g., 'TN', 'CA'
  filingStatus: FilingStatus;
  ytdNetIncome?: number; // optional, for bracket calc and SS cap
  year?: number; // default current year
}

export interface WithholdingBreakdown {
  federalIncome: number;
  selfEmployment: number;
  stateIncome: number;
  total: number;
}

export interface StateRate {
  state_code: string;
  effective_year: number;
  type: 'flat' | 'bracket';
  flat_rate: number | null;
  brackets: Array<{ upTo: number | null; rate: number }> | null;
  notes: string | null;
}

/**
 * Calculate self-employment tax
 * 
 * SE tax = (net earnings * 0.9235) * 15.3%
 * But Social Security portion only applies up to wage base
 * 
 * TODO: Implement Additional Medicare Tax (0.9% over threshold)
 */
function calculateSelfEmploymentTax(
  amount: number,
  ytdNetIncome: number = 0
): number {
  // SE tax is on 92.35% of net earnings
  const seEarnings = amount * SE_TAX_DEDUCTION_MULTIPLIER;
  const totalYtdEarnings = (ytdNetIncome + amount) * SE_TAX_DEDUCTION_MULTIPLIER;
  
  // Check if we're over the Social Security wage base
  if (ytdNetIncome >= SS_WAGE_BASE_2025) {
    // Already over SS cap, only Medicare applies
    return seEarnings * SE_TAX_RATE_MEDICARE;
  } else if (totalYtdEarnings > SS_WAGE_BASE_2025) {
    // This gig pushes us over the cap
    const amountUnderCap = SS_WAGE_BASE_2025 - (ytdNetIncome * SE_TAX_DEDUCTION_MULTIPLIER);
    const amountOverCap = seEarnings - amountUnderCap;
    
    // SS tax on amount under cap + Medicare on full amount
    const ssTax = amountUnderCap * SE_TAX_RATE_SOCIAL_SECURITY;
    const medicareTax = seEarnings * SE_TAX_RATE_MEDICARE;
    
    return ssTax + medicareTax;
  } else {
    // Under cap, full SE tax applies
    return seEarnings * SE_TAX_RATE_COMBINED;
  }
}

/**
 * Calculate federal income tax (MVP: flat rate)
 * 
 * TODO: Implement bracket-based calculation when USE_FEDERAL_BRACKETS is true
 * TODO: Account for standard deduction
 */
function calculateFederalIncomeTax(
  amount: number,
  filingStatus: FilingStatus,
  _ytdNetIncome: number = 0
): number {
  // MVP: Use flat conservative rate
  const rate = getFederalFlatRate(filingStatus);
  return amount * rate;
}

/**
 * Calculate state income tax
 * 
 * Supports both flat and bracket-based state taxes
 */
function calculateStateIncomeTax(
  amount: number,
  stateRate: StateRate | null,
  ytdNetIncome: number = 0
): number {
  if (!stateRate) {
    // No rate data, assume 0
    return 0;
  }
  
  if (stateRate.type === 'flat') {
    // Flat rate state
    return amount * (stateRate.flat_rate || 0);
  } else if (stateRate.type === 'bracket' && stateRate.brackets) {
    // Progressive bracket state
    return calculateBracketTax(amount, stateRate.brackets, ytdNetIncome);
  }
  
  return 0;
}

/**
 * Calculate tax using progressive brackets
 * 
 * @param amount - Income for this gig
 * @param brackets - Tax brackets [{upTo: number|null, rate: number}]
 * @param ytdNetIncome - Year-to-date income (optional, for accurate bracket placement)
 */
function calculateBracketTax(
  amount: number,
  brackets: Array<{ upTo: number | null; rate: number }>,
  ytdNetIncome: number = 0
): number {
  // Sort brackets by upTo (nulls last)
  const sortedBrackets = [...brackets].sort((a, b) => {
    if (a.upTo === null) return 1;
    if (b.upTo === null) return -1;
    return a.upTo - b.upTo;
  });
  
  let tax = 0;
  let remainingIncome = amount;
  let currentIncome = ytdNetIncome;
  
  for (const bracket of sortedBrackets) {
    if (remainingIncome <= 0) break;
    
    const bracketTop = bracket.upTo || Infinity;
    
    // How much room is left in this bracket?
    const roomInBracket = Math.max(0, bracketTop - currentIncome);
    
    if (roomInBracket > 0) {
      // Some or all of remaining income fits in this bracket
      const taxableInBracket = Math.min(remainingIncome, roomInBracket);
      tax += taxableInBracket * bracket.rate;
      remainingIncome -= taxableInBracket;
      currentIncome += taxableInBracket;
    }
  }
  
  return tax;
}

/**
 * Calculate recommended tax withholding for a gig
 * 
 * @param input - Withholding calculation parameters
 * @param stateRate - State tax rate data (fetch from DB)
 * @returns Breakdown of federal, SE, and state taxes
 */
export function calculateWithholding(
  input: WithholdingInput,
  stateRate: StateRate | null = null
): WithholdingBreakdown {
  const { amount, filingStatus, ytdNetIncome = 0 } = input;
  
  // Calculate each component
  const selfEmployment = calculateSelfEmploymentTax(amount, ytdNetIncome);
  const federalIncome = calculateFederalIncomeTax(amount, filingStatus, ytdNetIncome);
  const stateIncome = calculateStateIncomeTax(amount, stateRate, ytdNetIncome);
  
  const total = selfEmployment + federalIncome + stateIncome;
  
  return {
    federalIncome,
    selfEmployment,
    stateIncome,
    total,
  };
}

/**
 * Calculate withholding as a percentage of gross income
 */
export function calculateWithholdingRate(
  input: WithholdingInput,
  stateRate: StateRate | null = null
): number {
  if (input.amount === 0) return 0;
  
  const breakdown = calculateWithholding(input, stateRate);
  return breakdown.total / input.amount;
}

/**
 * Format withholding breakdown for display
 */
export function formatWithholdingBreakdown(breakdown: WithholdingBreakdown): {
  federalIncome: string;
  selfEmployment: string;
  stateIncome: string;
  total: string;
} {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return {
    federalIncome: formatter.format(breakdown.federalIncome),
    selfEmployment: formatter.format(breakdown.selfEmployment),
    stateIncome: formatter.format(breakdown.stateIncome),
    total: formatter.format(breakdown.total),
  };
}
