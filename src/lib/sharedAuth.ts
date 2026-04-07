import { supabase } from './supabase';
import type { User } from '@supabase/supabase-js';

let cachedUser: User | null | undefined = undefined;
let authPromise: Promise<User | null> | null = null;

/**
 * Shared, deduplicated user lookup.
 */
export async function getSharedUser(): Promise<User | null> {
  if (cachedUser !== undefined) {
    return cachedUser;
  }

  if (authPromise) {
    return authPromise;
  }

  authPromise = supabase.auth
    .getUser()
    .then(({ data: { user } }) => {
      cachedUser = user ?? null;
      authPromise = null;
      return cachedUser;
    })
    .catch((error) => {
      console.error('[sharedAuth] getUser failed:', error);
      cachedUser = null;
      authPromise = null;
      return null;
    });

  return authPromise;
}

/**
 * Get the current user's ID with automatic deduplication.
 */
export async function getSharedUserId(): Promise<string | null> {
  const user = await getSharedUser();
  return user?.id ?? null;
}

export function getCachedUser(): User | null | undefined {
  return cachedUser;
}

/**
 * Get the cached userId synchronously when available.
 */
export function getCachedUserId(): string | null {
  return cachedUser?.id ?? null;
}

/**
 * Clear the shared auth cache after sign out or auth failures.
 */
export function clearSharedUserId() {
  cachedUser = undefined;
  authPromise = null;
}

export function clearSharedUser() {
  clearSharedUserId();
}

/**
 * Sync the cache with the latest authenticated user.
 */
export function syncSharedUser(user: User | null) {
  cachedUser = user;
  authPromise = null;
}

/**
 * Backwards-compatible id-only cache sync for existing callers.
 */
export function syncSharedUserId(userId: string | null) {
  if (!userId) {
    cachedUser = null;
    authPromise = null;
    return;
  }

  cachedUser = cachedUser?.id === userId ? cachedUser : ({ id: userId } as User);
  authPromise = null;
}
