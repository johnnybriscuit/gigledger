/**
 * Hook for managing user subscriptions
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';
import { getSharedUser, getSharedUserId } from '../lib/sharedAuth';
import Constants from 'expo-constants';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || Constants.expoConfig?.extra?.supabaseUrl;

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
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getSharedUserId().then(setUserId);
  }, []);
  
  return useQuery({
    queryKey: userId ? queryKeys.subscription(userId) : ['subscription-loading'],
    queryFn: async () => {
      if (!userId) return null;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no subscription exists, return a default free tier
        if (error.code === 'PGRST116') {
          return {
            tier: 'free' as SubscriptionTier,
            status: 'active' as SubscriptionStatus,
            user_id: userId,
          } as Partial<Subscription>;
        }
        throw error;
      }

      return data as Subscription;
    },
    enabled: !!userId,
  });
}

export function useCreateCheckoutSession() {
  return useMutation({
    mutationFn: async ({ priceId, tier }: { priceId: string; tier: 'monthly' | 'yearly' }) => {
      const user = await getSharedUser();
      if (!user) throw new Error('Not authenticated');

      const url = `${SUPABASE_URL}/functions/v1/create-stripe-checkout`;
      console.log('[Stripe] Creating checkout session at:', url);

      const { data, error } = await supabase.functions.invoke('create-stripe-checkout', {
        body: {
          priceId,
          tier,
        },
      });

      if (error) {
        console.error('[Stripe] Checkout error:', error);
        throw new Error(error.message || 'Failed to create checkout session');
      }

      if (!data?.url) {
        throw new Error('No checkout URL returned');
      }

      return data;
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async () => {
      const user = await getSharedUser();
      if (!user) throw new Error('Not authenticated');

      const url = `${SUPABASE_URL}/functions/v1/create-stripe-portal`;
      console.log('[Stripe] Creating portal session at:', url);

      const { data, error } = await supabase.functions.invoke('create-stripe-portal', {
        body: {},
      });

      if (error) {
        console.error('[Stripe] Portal error:', JSON.stringify(error, null, 2));
        console.error('[Stripe] Portal error context:', error.context);
        throw new Error(error.context?.error || error.message || 'Failed to create portal session');
      }

      console.log('[Stripe] Portal response data:', data);

      if (!data?.url) {
        console.error('[Stripe] No URL in response. Full data:', JSON.stringify(data, null, 2));
        throw new Error('No portal URL returned');
      }

      return data;
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
