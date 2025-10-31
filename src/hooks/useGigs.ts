import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Gig = Database['public']['Tables']['gigs']['Row'];
type GigInsert = Database['public']['Tables']['gigs']['Insert'];
type GigUpdate = Database['public']['Tables']['gigs']['Update'];

export interface GigWithPayer extends Gig {
  payer: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export function useGigs() {
  return useQuery({
    queryKey: ['gigs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gigs')
        .select(`
          *,
          payer:payers(id, name, type)
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as GigWithPayer[];
    },
  });
}

export function useCreateGig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (gig: Omit<GigInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['mileage'] });
    },
  });
}
