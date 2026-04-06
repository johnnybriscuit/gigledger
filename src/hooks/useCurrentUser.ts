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

  // Fetch session user and cache result
  userPromise = supabase.auth.getSession()
    .then(({ data: { session }, error }) => {
      if (error) {
        console.warn('[useCurrentUser] getSession error:', error.message);
        cachedUser = null;
        return null;
      }

      const user = session?.user ?? null;
      cachedUser = user;
      return user;
    })
    .catch((error) => {
      console.error('[useCurrentUser] getSession exception:', error);
      cachedUser = null;
      return null;
    })
    .finally(() => {
      userPromise = null;
    });

  return userPromise;
}

async function refreshCurrentUser(): Promise<User | null> {
  cachedUser = undefined;
  userPromise = null;
  return getCurrentUser();
}

/**
 * Hook to get current user
 * Uses global cache to prevent redundant auth calls
 */
export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(cachedUser ?? null);
  const [isLoading, setIsLoading] = useState(cachedUser === undefined || cachedUser === null);

  useEffect(() => {
    let mounted = true;

    // Always re-sync from session on mount to avoid stale null/non-null cache.
    // This prevents queries from staying disabled after auth state transitions.
    setIsLoading(cachedUser === null || cachedUser === undefined);
    refreshCurrentUser()
      .then((nextUser: User | null) => {
        if (!mounted) return;
        setUser(nextUser);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedUser = session?.user ?? null;
      userPromise = null;
      setUser(cachedUser);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
