/**
 * Hook for managing location history for autocomplete suggestions
 * Tracks frequently used locations to speed up mileage entry
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useUserId } from './useCurrentUser';

export interface LocationHistoryItem {
  id: string;
  user_id: string;
  location: string;
  nickname?: string;
  use_count: number;
  last_used_at: string;
  created_at: string;
}

export interface LocationSuggestion {
  location: string;
  nickname?: string;
  useCount: number;
  displayText: string; // Formatted for display (e.g., "🏠 Home (Nashville, TN)")
}

/**
 * Fetch location history for autocomplete suggestions
 * Returns locations sorted by usage frequency
 */
export function useLocationHistory() {
  const userId = useUserId();

  return useQuery({
    queryKey: queryKeys.locationHistory(userId || ''),
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('location_history' as any)
        .select('*')
        .eq('user_id', userId)
        .order('use_count', { ascending: false })
        .limit(20); // Top 20 most used locations

      if (error) throw error;
      return data as LocationHistoryItem[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes - locations don't change often
  });
}

/**
 * Get location suggestions for autocomplete
 * Combines location history with optional search filtering
 */
export function useLocationSuggestions(searchTerm: string = '') {
  const { data: history = [] } = useLocationHistory();

  // Filter and format suggestions based on search term
  const suggestions: LocationSuggestion[] = history
    .filter(item => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        item.location.toLowerCase().includes(search) ||
        item.nickname?.toLowerCase().includes(search)
      );
    })
    .map(item => ({
      location: item.location,
      nickname: item.nickname,
      useCount: item.use_count,
      displayText: item.nickname
        ? `🏠 ${item.nickname} (${item.location})`
        : `📍 ${item.location}`,
    }))
    .slice(0, 10); // Limit to top 10 suggestions

  return suggestions;
}

/**
 * Update or create location nickname
 */
export function useUpdateLocationNickname() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  return useMutation({
    mutationFn: async ({ location, nickname }: { location: string; nickname: string }) => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('location_history' as any)
        .update({ nickname })
        .eq('user_id', userId)
        .eq('location', location)
        .select()
        .single();

      if (error) throw error;
      return data as LocationHistoryItem;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.locationHistory(userId || '') });
    },
  });
}
