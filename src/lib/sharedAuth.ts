/**
 * Shared Auth Singleton
 * 
 * Problem: Each hook (useGigs, useExpenses, etc.) was calling supabase.auth.getUser()
 * in its own useEffect. When 10 components use these hooks, that's 50+ duplicate auth calls.
 * 
 * Solution: This singleton ensures only ONE auth call happens, no matter how many
 * hooks or components request the userId. All subsequent calls return the cached value.
 * 
 * Usage in hooks:
 * ```typescript
 * import { getSharedUserId } from '../lib/sharedAuth';
 * 
 * export function useGigs() {
 *   const [userId, setUserId] = useState<string | null>(null);
 *   
 *   useEffect(() => {
 *     getSharedUserId().then(setUserId);  // Shared, deduplicated call
 *   }, []);
 *   
 *   return useQuery({...});
 * }
 * ```
 */

import { supabase } from './supabase';

// Cached userId - shared across all hooks
let cachedUserId: string | null = null;

// In-flight auth promise - prevents duplicate requests
let authPromise: Promise<string | null> | null = null;

/**
 * Get the current user's ID with automatic deduplication
 * 
 * - First call: Fetches from Supabase and caches the result
 * - Subsequent calls: Returns cached value immediately
 * - Concurrent calls: Share the same promise (no duplicate requests)
 * 
 * @returns Promise<string | null> - User ID or null if not authenticated
 */
export async function getSharedUserId(): Promise<string | null> {
  // If we already have it cached, return immediately (no network call)
  if (cachedUserId !== null) {
    return cachedUserId;
  }
  
  // If we're already fetching, return the same promise (deduplicate concurrent calls)
  if (authPromise) {
    return authPromise;
  }
  
  // Otherwise, fetch it once and cache the result
  authPromise = supabase.auth.getUser()
    .then(({ data: { user } }) => {
      cachedUserId = user?.id || null;
      authPromise = null; // Clear the in-flight promise
      return cachedUserId;
    })
    .catch((error) => {
      console.error('Shared auth error:', error);
      authPromise = null; // Clear the promise on error
      return null;
    });
  
  return authPromise;
}

/**
 * Clear the cached userId
 * Call this when the user signs out to ensure fresh auth on next login
 */
export function clearSharedUserId() {
  cachedUserId = null;
  authPromise = null;
}

/**
 * Get the cached userId synchronously (if available)
 * Returns null if not yet fetched
 * 
 * @returns string | null - Cached user ID or null
 */
export function getCachedUserId(): string | null {
  return cachedUserId;
}
