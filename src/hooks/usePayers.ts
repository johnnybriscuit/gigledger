import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Payer = Database['public']['Tables']['payers']['Row'];
type PayerInsert = Database['public']['Tables']['payers']['Insert'];
type PayerUpdate = Database['public']['Tables']['payers']['Update'];

export function usePayers() {
  return useQuery({
    queryKey: ['payers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payers')
        .select('*')
        .order('name');

      if (error) throw error;
      return data as Payer[];
    },
  });
}

export function useCreatePayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payer: Omit<PayerInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payers')
        .insert({ ...payer, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Payer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payers'] });
    },
  });
}

export function useUpdatePayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: PayerUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('payers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Payer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payers'] });
    },
  });
}

export function useDeletePayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      console.log('Attempting to delete payer:', id);
      
      const { data, error } = await supabase
        .from('payers')
        .delete()
        .eq('id', id)
        .select();

      console.log('Delete response:', { data, error });

      if (error) {
        console.error('Delete error:', error);
        throw new Error(error.message || 'Failed to delete payer');
      }
      
      return data;
    },
    onSuccess: () => {
      console.log('Delete successful, invalidating cache');
      queryClient.invalidateQueries({ queryKey: ['payers'] });
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
    },
  });
}
