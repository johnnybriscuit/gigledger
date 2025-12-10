/**
 * Unified hook for plan limits and subscription status
 * 
 * This hook provides a single source of truth for:
 * - User's current subscription tier (free, monthly, yearly)
 * - Usage limits (gigs, expenses)
 * - Whether limits have been reached
 * 
 * It uses the subscriptions table (same as SubscriptionScreen) to ensure
 * consistency across the app, preventing the bug where GigsScreen showed
 * "free plan" even though the user had an active paid subscription.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';
import type { SubscriptionTier, SubscriptionStatus } from './useSubscription';

// Plan limits configuration
// Free plan: 20 gigs, 20 expenses
// Paid plans (monthly/yearly): No practical limit (set to 10,000 as safety cap)
export const PLAN_LIMITS = {
  free: {
    maxGigs: 20,
    maxExpenses: 20,
  },
  paid: {
    maxGigs: 10000,
    maxExpenses: 10000,
  },
} as const;

export interface PlanLimits {
  // Subscription info
  tier: SubscriptionTier;
  status: SubscriptionStatus | null;
  isFreePlan: boolean;
  isPaidPlan: boolean;
  isActive: boolean;
  
  // Gig limits
  maxGigs: number;
  gigCount: number;
  hasReachedGigLimit: boolean;
  gigsRemaining: number;
  
  // Expense limits
  maxExpenses: number;
  expenseCount: number;
  hasReachedExpenseLimit: boolean;
  expensesRemaining: number;
  
  // Loading states
  isLoading: boolean;
  userId: string | null;
}

export function usePlanLimits(gigCount: number = 0, expenseCount: number = 0): PlanLimits {
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get userId from auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        setUserId(user.id);
      } else {
        console.warn('[usePlanLimits] User ID is undefined - cannot fetch subscription');
      }
    });
  }, []);
  
  // Fetch subscription from the subscriptions table (same source as SubscriptionScreen)
  const { data: subscription, isLoading } = useQuery({
    queryKey: userId ? queryKeys.subscription(userId) : ['subscription-loading'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.warn('[usePlanLimits] No authenticated user found');
        return null;
      }

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no subscription exists (PGRST116 = no rows), user is on free plan
        if (error.code === 'PGRST116') {
          console.log('[usePlanLimits] No subscription found - defaulting to free plan');
          return {
            tier: 'free' as SubscriptionTier,
            status: 'active' as SubscriptionStatus,
            user_id: user.id,
          };
        }
        console.error('[usePlanLimits] Error fetching subscription:', error);
        throw error;
      }

      console.log('[usePlanLimits] Subscription found:', {
        tier: data.tier,
        status: data.status,
      });
      
      return data;
    },
    enabled: !!userId, // Only run query when we have a userId
    staleTime: 0, // Always fetch fresh to avoid caching subscription status
    refetchOnWindowFocus: true, // Refetch when user returns to tab
  });

  // Determine plan tier and status
  const tier = subscription?.tier || 'free';
  const status = subscription?.status || null;
  const isActive = status === 'active' || status === 'trialing';
  const isPaidPlan = isActive && (tier === 'monthly' || tier === 'yearly');
  const isFreePlan = !isPaidPlan;

  // Calculate limits based on plan
  const maxGigs = isFreePlan ? PLAN_LIMITS.free.maxGigs : PLAN_LIMITS.paid.maxGigs;
  const maxExpenses = isFreePlan ? PLAN_LIMITS.free.maxExpenses : PLAN_LIMITS.paid.maxExpenses;

  // Calculate usage
  const hasReachedGigLimit = isFreePlan && gigCount >= maxGigs;
  const hasReachedExpenseLimit = isFreePlan && expenseCount >= maxExpenses;
  const gigsRemaining = Math.max(0, maxGigs - gigCount);
  const expensesRemaining = Math.max(0, maxExpenses - expenseCount);

  // Debug logging (matches the format from GigsScreen)
  console.log('=== GigLedger Plan Debug ===');
  console.log('User ID:', userId);
  console.log('Plan from DB:', subscription?.tier);
  console.log('Status from DB:', subscription?.status);
  console.log('Resolved userPlan:', tier);
  console.log('Is free plan?:', isFreePlan);
  console.log('Is paid plan?:', isPaidPlan);
  console.log('Gig count:', gigCount);
  console.log('Max gigs:', maxGigs);
  console.log('Has reached gig limit?:', hasReachedGigLimit);
  console.log('Expense count:', expenseCount);
  console.log('Max expenses:', maxExpenses);
  console.log('Has reached expense limit?:', hasReachedExpenseLimit);
  console.log('===========================');

  return {
    // Subscription info
    tier,
    status,
    isFreePlan,
    isPaidPlan,
    isActive,
    
    // Gig limits
    maxGigs,
    gigCount,
    hasReachedGigLimit,
    gigsRemaining,
    
    // Expense limits
    maxExpenses,
    expenseCount,
    hasReachedExpenseLimit,
    expensesRemaining,
    
    // Loading states
    isLoading,
    userId,
  };
}
