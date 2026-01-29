/**
 * Hooks for managing saved mileage routes
 * Enables quick route selection and reuse for common trips
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useUserId } from './useCurrentUser';

export interface SavedRoute {
  id: string;
  user_id: string;
  name: string;
  start_location: string;
  end_location: string;
  distance_miles: number;
  default_purpose?: string;
  is_favorite: boolean;
  use_count: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSavedRouteInput {
  name: string;
  start_location: string;
  end_location: string;
  distance_miles: number;
  default_purpose?: string;
  is_favorite?: boolean;
}

/**
 * Fetch all saved routes for the current user
 * Sorted by usage frequency (most used first)
 */
export function useSavedRoutes() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.savedRoutes(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_routes' as any)
        .select('*')
        .eq('user_id', userId)
        .order('use_count', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SavedRoute[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 1 minute
  });
}

/**
 * Fetch only favorite routes for quick access
 */
export function useFavoriteRoutes() {
  const userId = useUserId();

  return useQuery({
    queryKey: [...queryKeys.savedRoutes(userId || ''), 'favorites'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_routes' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('is_favorite', true)
        .order('use_count', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SavedRoute[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });
}

/**
 * Create a new saved route
 */
export function useCreateSavedRoute() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async (input: CreateSavedRouteInput) => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('saved_routes' as any)
        .insert({
          user_id: userId,
          ...input,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedRoutes(userId || '') });
    },
  });
}

/**
 * Update an existing saved route
 */
export function useUpdateSavedRoute() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<SavedRoute> }) => {
      const { data, error } = await supabase
        .from('saved_routes' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedRoutes(userId || '') });
    },
  });
}

/**
 * Delete a saved route
 */
export function useDeleteSavedRoute() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('saved_routes' as any)
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedRoutes(userId || '') });
    },
  });
}

/**
 * Toggle favorite status of a route
 */
export function useToggleFavoriteRoute() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({ id, isFavorite }: { id: string; isFavorite: boolean }) => {
      const { data, error } = await supabase
        .from('saved_routes' as any)
        .update({ is_favorite: isFavorite })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as SavedRoute;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.savedRoutes(userId || '') });
    },
  });
}
