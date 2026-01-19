import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { getCachedUserId } from '../lib/sharedAuth';
import { useUserId } from './useCurrentUser';

type Mileage = Database['public']['Tables']['mileage']['Row'];
type MileageInsert = Database['public']['Tables']['mileage']['Insert'];
type MileageUpdate = Database['public']['Tables']['mileage']['Update'];

// IRS standard mileage rate for 2024
export const IRS_MILEAGE_RATE = 0.67;

export function useMileage() {
  const userId = useUserId();
  
  return useQuery({
    queryKey: userId ? queryKeys.mileage(userId) : ['mileage-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('mileage')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false});

      if (error) throw error;
      return data as Mileage[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateMileage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mileage: Omit<MileageInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('mileage')
        .insert({ ...mileage, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Mileage;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
      }
    },
  });
}

export function useUpdateMileage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: MileageUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('mileage')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Mileage;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
      }
    },
  });
}

export function useDeleteMileage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mileage')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
      }
    },
  });
}

// Calculate total deductible amount
export function calculateMileageDeduction(miles: number): number {
  return miles * IRS_MILEAGE_RATE;
}
