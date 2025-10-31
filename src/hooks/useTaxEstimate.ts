/**
 * Tax estimation hook for inline gig calculations
 * Provides simple SE tax, federal, and state estimates
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// IRS mileage rate for 2025 (update annually)
export const IRS_MILEAGE_RATE = 0.70; // $0.70 per mile

// Self-Employment tax rate (Social Security + Medicare)
const SE_TAX_RATE = 0.153; // 15.3%

// Simplified federal income tax brackets for 2025 (single filer)
// These are approximations for quick estimates
const FEDERAL_BRACKETS = [
  { upTo: 11600, rate: 0.10 },
  { upTo: 47150, rate: 0.12 },
  { upTo: 100525, rate: 0.22 },
  { upTo: 191950, rate: 0.24 },
  { upTo: 243725, rate: 0.32 },
  { upTo: 609350, rate: 0.35 },
  { upTo: Infinity, rate: 0.37 },
];

// State tax rates (no income tax states)
const NO_TAX_STATES = ['TN', 'FL', 'TX', 'WA', 'NV', 'SD', 'WY', 'AK', 'NH'];

export interface TaxEstimate {
  selfEmployment: number;
  federalIncome: number;
  stateIncome: number;
  total: number;
}

/**
 * Calculate progressive tax using brackets
 */
function calculateBracketTax(income: number, brackets: Array<{ upTo: number; rate: number }>): number {
  let tax = 0;
  let previousThreshold = 0;

  for (const bracket of brackets) {
    if (income <= previousThreshold) break;

    const taxableInBracket = Math.min(income, bracket.upTo) - previousThreshold;
    tax += taxableInBracket * bracket.rate;
    previousThreshold = bracket.upTo;

    if (income <= bracket.upTo) break;
  }

  return tax;
}

/**
 * Estimate taxes for a given net income before tax
 * @param netBeforeTax - Income after expenses but before taxes
 * @param stateCode - Two-letter state code (optional)
 * @returns Tax breakdown
 */
export function estimateTaxes(netBeforeTax: number, stateCode?: string | null): TaxEstimate {
  if (netBeforeTax <= 0) {
    return {
      selfEmployment: 0,
      federalIncome: 0,
      stateIncome: 0,
      total: 0,
    };
  }

  // 1. Self-Employment Tax (15.3% on 92.35% of net income)
  const seIncome = netBeforeTax * 0.9235;
  const selfEmployment = seIncome * SE_TAX_RATE;

  // 2. Federal Income Tax (on net minus 1/2 SE tax deduction)
  const federalTaxableIncome = netBeforeTax - (selfEmployment / 2);
  const federalIncome = calculateBracketTax(federalTaxableIncome, FEDERAL_BRACKETS);

  // 3. State Income Tax (simplified - use 0% for no-tax states, 5% average for others)
  let stateIncome = 0;
  if (stateCode && !NO_TAX_STATES.includes(stateCode)) {
    // Simple 5% estimate for states with income tax
    // In production, this would query the state_tax_rates table
    stateIncome = netBeforeTax * 0.05;
  }

  const total = selfEmployment + federalIncome + stateIncome;

  return {
    selfEmployment,
    federalIncome,
    stateIncome,
    total,
  };
}

/**
 * Hook to get tax estimate with user's state from profile
 */
export function useTaxEstimate(netBeforeTax: number) {
  // Fetch user's state from profile
  const { data: profile } = useQuery<{ state_code: string | null } | null>({
    queryKey: ['profile'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('state_code')
        .eq('id', user.id)
        .single();

      if (error) return null;
      return data as any;
    },
  });

  const estimate = useMemo(() => {
    return estimateTaxes(netBeforeTax, profile?.state_code);
  }, [netBeforeTax, profile?.state_code]);

  return {
    estimate,
    stateCode: profile?.state_code,
    hasProfile: !!profile,
  };
}

/**
 * Calculate mileage deduction
 */
export function calculateMileageDeduction(miles: number): number {
  return miles * IRS_MILEAGE_RATE;
}
