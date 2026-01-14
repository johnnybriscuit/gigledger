/**
 * Profile utilities for ensuring user profiles exist and are properly managed
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Ensure a profile row exists for the given user
 * Called on auth state change and app boot to prevent update failures
 */
export async function ensureProfile(supabase: SupabaseClient, userId: string, email?: string) {
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert(
        { 
          id: userId,
          email: email || undefined,
        },
        { 
          onConflict: 'id',
          ignoreDuplicates: false, // Allow updates to existing rows
        }
      );
    
    if (error) {
      console.error('ensureProfile error:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (err) {
    console.error('ensureProfile exception:', err);
    return { success: false, error: err };
  }
}

/**
 * Get the current user's profile
 */
export async function getProfile(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('getProfile error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('getProfile exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Update the current user's profile
 */
export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: {
    full_name?: string;
    home_address?: string;
    home_address_full?: string;
    home_address_place_id?: string;
    home_address_lat?: number;
    home_address_lng?: number;
    email?: string;
  }
) {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('updateProfile error:', error);
      return { data: null, error };
    }
    
    return { data, error: null };
  } catch (err) {
    console.error('updateProfile exception:', err);
    return { data: null, error: err };
  }
}

/**
 * Format relative time for "Last saved X ago" display
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  
  return then.toLocaleDateString();
}
