import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

/**
 * Shared hook for getting current user
 * Caches user data to prevent redundant auth calls across components
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current_user'],
    queryFn: async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - user doesn't change often
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
  });
}

/**
 * Get just the user ID (most common use case)
 */
export function useUserId(): string | null {
  const { data: user } = useCurrentUser();
  return user?.id || null;
}
