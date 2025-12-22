import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';

type Mileage = Database['public']['Tables']['mileage']['Row'];
type MileageInsert = Database['public']['Tables']['mileage']['Insert'];
type MileageUpdate = Database['public']['Tables']['mileage']['Update'];

// IRS standard mileage rate for 2024
export const IRS_MILEAGE_RATE = 0.67;

export function useMileage() {
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null);
    });
  }, []);
  
  return useQuery({
    queryKey: userId ? queryKeys.mileage(userId) : ['mileage-loading'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data, error } = await supabase
        .from('mileage')
        .select('*')
        .eq('user_id', user.id)
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        queryClient.invalidateQueries({ queryKey: queryKeys.mileage(user.id) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(user.id) });
      }
    },
  });
}

// Calculate total deductible amount
export function calculateMileageDeduction(miles: number): number {
  return miles * IRS_MILEAGE_RATE;
}
