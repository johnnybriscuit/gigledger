import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';
import { getSharedUserId, getCachedUserId } from '../lib/sharedAuth';

export type Payer = Database['public']['Tables']['payers']['Row'];
type PayerInsert = Database['public']['Tables']['payers']['Insert'];
type PayerUpdate = Database['public']['Tables']['payers']['Update'];

type PostgrestLikeError = {
  code?: string | null;
  details?: string | null;
  hint?: string | null;
  message?: string | null;
};

function isMissingOnConflictConstraint(error: PostgrestLikeError | null | undefined) {
  if (!error) {
    return false;
  }

  const message = `${error.message ?? ''} ${error.details ?? ''}`.toLowerCase();
  return (
    error.code === '42P10' ||
    message.includes('no unique or exclusion constraint matching the on conflict specification')
  );
}

function isUnsupportedAgencyPayerType(
  error: PostgrestLikeError | null | undefined,
  payerType: PayerInsert['payer_type'] | undefined
) {
  if (!error || payerType !== 'Agency') {
    return false;
  }

  const combined = `${error.message ?? ''} ${error.details ?? ''} ${error.hint ?? ''}`;
  return /invalid input value for enum .*payer_type.*agency/i.test(combined);
}

function formatPostgrestError(error: PostgrestLikeError) {
  return [error.message, error.details, error.hint].filter(Boolean).join(' ');
}

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

      const row = { ...payer, user_id: user.id };

      // Use upsert to prevent duplicates based on normalized_name
      // If a payer with same normalized name exists, update it instead
      let { data, error } = await supabase
        .from('payers')
        .upsert(
          row,
          { 
            onConflict: 'user_id,normalized_name',
            ignoreDuplicates: false // Update existing record
          }
        )
        .select()
        .single();

      if (error && isMissingOnConflictConstraint(error)) {
        console.warn(
          '[Payers] Missing payers(user_id, normalized_name) unique constraint. Retrying with plain insert.',
          error
        );

        ({ data, error } = await supabase
          .from('payers')
          .insert(row)
          .select()
          .single());
      }

      if (error && isUnsupportedAgencyPayerType(error, payer.payer_type)) {
        throw new Error(
          'Agency payer type is not enabled in the database yet. Apply Supabase migration 20260409001_add_agency_to_payer_type.sql, then try again.'
        );
      }

      if (error) {
        console.error('[Payers] Failed to create payer', { payer: row, error });
        throw new Error(formatPostgrestError(error) || 'Failed to save payer');
      }

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
