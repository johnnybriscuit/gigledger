import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';
import { getSharedUserId } from '../lib/sharedAuth';

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
    miles: number;
    notes: string | null;
  }>;
}

export function useGigs() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getSharedUserId().then(setUserId);
  }, []);
  
  return useQuery({
    queryKey: userId ? queryKeys.gigs(userId) : ['gigs-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gigs')
        .select(`
          *,
          payer:payers(id, name, payer_type),
          expenses(id, category, description, amount, notes),
          mileage(id, miles, notes)
        `)
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as GigWithPayer[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 60 seconds - data stays fresh
    gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache
    placeholderData: (previousData) => previousData, // Keep previous data while refetching
  });
}

export function useCreateGig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gig: Omit<GigInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check user's plan and gig count
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan')
        .eq('id', user.id)
        .single();

      const plan = profile?.plan || 'free';

      // If free plan, check gig limit
      if (plan === 'free') {
        const { count } = await supabase
          .from('gigs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (count !== null && count >= FREE_GIG_LIMIT) {
          const error: any = new Error('Free plan limit reached');
          error.code = 'FREE_PLAN_LIMIT_REACHED';
          throw error;
        }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gigs(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gigs(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
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
    },
    onSuccess: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.gigs(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.expenses(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(user.id) });
      }
    },
  });
}
