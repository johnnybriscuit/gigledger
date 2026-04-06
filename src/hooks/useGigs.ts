import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { getCachedUserId } from '../lib/sharedAuth';
import { useUserId } from './useCurrentUser';
import { getPlanAndUsage, createGigLimitError } from '../lib/planLimits';

type Gig = Database['public']['Tables']['gigs']['Row'];
type GigInsert = Database['public']['Tables']['gigs']['Insert'];
type GigUpdate = Database['public']['Tables']['gigs']['Update'];

export interface GigWithPayer extends Gig {
  payer: {
    id: string;
    name: string;
    payer_type: string;
  } | null;
  expenses?: Array<{
    id: string;
    category: string;
    description: string;
    amount: number;
    notes: string | null;
  }>;
  mileage?: Array<{
    id: string;
    date: string;
    miles: number;
    notes: string | null;
  }>;
  subcontractor_payments?: Array<{
    id: string;
    subcontractor_id: string;
    amount: number;
    note: string | null;
  }>;
}

export function useGigs() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  
  console.log('[useGigs] userId:', userId, 'enabled:', !!userId);
  
  const result = useQuery({
    queryKey: userId ? queryKeys.gigs(userId) : ['gigs-loading'],
    queryFn: async () => {
      console.log('[useGigs] queryFn called, userId:', userId);
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gigs')
        .select(`
          *,
          payer:payers(id, name, payer_type),
          expenses(id, category, description, amount, notes),
          mileage:mileage!mileage_gig_id_fkey(id, date, miles, notes),
          subcontractor_payments:gig_subcontractor_payments(id, subcontractor_id, amount, note)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });

      console.log('[useGigs] Query result:', data?.length, 'gigs, error:', error);
      if (error) throw error;
      return data as unknown as GigWithPayer[];
    },
    enabled: !!userId,
    staleTime: 0, // Always consider data stale to refetch
    gcTime: 5 * 60 * 1000, // Keep cached data for 5 minutes to show while refetching
    refetchOnMount: 'always', // Always refetch when component mounts
    placeholderData: (previousData) => previousData, // Show previous data while refetching
  });
  
  console.log('[useGigs] Returning data:', result.data?.length, 'isLoading:', result.isLoading);
  return result;
}

export function useCreateGig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gig: Omit<GigInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check plan limits before creating gig
      const planCheck = await getPlanAndUsage(supabase, user.id);

      if (!planCheck.canCreateGigs) {
        const error: any = createGigLimitError(planCheck);
        error.code = 'FREE_PLAN_LIMIT_REACHED';
        throw error;
      }

      // Calculate net amount (database trigger will also do this, but we set it for consistency)
      const netAmount = (gig.gross_amount || 0) 
                      + (gig.tips || 0) 
                      + (gig.per_diem || 0)
                      + (gig.other_income || 0)
                      - (gig.fees || 0);

      const { data, error } = await supabase
        .from('gigs')
        .insert({ 
          ...gig, 
          user_id: user.id,
          net_amount: netAmount,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Gig;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gigs(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
      }
    },
  });
}

export function useUpdateGig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: GigUpdate & { id: string }) => {
      // Recalculate net amount if any amount fields are updated
      const hasAmountUpdate = updates.gross_amount !== undefined 
                           || updates.tips !== undefined 
                           || updates.fees !== undefined
                           || updates.per_diem !== undefined
                           || updates.other_income !== undefined;

      const netAmount = hasAmountUpdate
        ? (updates.gross_amount || 0) 
        + (updates.tips || 0) 
        + (updates.per_diem || 0)
        + (updates.other_income || 0)
        - (updates.fees || 0)
        : undefined;

      const finalUpdates = netAmount !== undefined 
        ? { ...updates, net_amount: netAmount }
        : updates;

      const { data, error } = await supabase
        .from('gigs')
        .update(finalUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Gig;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        // Invalidate gigs list (this will trigger dashboard to recalculate)
        queryClient.invalidateQueries({ queryKey: queryKeys.gigs(userId) });
        
        // Invalidate all dashboard queries (with any date range)
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
        
        // Invalidate exports (Schedule C, tax exports, reports)
        queryClient.invalidateQueries({ queryKey: ['exports', userId] });
        
        // Invalidate invoices (if paid status affects invoice generation)
        queryClient.invalidateQueries({ queryKey: queryKeys.invoices(userId) });
        
        // Invalidate map stats (if they depend on gig data)
        queryClient.invalidateQueries({ queryKey: ['map-stats', userId] });
        
        // Invalidate any YTD tax data that depends on gigs
        queryClient.invalidateQueries({ queryKey: ['ytd-tax-data'] });
        
        // Force refetch to ensure dashboard updates immediately
        await queryClient.refetchQueries({ queryKey: queryKeys.gigs(userId) });
      }
    },
  });
}

export function useDeleteGig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gigs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Track analytics
      const { trackGigDeleted } = await import('../lib/analytics');
      const { track } = await import('../lib/tracking');
      trackGigDeleted({ entity_id: id, source: 'gigs_screen' });
      track('gig_deleted', {
        entity_type: 'gig',
        entity_id: id,
        source: 'gigs_screen'
      });
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gigs(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(userId) });
      }
    },
  });
}
