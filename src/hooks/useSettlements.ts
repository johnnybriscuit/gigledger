import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Settlement, SettlementInsert, SettlementUpdate } from '../types/tours.types';
import { useUserId } from './useCurrentUser';

export function useSettlements(tourId: string | undefined) {
  const userId = useUserId();

  return useQuery({
    queryKey: tourId ? ['settlements', tourId] : ['settlements-loading'],
    queryFn: async () => {
      if (!userId || !tourId) throw new Error('Not authenticated or no tour ID');

      const { data, error } = await supabase
        .from('settlements')
        .select('*')
        .eq('tour_id', tourId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Settlement[];
    },
    enabled: !!userId && !!tourId,
  });
}

export function useCreateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settlement: Omit<SettlementInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('settlements')
        .insert({ ...settlement, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Settlement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      if (data.tour_id) {
        queryClient.invalidateQueries({ queryKey: ['tour', data.tour_id] });
      }
    },
  });
}

export function useUpdateSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ settlementId, updates }: { settlementId: string; updates: SettlementUpdate }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('settlements')
        .update(updates)
        .eq('id', settlementId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Settlement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      if (data.tour_id) {
        queryClient.invalidateQueries({ queryKey: ['tour', data.tour_id] });
      }
    },
  });
}

export function useDeleteSettlement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ settlementId, tourId }: { settlementId: string; tourId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('settlements')
        .delete()
        .eq('id', settlementId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['settlements'] });
      if (variables.tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', variables.tourId] });
      }
    },
  });
}
