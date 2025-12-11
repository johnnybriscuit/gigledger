/**
 * Hook to calculate tax set-aside for individual gigs using the 2025 tax engine
 * This ensures gig cards and Edit Gig form use the same tax calculation
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTaxProfile } from './useTaxProfile';
import { taxDeltaForGig, type YTDData, type GigData } from '../tax/engine';

export interface GigTaxResult {
  setAside: number;
  rate: number;
  breakdown: {
    federal: number;
    state: number;
    local: number;
    seTax: number;
  };
}

/**
 * Calculate tax set-aside for a specific gig using the 2025 tax engine
 * This is the same calculation used in the Edit Gig form
 */
export function useGigTaxCalculation(
  gigGross: number,
  gigExpenses: number
): {
  taxResult: GigTaxResult | null;
  loading: boolean;
} {
  const { data: taxProfile, isLoading: profileLoading } = useTaxProfile();

  // Get YTD data for tax calculation
  const { data: ytdData, isLoading: ytdLoading } = useQuery<{
    ytdGross: number;
    ytdExpenses: number;
  }>({
    queryKey: ['ytd-tax-data'],
    queryFn: async () => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString();
      
      // Get YTD gigs
      const { data: gigs, error: gigsError } = await supabase
        .from('gigs')
        .select('gross_amount, tips, per_diem, other_income, fees')
        .gte('date', yearStart);
      
      if (gigsError) throw gigsError;
      
      // Get YTD expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount')
        .gte('date', yearStart);
      
      if (expensesError) throw expensesError;
      
      const ytdGross = (gigs || []).reduce((sum, gig: any) => 
        sum + (gig.gross_amount || 0) + (gig.tips || 0) + 
        (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0), 0
      );
      
      const ytdExpenses = (expenses || []).reduce((sum, exp: any) => sum + (exp.amount || 0), 0);
      
      return { ytdGross, ytdExpenses };
    },
  });

  // Calculate tax result
  if (!taxProfile || !ytdData || profileLoading || ytdLoading) {
    return { taxResult: null, loading: true };
  }

  try {
    const ytdInput: YTDData = {
      grossIncome: ytdData.ytdGross,
      adjustments: 0,
      netSE: ytdData.ytdGross - ytdData.ytdExpenses,
    };

    const gigData: GigData = {
      gross: gigGross,
      expenses: gigExpenses,
    };

    const result = taxDeltaForGig(ytdInput, gigData, taxProfile);

    return {
      taxResult: {
        setAside: result.amount,
        rate: result.rate,
        breakdown: result.breakdown,
      },
      loading: false,
    };
  } catch (error) {
    console.error('[useGigTaxCalculation] Error:', error);
    return { taxResult: null, loading: false };
  }
}
