import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';
import { getSharedUserId, getCachedUserId } from '../lib/sharedAuth';

export type Payer = Database['public']['Tables']['payers']['Row'];
type PayerInsert = Database['public']['Tables']['payers']['Insert'];
type PayerUpdate = Database['public']['Tables']['payers']['Update'];

export function usePayers() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getSharedUserId().then(setUserId);
  }, []);
  
  return useQuery({
    queryKey: userId ? queryKeys.payers(userId) : ['payers-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payers')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) throw error;
      return data as Payer[];
    },
    enabled: !!userId,
  });
}

export function useCreatePayer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payer: Omit<PayerInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Use upsert to prevent duplicates based on normalized_name
      // If a payer with same normalized name exists, update it instead
      const { data, error } = await supabase
        .from('payers')
        .upsert(
          { ...payer, user_id: user.id },
          { 
            onConflict: 'user_id,normalized_name',
            ignoreDuplicates: false // Update existing record
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as Payer;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.payers(userId) });
      }
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
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.payers(userId) });
      }
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
    onSuccess: async () => {
      console.log('Delete successful, invalidating cache');
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.payers(userId) });
      }
    },
    onError: (error) => {
      console.error('Delete mutation error:', error);
    },
  });
}
