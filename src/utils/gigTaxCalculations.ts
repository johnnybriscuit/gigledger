/**
 * Centralized gig tax calculation logic
 * Used by both gig cards and the Edit Gig form to ensure consistency
 */

export interface GigTaxSummary {
  gross: number;
  expensesTotal: number;
  netBeforeTax: number;
  taxToSetAside: number;
  takeHome: number;
  federal: number;
  state: number;
  seTax: number;
  effectiveRate: number; // taxToSetAside / netBeforeTax
}

export interface GigTaxInput {
  grossAmount: number;
  tips?: number;
  perDiem?: number;
  otherIncome?: number;
  fees?: number;
  gigExpenses?: number;
  mileageDeduction?: number;
  taxBreakdown: {
    federal: number;
    state: number;
    local?: number;
    seTax: number;
    total: number;
  };
}

/**
 * Calculate comprehensive tax summary for a gig
 * This is the single source of truth for gig money calculations
 */
export function calculateGigTaxSummary(input: GigTaxInput): GigTaxSummary {
  // Calculate gross (all income sources)
  const gross = input.grossAmount 
    + (input.tips || 0) 
    + (input.perDiem || 0) 
    + (input.otherIncome || 0);
  
  // Calculate total expenses (fees + gig expenses + mileage)
  const expensesTotal = (input.fees || 0) 
    + (input.gigExpenses || 0) 
    + (input.mileageDeduction || 0);
  
  // Net before tax
  const netBeforeTax = gross - expensesTotal;
  
  // Tax amounts from breakdown
  const federal = input.taxBreakdown.federal;
  const state = input.taxBreakdown.state + (input.taxBreakdown.local || 0);
  const seTax = input.taxBreakdown.seTax;
  const taxToSetAside = input.taxBreakdown.total;
  
  // Final take-home
  const takeHome = netBeforeTax - taxToSetAside;
  
  // Effective rate
  const effectiveRate = netBeforeTax > 0 ? taxToSetAside / netBeforeTax : 0;
  
  return {
    gross,
    expensesTotal,
    netBeforeTax,
    taxToSetAside,
    takeHome,
    federal,
    state,
    seTax,
    effectiveRate,
  };
}
