/**
 * React hook for calculating taxes using the new tax engine
 * Replaces the old useWithholding hook with proper state tax calculations
 * 
 * PERFORMANCE OPTIMIZED: Uses shared taxProfile hook to eliminate duplicate fetches
 */

import { useMemo } from 'react';
import { 
  calcTotalTax, 
  type TaxProfile as EngineTaxProfile,
  type YTDData,
  type TaxResult 
} from '../tax/engine';
import { useProfile } from './useProfile';
import { useSubscription } from './useSubscription';
import { getResolvedPlan, isSCalcEligibleForBusinessStructure } from '../lib/businessStructure';
import { useTaxProfile } from './useTaxProfile';
import { useUserId } from './useCurrentUser';

interface UseTaxCalculationResult {
  taxResult: TaxResult | null;
  loading: boolean;
  error: Error | null;
  hasProfile: boolean;
}

/**
 * Hook to calculate taxes using the new tax engine
 * 
 * PERFORMANCE: Reuses taxProfile from useTaxProfile hook instead of fetching again
 * This eliminates ~30 duplicate requests per Dashboard load
 * 
 * @param netProfit - Year-to-date net profit (gross - expenses)
 * @param grossIncome - Year-to-date gross income
 * @returns Tax calculation result with federal, state, local, and SE tax
 */
export function useTaxCalculation(
  netProfit: number,
  grossIncome: number
): UseTaxCalculationResult {
  // Use shared hooks to avoid duplicate fetches
  const userId = useUserId();
  const { data: profile } = useProfile(userId || undefined);
  const { data: subscription } = useSubscription();
  const { data: taxProfile, isLoading: taxProfileLoading } = useTaxProfile();
  
  const plan = getResolvedPlan({
    subscriptionTier: subscription?.tier,
    subscriptionStatus: subscription?.status,
  });
  
  const businessStructure = profile?.business_structure || 'individual';
  const eligibility = isSCalcEligibleForBusinessStructure(businessStructure, plan);

  // Calculate taxes using memoization to avoid recalculation on every render
  const result = useMemo(() => {
    let taxResult: TaxResult | null = null;
    let error: Error | null = null;
    let hasProfile = false;

    try {
      // If no profile exists, use defaults with null state
      if (!taxProfile || !taxProfile.state) {
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

        taxResult = calcTotalTax(ytd, defaultProfile);
        hasProfile = false;
      } else {
        // Map tax profile to engine format
        hasProfile = true;
        const engineProfile: EngineTaxProfile = {
          filingStatus: taxProfile.filingStatus,
          state: taxProfile.state,
          county: taxProfile.county,
          nycResident: taxProfile.nycResident,
          yonkersResident: taxProfile.yonkersResident,
          deductionMethod: taxProfile.deductionMethod,
          itemizedAmount: taxProfile.itemizedAmount,
          seIncome: taxProfile.seIncome,
        };

        const ytd: YTDData = {
          grossIncome,
          adjustments: 0,
          netSE: netProfit,
        };

        // Check if SE tax should be calculated based on business structure
        if (!eligibility.usesSelfEmploymentTax) {
          taxResult = {
            federal: 0,
            state: 0,
            local: 0,
            seTax: 0,
            total: 0,
            effectiveRate: 0,
          };
          console.log('[useTaxCalculation] SE tax disabled for business structure:', businessStructure);
        } else {
          taxResult = calcTotalTax(ytd, engineProfile);
        }
      }
    } catch (err) {
      console.error('[useTaxCalculation] Error:', err);
      error = err instanceof Error ? err : new Error('Failed to calculate taxes');
      
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

      taxResult = calcTotalTax(ytd, fallbackProfile);
    }

    return { taxResult, error, hasProfile };
  }, [netProfit, grossIncome, taxProfile, businessStructure, eligibility]);

  return {
    taxResult: result.taxResult,
    loading: taxProfileLoading,
    error: result.error,
    hasProfile: result.hasProfile,
  };
}
