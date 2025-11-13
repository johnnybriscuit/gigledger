/**
 * React Query hooks for user profile management
 * Provides reliable fetching, updating, and cache invalidation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { ensureProfile, getProfile, updateProfile } from '../lib/profile';
import { queryKeys } from '../lib/queryKeys';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  home_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileUpdateData {
  full_name?: string;
  home_address?: string;
  email?: string;
}

/**
 * Fetch the current user's profile with React Query
 * Automatically revalidates on focus and reconnect
 */
export function useProfile(userId?: string) {
  return useQuery({
    queryKey: userId ? queryKeys.profile(userId) : ['profile-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID provided');
      
      const { data, error } = await getProfile(supabase, userId);
      
      if (error) throw error;
      if (!data) throw new Error('Profile not found');
      
      return data as Profile;
    },
    enabled: !!userId,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Update profile mutation with automatic cache invalidation
 */
export function useUpdateProfile(userId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (updates: ProfileUpdateData) => {
      const { data, error } = await updateProfile(supabase, userId, updates);
      
      if (error) throw error;
      if (!data) throw new Error('Update failed');
      
      return data as Profile;
    },
    onSuccess: (data) => {
      // Immediately update the cache with the new data
      queryClient.setQueryData(queryKeys.profile(userId), data);
      
      // Also invalidate to ensure fresh data on next mount
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
    },
    onError: (error) => {
      console.error('Profile update failed:', error);
    },
  });
}

/**
 * Ensure profile exists for the current user
 * Call this on app boot and auth state changes
 */
export function useEnsureProfile(userId?: string, email?: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('No user ID provided');
      
      const result = await ensureProfile(supabase, userId, email);
      
      if (!result.success) throw result.error;
      
      return result;
    },
    onSuccess: () => {
      // Invalidate profile query to fetch the latest data
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId) });
      }
    },
  });
}
