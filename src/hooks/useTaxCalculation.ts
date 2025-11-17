/**
 * React hook for calculating taxes using the new tax engine
 * Replaces the old useWithholding hook with proper state tax calculations
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  calcTotalTax, 
  type TaxProfile as EngineTaxProfile,
  type YTDData,
  type TaxResult 
} from '../tax/engine';

interface UseTaxCalculationResult {
  taxResult: TaxResult | null;
  loading: boolean;
  error: Error | null;
  hasProfile: boolean;
}

/**
 * Hook to calculate taxes using the new tax engine
 * 
 * @param netProfit - Year-to-date net profit (gross - expenses)
 * @param grossIncome - Year-to-date gross income
 * @returns Tax calculation result with federal, state, local, and SE tax
 */
export function useTaxCalculation(
  netProfit: number,
  grossIncome: number
): UseTaxCalculationResult {
  const [taxResult, setTaxResult] = useState<TaxResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function calculate() {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Not authenticated');
        }

        // Get user's tax profile from user_tax_profile table
        const { data: taxProfile, error: profileError } = await supabase
          .from('user_tax_profile')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profileError) {
          console.warn('[useTaxCalculation] No tax profile found, using defaults:', profileError);
          // Use defaults if no profile exists
          if (isMounted) {
            setHasProfile(false);
            
            // Calculate with defaults (TN = no state tax)
            const defaultProfile: EngineTaxProfile = {
              filingStatus: 'single',
              state: 'TN',
              deductionMethod: 'standard',
              seIncome: true,
            };

            const ytd: YTDData = {
              grossIncome,
              adjustments: 0,
              netSE: netProfit,
            };

            const result = calcTotalTax(ytd, defaultProfile);
            setTaxResult(result);
            setLoading(false);
          }
          return;
        }

        // Map database fields to engine format
        const profile: EngineTaxProfile = {
          filingStatus: taxProfile.filing_status || 'single',
          state: taxProfile.state || 'TN',
          county: taxProfile.county || undefined,
          nycResident: taxProfile.nyc_resident || false,
          yonkersResident: taxProfile.yonkers_resident || false,
          deductionMethod: taxProfile.deduction_method || 'standard',
          itemizedAmount: taxProfile.itemized_amount || undefined,
          seIncome: taxProfile.se_income !== false, // Default to true
        };

        const ytd: YTDData = {
          grossIncome,
          adjustments: 0, // TODO: Add adjustments support if needed
          netSE: netProfit,
        };

        // Calculate taxes using the new engine
        const result = calcTotalTax(ytd, profile);
        
        // Debug logging
        console.log('[useTaxCalculation] Tax Profile:', profile);
        console.log('[useTaxCalculation] YTD Data:', ytd);
        console.log('[useTaxCalculation] Tax Result:', result);

        if (isMounted) {
          setHasProfile(true);
          setTaxResult(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('[useTaxCalculation] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to calculate taxes'));
          
          // Provide fallback calculation
          const fallbackProfile: EngineTaxProfile = {
            filingStatus: 'single',
            state: 'TN',
            deductionMethod: 'standard',
            seIncome: true,
          };

          const ytd: YTDData = {
            grossIncome,
            adjustments: 0,
            netSE: netProfit,
          };

          setTaxResult(calcTotalTax(ytd, fallbackProfile));
          setLoading(false);
        }
      }
    }

    if (netProfit >= 0 && grossIncome >= 0) {
      calculate();
    } else {
      // Invalid inputs, return zero taxes
      setTaxResult({
        federal: 0,
        state: 0,
        local: 0,
        seTax: 0,
        total: 0,
        effectiveRate: 0,
      });
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [netProfit, grossIncome]);

  return { taxResult, loading, error, hasProfile };
}
