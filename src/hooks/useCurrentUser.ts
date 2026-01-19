import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

// Global cache for user to prevent multiple auth calls
let cachedUser: User | null | undefined = undefined;
let userPromise: Promise<User | null> | null = null;

/**
 * Get current user with global caching to prevent duplicate auth calls
 * This is synchronous after first load to prevent blocking other queries
 */
async function getCurrentUser(): Promise<User | null> {
  // Return cached user if available
  if (cachedUser !== undefined) {
    return cachedUser;
  }

  // If already fetching, return the same promise
  if (userPromise) {
    return userPromise;
  }

  // Fetch user and cache result
  userPromise = supabase.auth.getUser().then(({ data: { user } }) => {
    cachedUser = user;
    userPromise = null;
    return user;
  });

  return userPromise;
}

/**
 * Hook to get current user
 * Uses global cache to prevent redundant auth calls
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(cachedUser ?? null);
  const [isLoading, setIsLoading] = useState(cachedUser === undefined);

  useEffect(() => {
    if (cachedUser !== undefined) {
      setUser(cachedUser);
      setIsLoading(false);
      return;
    }

    getCurrentUser().then((u) => {
      setUser(u);
      setIsLoading(false);
    });
  }, []);

  return { data: user, isLoading };
}

/**
 * Get just the user ID (most common use case)
 * Returns null while loading to allow queries to be enabled/disabled properly
 */
export function useUserId(): string | null {
  const { data: user } = useCurrentUser();
  return user?.id || null;
}
