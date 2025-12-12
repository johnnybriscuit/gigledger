/**
 * Centralized gig tax calculation logic
 * Used by both gig cards and the Edit Gig form to ensure consistency
 */

import type { BusinessStructure } from '../hooks/useProfile';
import type { PlanId } from '../lib/businessStructure';
import { isSCalcEligibleForBusinessStructure } from '../lib/businessStructure';

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

export type BusinessStructureGigTaxInput = {
  gross: number;
  expensesTotal: number;
  business_structure: BusinessStructure;
  plan: PlanId;
  taxBreakdown?: {
    federal: number;
    state: number;
    local?: number;
    seTax: number;
    total: number;
  };
};

export type GigTaxSummaryWithMode = GigTaxSummary & {
  mode: 'self_employment' | 'no_se_tax';
  business_structure: BusinessStructure;
};

/**
 * Calculate comprehensive tax summary for a gig
 * This is the single source of truth for gig money calculations
 */
export function calculateGigTaxSummary(input: GigTaxInput): GigTaxSummary;
export function calculateGigTaxSummary(input: BusinessStructureGigTaxInput): GigTaxSummaryWithMode;
export function calculateGigTaxSummary(
  input: GigTaxInput | BusinessStructureGigTaxInput
): GigTaxSummary | GigTaxSummaryWithMode {
  // Legacy signature: derive gross/expenses from gig line items
  if ('grossAmount' in input) {
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

  const eligibility = isSCalcEligibleForBusinessStructure(input.business_structure, input.plan);
  const gross = input.gross;
  const expensesTotal = input.expensesTotal;
  const netBeforeTax = gross - expensesTotal;

  if (!eligibility.usesSelfEmploymentTax) {
    return {
      gross,
      expensesTotal,
      netBeforeTax,
      taxToSetAside: 0,
      takeHome: netBeforeTax,
      federal: 0,
      state: 0,
      seTax: 0,
      effectiveRate: 0,
      mode: 'no_se_tax',
      business_structure: input.business_structure,
    };
  }

  const breakdown = input.taxBreakdown;
  const federal = breakdown?.federal ?? 0;
  const state = (breakdown?.state ?? 0) + (breakdown?.local ?? 0);
  const seTax = breakdown?.seTax ?? 0;
  const taxToSetAside = breakdown?.total ?? 0;
  const takeHome = netBeforeTax - taxToSetAside;
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
    mode: 'self_employment',
    business_structure: input.business_structure,
  };
}
