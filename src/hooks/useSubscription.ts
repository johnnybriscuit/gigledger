/**
 * Hook for managing user subscriptions
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type SubscriptionTier = 'free' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no subscription exists, return a default free tier
        if (error.code === 'PGRST116') {
          return {
            tier: 'free' as SubscriptionTier,
            status: 'active' as SubscriptionStatus,
            user_id: user.id,
          } as Partial<Subscription>;
        }
        throw error;
      }

      return data as Subscription;
    },
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async ({ priceId, tier }: { priceId: string; tier: 'monthly' | 'yearly' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          userEmail: user.email,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      return response.json();
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const response = await fetch('/api/create-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create portal session');
      }

      return response.json();
    },
  });
}

export function useHasActiveSubscription() {
  const { data: subscription } = useSubscription();
  
  if (!subscription) return false;
  
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const isPaid = subscription.tier === 'monthly' || subscription.tier === 'yearly';
  
  return isActive && isPaid;
}
