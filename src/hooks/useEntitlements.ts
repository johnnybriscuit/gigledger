/**
 * Centralized Entitlements Hook
 * Single source of truth for plan limits, usage, and capabilities
 * 
 * Phase 1: Monetization Plumbing
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { isPro } from '../config/plans';
import type { UserPlan } from '../config/plans';
import { useUserId } from './useCurrentUser';

export interface EntitlementsLimits {
  gigsMax: number | null;      // null = unlimited
  expensesMax: number | null;
  invoicesMax: number | null;
}

export interface EntitlementsUsage {
  gigsCount: number;
  expensesCount: number;
  invoicesCreatedCount: number;
}

export interface EntitlementsCapabilities {
  createGig: boolean;
  createExpense: boolean;
  createInvoice: boolean;
  exportData: boolean;
}

export interface EntitlementsRemaining {
  gigsRemaining: number | null;      // null = unlimited
  expensesRemaining: number | null;
  invoicesRemaining: number | null;
}

export interface Entitlements {
  plan: UserPlan;
  isPro: boolean;
  limits: EntitlementsLimits;
  usage: EntitlementsUsage;
  can: EntitlementsCapabilities;
  remaining: EntitlementsRemaining;
  isLoading: boolean;
}

const FREE_LIMITS: EntitlementsLimits = {
  gigsMax: 20,
  expensesMax: 20,
  invoicesMax: 3,  // Lifetime cap for Free plan
};

const PRO_LIMITS: EntitlementsLimits = {
  gigsMax: null,
  expensesMax: null,
  invoicesMax: null,
};

/**
 * Get user's entitlements based on their plan
 * This is the single source of truth for all plan enforcement
 */
export function useEntitlements(): Entitlements {
  const userId = useUserId();

  // Fetch profile (for plan) and usage counts in parallel
  const { data, isLoading, error } = useQuery({
    queryKey: userId ? ['entitlements', userId] : ['entitlements-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      console.log('🔵 [useEntitlements] Fetching entitlements for user:', userId);

      // Fetch all data in parallel for better performance
      const [profileResult, gigsResult, expensesResult, invoicesResult] = await Promise.all([
        supabase.from('profiles').select('plan').eq('id', userId).single(),
        supabase.from('gigs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('expenses').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ]);

      // Check for errors
      if (profileResult.error) {
        console.error('🔴 [useEntitlements] Profile fetch error:', profileResult.error);
        throw profileResult.error;
      }
      if (gigsResult.error) {
        console.error('🔴 [useEntitlements] Gigs count error:', gigsResult.error);
        throw gigsResult.error;
      }
      if (expensesResult.error) {
        console.error('🔴 [useEntitlements] Expenses count error:', expensesResult.error);
        throw expensesResult.error;
      }
      if (invoicesResult.error) {
        console.error('🔴 [useEntitlements] Invoices count error:', invoicesResult.error);
        throw invoicesResult.error;
      }

      const profile = profileResult.data;
      const gigsCount = gigsResult.count;
      const expensesCount = expensesResult.count;
      const invoicesCount = invoicesResult.count;

      console.log('🔵 [useEntitlements] Fetched successfully:', {
        plan: profile?.plan,
        gigsCount,
        expensesCount,
        invoicesCreatedCount: invoicesCount,
      });

      return {
        plan: (profile?.plan || 'free') as UserPlan,
        gigsCount: gigsCount ?? 0,
        expensesCount: expensesCount ?? 0,
        invoicesCreatedCount: invoicesCount ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 60000, // 60 seconds - entitlements don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    placeholderData: (previousData) => previousData, // Prevent UI flash during refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnMount: false, // Don't refetch if we have fresh cached data
    retry: 1, // Reduce retries for faster failure
    retryDelay: 500, // Faster retry
  });

  // Log errors
  if (error) {
    console.error('🔴 [useEntitlements] Query error:', error);
  }

  // Default values while loading
  const plan: UserPlan = data?.plan || 'free';
  const isProPlan = isPro(plan);
  const limits = isProPlan ? PRO_LIMITS : FREE_LIMITS;
  
  const usage: EntitlementsUsage = {
    gigsCount: data?.gigsCount ?? 0,
    expensesCount: data?.expensesCount ?? 0,
    invoicesCreatedCount: data?.invoicesCreatedCount ?? 0,
  };

  // Calculate capabilities
  const canCreateGig = limits.gigsMax === null || usage.gigsCount < limits.gigsMax;
  const canCreateExpense = limits.expensesMax === null || usage.expensesCount < limits.expensesMax;
  const canCreateInvoice = limits.invoicesMax === null || usage.invoicesCreatedCount < limits.invoicesMax;
  const canExport = isProPlan;

  const can: EntitlementsCapabilities = {
    createGig: canCreateGig,
    createExpense: canCreateExpense,
    createInvoice: canCreateInvoice,
    exportData: canExport,
  };

  // Calculate remaining
  const remaining: EntitlementsRemaining = {
    gigsRemaining: limits.gigsMax === null ? null : Math.max(0, limits.gigsMax - usage.gigsCount),
    expensesRemaining: limits.expensesMax === null ? null : Math.max(0, limits.expensesMax - usage.expensesCount),
    invoicesRemaining: limits.invoicesMax === null ? null : Math.max(0, limits.invoicesMax - usage.invoicesCreatedCount),
  };

  return {
    plan,
    isPro: isProPlan,
    limits,
    usage,
    can,
    remaining,
    isLoading,
  };
}
