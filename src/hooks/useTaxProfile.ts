/**
 * Hook for managing user tax profile
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TaxProfile } from '../tax/engine';
import type { StateCode } from '../tax/config/2025';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';

interface TaxProfileRow {
  user_id: string;
  tax_year: number;
  filing_status: string;
  state: string;
  county: string | null;
  nyc_resident: boolean;
  yonkers_resident: boolean;
  deduction_method: string;
  itemized_amount: number | null;
  se_income: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch user's tax profile
 */
export function useTaxProfile() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);
  
  return useQuery({
    queryKey: userId ? queryKeys.taxProfile(userId) : ['taxProfile-loading'],
    queryFn: async (): Promise<TaxProfile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_tax_profile')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      // If no profile exists, return defaults with null state
      if (!data) {
        return {
          filingStatus: 'single' as const,
          state: null as any, // User must set their state
          county: undefined,
          nycResident: undefined,
          yonkersResident: undefined,
          deductionMethod: 'standard' as const,
          seIncome: true, // Assume self-employment for GigLedger users
        };
      }

      const row = data as TaxProfileRow;

      return {
        filingStatus: row.filing_status as TaxProfile['filingStatus'],
        state: row.state as StateCode,
        county: row.county || undefined,
        nycResident: row.nyc_resident || undefined,
        yonkersResident: row.yonkers_resident || undefined,
        deductionMethod: row.deduction_method as 'standard' | 'itemized',
        itemizedAmount: row.itemized_amount || undefined,
        seIncome: row.se_income,
      };
    },
    enabled: !!userId,
  });
}

/**
 * Create or update tax profile
 */
export function useUpsertTaxProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: TaxProfile) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const row: Partial<TaxProfileRow> = {
        user_id: user.id,
        tax_year: 2025,
        filing_status: profile.filingStatus,
        state: profile.state,
        county: profile.county || null,
        nyc_resident: profile.nycResident || false,
        yonkers_resident: profile.yonkersResident || false,
        deduction_method: profile.deductionMethod,
        itemized_amount: profile.itemizedAmount || null,
        se_income: profile.seIncome,
      };

      const { error } = await supabase
        .from('user_tax_profile')
        .upsert(row as any, { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.taxProfile(user.id) });
      }
    },
  });
}

/**
 * Check if user has completed tax profile
 */
export function useHasTaxProfile() {
  const { data: profile, isLoading } = useTaxProfile();
  return {
    hasProfile: !!profile,
    isLoading,
  };
}
