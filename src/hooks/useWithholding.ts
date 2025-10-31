/**
 * React hook for calculating tax withholding
 */

import { useState, useEffect } from 'react';
import { calculateWithholding, type WithholdingBreakdown, type WithholdingInput } from '../lib/tax/withholding';
import { getStateRate, getUserTaxProfile } from '../services/taxService';

interface UseWithholdingResult {
  breakdown: WithholdingBreakdown | null;
  loading: boolean;
  error: Error | null;
  hasProfile: boolean;
}

/**
 * Hook to calculate tax withholding for a gig amount
 * 
 * @param amount - Gross gig amount
 * @param ytdNetIncome - Optional year-to-date net income
 * @returns Withholding breakdown, loading state, and error
 */
export function useWithholding(
  amount: number,
  ytdNetIncome?: number
): UseWithholdingResult {
  const [breakdown, setBreakdown] = useState<WithholdingBreakdown | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function calculate() {
      try {
        setLoading(true);
        setError(null);

        // Get user's tax profile (will return defaults if table doesn't exist)
        const profile = await getUserTaxProfile();
        const hasCompleteProfile = profile.stateCode !== null;
        
        if (isMounted) {
          setHasProfile(hasCompleteProfile);
        }

        // If no profile, use defaults
        const stateCode = profile.stateCode || 'TN'; // Default to TN (no state tax)
        const filingStatus = profile.filingStatus || 'single';

        // Get state rate (will return null if table doesn't exist)
        const stateRate = await getStateRate(stateCode);

        // Calculate withholding (works even if stateRate is null)
        const input: WithholdingInput = {
          amount,
          stateCode,
          filingStatus,
          ytdNetIncome,
        };

        const result = calculateWithholding(input, stateRate);

        if (isMounted) {
          setBreakdown(result);
          setLoading(false);
        }
      } catch (err) {
        console.error('Error in useWithholding:', err);
        // Provide fallback calculation even on error
        if (isMounted) {
          const fallbackResult = calculateWithholding(
            { amount, stateCode: 'TN', filingStatus: 'single', ytdNetIncome },
            null
          );
          setBreakdown(fallbackResult);
          setError(err instanceof Error ? err : new Error('Failed to calculate withholding'));
          setLoading(false);
        }
      }
    }

    if (amount > 0) {
      calculate();
    } else {
      setBreakdown({
        federalIncome: 0,
        selfEmployment: 0,
        stateIncome: 0,
        total: 0,
      });
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [amount, ytdNetIncome]);

  return { breakdown, loading, error, hasProfile };
}
