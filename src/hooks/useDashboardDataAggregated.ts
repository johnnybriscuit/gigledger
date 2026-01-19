/**
 * Aggregated Dashboard Data Hook
 * 
 * PERFORMANCE OPTIMIZATION: Fetches all dashboard data in a single query
 * instead of 6+ separate queries. This eliminates network waterfalls and
 * reduces total requests from 40+ to ~5-8.
 * 
 * Expected Impact: 60-70% reduction in load time (7.46s → ~2-3s)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserId } from './useCurrentUser';
import type { Database } from '../types/database.types';

type Gig = Database['public']['Tables']['gigs']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];
type Mileage = Database['public']['Tables']['mileage']['Row'];

interface DashboardDataAggregated {
  gigs: Gig[];
  expenses: Expense[];
  mileage: Mileage[];
  taxProfile: any;
  profile: any;
}

/**
 * Fetch all dashboard data in parallel with a single hook call
 * Uses Promise.all to execute all queries simultaneously
 */
export function useDashboardDataAggregated() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['dashboard_aggregated', userId],
    queryFn: async (): Promise<DashboardDataAggregated> => {
      if (!userId) throw new Error('Not authenticated');

      // Execute all queries in parallel
      const [gigsResult, expensesResult, mileageResult, taxProfileResult, profileResult] = await Promise.all([
        // Gigs - include payer and subcontractor_payments relationships
        supabase
          .from('gigs')
          .select(`
            *,
            payer:payers(id, name),
            subcontractor_payments:gig_subcontractor_payments(id, subcontractor_id, amount, note)
          `)
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        
        // Expenses - fetch all fields
        supabase
          .from('expenses')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        
        // Mileage - fetch all fields
        supabase
          .from('mileage')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        
        // Tax profile
        supabase
          .from('user_tax_profile')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        
        // User profile
        supabase
          .from('profiles')
          .select('id, business_structure, plan')
          .eq('id', userId)
          .single(),
      ]);

      // Check for errors
      if (gigsResult.error) throw gigsResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (mileageResult.error) throw mileageResult.error;
      if (taxProfileResult.error && taxProfileResult.error.code !== 'PGRST116') throw taxProfileResult.error;
      if (profileResult.error) throw profileResult.error;

      return {
        gigs: gigsResult.data || [],
        expenses: expensesResult.data || [],
        mileage: mileageResult.data || [],
        taxProfile: taxProfileResult.data,
        profile: profileResult.data,
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });
}
