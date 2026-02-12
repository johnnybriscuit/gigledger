import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { TourRun, TourRunInsert, TourRunUpdate, TourWithGigs } from '../types/tours.types';
import { queryKeys } from '../lib/queryKeys';
import { useUserId } from './useCurrentUser';

export function useTours() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: userId ? queryKeys.tours(userId) : ['tours-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tour_runs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as TourRun[];
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
  });
}

export function useTour(tourId: string | undefined) {
  const userId = useUserId();

  return useQuery({
    queryKey: tourId ? ['tour', tourId] : ['tour-loading'],
    queryFn: async () => {
      if (!userId || !tourId) throw new Error('Not authenticated or no tour ID');

      const { data, error } = await supabase
        .from('tour_runs')
        .select(`
          *,
          gigs(
            id,
            date,
            title,
            location,
            gross_amount,
            tips,
            per_diem,
            other_income,
            fees,
            payer:payers(id, name)
          ),
          settlements(*),
          tour_expenses:expenses!expenses_tour_id_fkey(
            id,
            amount,
            category,
            description,
            allocation_mode,
            allocation_json
          )
        `)
        .eq('id', tourId)
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return data as TourWithGigs;
    },
    enabled: !!userId && !!tourId,
  });
}

export function useCreateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tour: Omit<TourRunInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tour_runs')
        .insert({ ...tour, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as TourRun;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      queryClient.invalidateQueries({ queryKey: ['tour', data.id] });
    },
  });
}

export function useUpdateTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, updates }: { tourId: string; updates: TourRunUpdate }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('tour_runs')
        .update(updates)
        .eq('id', tourId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;
      return data as TourRun;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      queryClient.invalidateQueries({ queryKey: ['tour', data.id] });
    },
  });
}

export function useDeleteTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (tourId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('tour_runs')
        .delete()
        .eq('id', tourId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
}

export function useAddGigsToTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ tourId, gigIds }: { tourId: string; gigIds: string[] }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('gigs')
        .update({ tour_id: tourId })
        .in('id', gigIds)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      queryClient.invalidateQueries({ queryKey: ['tour', variables.tourId] });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
}

export function useRemoveGigFromTour() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ gigId, tourId }: { gigId: string; tourId?: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('gigs')
        .update({ tour_id: null })
        .eq('id', gigId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tours'] });
      if (variables.tourId) {
        queryClient.invalidateQueries({ queryKey: ['tour', variables.tourId] });
      }
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
}
