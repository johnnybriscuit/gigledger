/**
 * Hook to manually sync subscription from Stripe
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getSharedUser } from '../lib/sharedAuth';

export function useSyncSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const user = await getSharedUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('sync-subscription', {
        body: {},
      });

      if (error) {
        console.error('[Sync] Error:', error);
        throw new Error(error.message || 'Failed to sync subscription');
      }

      return data;
    },
    onSuccess: () => {
      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      queryClient.invalidateQueries({ queryKey: ['entitlements'] });
    },
  });
}
