import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useUserId } from './useCurrentUser';
import { getCachedUserId, getSharedUser } from '../lib/sharedAuth';
import { generateShareToken, buildShareUrl } from '../utils/shareToken';

export interface SharedScheduleLink {
  id: string;
  user_id: string;
  token: string;
  display_name: string | null;
  show_amounts: boolean;
  show_venues: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  last_accessed: string | null;
  access_count: number;
}

export interface CreateShareLinkOptions {
  displayName?: string;
  showAmounts?: boolean;
  showVenues?: boolean;
  expiresAt?: string | null;
}

export interface UpdateShareLinkOptions {
  displayName?: string;
  showAmounts?: boolean;
  showVenues?: boolean;
  expiresAt?: string | null;
}

export function useSharedSchedule() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: userId ? queryKeys.sharedSchedule(userId) : ['sharedSchedule-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await (supabase as any)
        .from('shared_schedule_links')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as SharedScheduleLink | null;
    },
    enabled: !!userId,
  });

  const shareLink = query.data ?? null;
  const shareUrl = shareLink ? buildShareUrl(shareLink.token) : null;

  const createShareLink = useMutation({
    mutationFn: async (options: CreateShareLinkOptions = {}) => {
      const user = await getSharedUser();
      if (!user) throw new Error('Not authenticated');

      const token = generateShareToken();

      const { data, error } = await (supabase as any)
        .from('shared_schedule_links')
        .insert({
          user_id: user.id,
          token,
          display_name: options.displayName ?? null,
          show_amounts: options.showAmounts ?? true,
          show_venues: options.showVenues ?? true,
          expires_at: options.expiresAt ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as SharedScheduleLink;
    },
    onSuccess: () => {
      const uid = getCachedUserId();
      if (uid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sharedSchedule(uid) });
      }
    },
  });

  const updateShareLink = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateShareLinkOptions }) => {
      const payload: Record<string, unknown> = {};
      if (updates.displayName !== undefined) payload.display_name = updates.displayName;
      if (updates.showAmounts !== undefined) payload.show_amounts = updates.showAmounts;
      if (updates.showVenues !== undefined) payload.show_venues = updates.showVenues;
      if (updates.expiresAt !== undefined) payload.expires_at = updates.expiresAt;

      const { data, error } = await (supabase as any)
        .from('shared_schedule_links')
        .update(payload)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as SharedScheduleLink;
    },
    onSuccess: () => {
      const uid = getCachedUserId();
      if (uid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sharedSchedule(uid) });
      }
    },
  });

  const revokeShareLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('shared_schedule_links')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      const uid = getCachedUserId();
      if (uid) {
        queryClient.invalidateQueries({ queryKey: queryKeys.sharedSchedule(uid) });
      }
    },
  });

  return {
    shareLink,
    isLoading: query.isLoading,
    shareUrl,
    createShareLink: (options?: CreateShareLinkOptions) =>
      createShareLink.mutateAsync(options ?? {}),
    updateShareLink: (id: string, updates: UpdateShareLinkOptions) =>
      updateShareLink.mutateAsync({ id, updates }),
    revokeShareLink: (id: string) => revokeShareLink.mutateAsync(id),
  };
}
