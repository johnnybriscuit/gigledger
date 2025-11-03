/**
 * Hook for managing user tax profile
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TaxProfile } from '../tax/engine';
import type { StateCode } from '../tax/config/2025';

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
  return useQuery({
    queryKey: ['taxProfile'],
    queryFn: async (): Promise<TaxProfile | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('user_tax_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found
          return null;
        }
        throw error;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxProfile'] });
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
