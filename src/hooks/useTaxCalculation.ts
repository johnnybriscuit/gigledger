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
import { useProfile } from './useProfile';
import { useSubscription } from './useSubscription';
import { getResolvedPlan, isSCalcEligibleForBusinessStructure } from '../lib/businessStructure';
import { useQuery } from '@tanstack/react-query';

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
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
  
  const { data: profile } = useProfile(user?.id);
  const { data: subscription } = useSubscription();
  
  const plan = getResolvedPlan({
    subscriptionTier: subscription?.tier,
    subscriptionStatus: subscription?.status,
  });
  
  const businessStructure = profile?.business_structure || 'individual';
  const eligibility = isSCalcEligibleForBusinessStructure(businessStructure, plan);

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
          .maybeSingle();

        if (profileError) throw profileError;

        // If no profile exists, use defaults with null state
        if (!taxProfile || !taxProfile.state) {
          setHasProfile(false);
          const defaultProfile: EngineTaxProfile = {
            filingStatus: 'single',
            state: 'US' as any, // Fallback for calculation only
            deductionMethod: 'standard',
            seIncome: true,
          };

          const ytd: YTDData = {
            grossIncome,
            adjustments: 0,
            netSE: netProfit,
          };

          const result = calcTotalTax(ytd, defaultProfile);
          if (isMounted) {
            setTaxResult(result);
            setLoading(false);
          }
          return;
        }

        // Map database fields to engine format
        setHasProfile(true);
        const profile: EngineTaxProfile = {
          filingStatus: (taxProfile.filing_status || 'single') as any,
          state: taxProfile.state as any,
          county: taxProfile.county || undefined,
          nycResident: taxProfile.nyc_resident || false,
          yonkersResident: taxProfile.yonkers_resident || false,
          deductionMethod: (taxProfile.deduction_method || 'standard') as any,
          itemizedAmount: taxProfile.itemized_amount || undefined,
          seIncome: taxProfile.se_income !== false, // Default to true
        };

        const ytd: YTDData = {
          grossIncome,
          adjustments: 0, // TODO: Add adjustments support if needed
          netSE: netProfit,
        };

        // Check if SE tax should be calculated based on business structure
        let result: TaxResult;
        if (!eligibility.usesSelfEmploymentTax) {
          result = {
            federal: 0,
            state: 0,
            local: 0,
            seTax: 0,
            total: 0,
            effectiveRate: 0,
          };
          console.log('[useTaxCalculation] SE tax disabled for business structure:', businessStructure);
        } else {
          result = calcTotalTax(ytd, profile);
          console.log('[useTaxCalculation] Tax Profile:', profile);
          console.log('[useTaxCalculation] YTD Data:', ytd);
          console.log('[useTaxCalculation] Tax Result:', result);
        }

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
