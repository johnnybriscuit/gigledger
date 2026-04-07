import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { getCachedUserId, getSharedUser } from '../lib/sharedAuth';
import { useUserId } from './useCurrentUser';
import {
  calculateMileageDeduction as calculateMileageDeductionForDate,
  getLatestSupportedMileageYear,
  getStandardMileageRate,
} from '../lib/mileage';

type Mileage = Database['public']['Tables']['mileage']['Row'];
type MileageInsert = Database['public']['Tables']['mileage']['Insert'];
type MileageUpdate = Database['public']['Tables']['mileage']['Update'];

export const IRS_MILEAGE_RATE_YEAR = getLatestSupportedMileageYear();
export const IRS_MILEAGE_RATE = getStandardMileageRate();

export interface MileageQueryFilters {
  startDate?: string;
  endDate?: string;
}

export function useMileage(filters?: MileageQueryFilters) {
  const userId = useUserId();
  
  return useQuery({
    queryKey: userId
      ? [...queryKeys.mileage(userId), filters?.startDate ?? null, filters?.endDate ?? null]
      : ['mileage-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');
      
      let query = supabase
        .from('mileage')
        .select('*')
        .eq('user_id', userId);

      if (filters?.startDate) {
        query = query.gte('date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('date', filters.endDate);
      }

      const { data, error } = await query.order('date', { ascending: false});

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
      const user = await getSharedUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('mileage')
        .insert({ ...mileage, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      
      // Track analytics
      const { trackMileageCreated } = await import('../lib/analytics');
      trackMileageCreated({ entity_id: data.id, source: 'mileage_modal' });
      
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
      
      // Track analytics
      const { trackMileageDeleted } = await import('../lib/analytics');
      trackMileageDeleted({ entity_id: id, source: 'mileage_screen' });
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
export function calculateMileageDeduction(miles: number, date?: string | Date | null): number {
  return calculateMileageDeductionForDate(miles, date);
}
