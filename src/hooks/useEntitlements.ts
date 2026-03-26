/**
 * Centralized Entitlements Hook
 * Single source of truth for plan limits, usage, and capabilities
 * 
 * Phase 1: Monetization Plumbing
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import {
  getPlanDefinition,
  normalizePlan,
  type PlanDefinition,
  type UserPlan,
} from '../config/plans';
import { useUserId } from './useCurrentUser';

export interface EntitlementsLimits {
  gigsMax: number | null;      // null = unlimited
  expensesMax: number | null;
  invoicesMax: number | null;
  exportsMax: number | null;
}

export interface EntitlementsUsage {
  gigsCount: number;
  expensesCount: number;
  invoicesCreatedCount: number;
  exportsCount: number;
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
  exportsRemaining: number | null;
}

export interface Entitlements {
  normalizedPlan: PlanDefinition['id'];
  plan: UserPlan;
  definition: PlanDefinition;
  isPro: boolean;
  isLegacyFree: boolean;
  limits: EntitlementsLimits;
  usage: EntitlementsUsage;
  can: EntitlementsCapabilities;
  remaining: EntitlementsRemaining;
  resetDate: Date | null;
  isLoading: boolean;
}

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
      const profileResult = await supabase
        .from('profiles')
        .select(`
          plan,
          legacy_free_plan,
          gigs_used_this_month,
          expenses_used_this_month,
          invoices_used_this_month,
          exports_used_this_month,
          usage_period_start
        `)
        .eq('id', userId)
        .single();

      if (profileResult.error) {
        console.error('🔴 [useEntitlements] Profile fetch error:', profileResult.error);
        throw profileResult.error;
      }
      const profile = profileResult.data;
      const normalizedPlan = normalizePlan(profile?.plan, profile?.legacy_free_plan === true);

      console.log('🔵 [useEntitlements] Fetched successfully:', {
        plan: normalizedPlan,
        gigsCount: profile?.gigs_used_this_month,
        expensesCount: profile?.expenses_used_this_month,
        invoicesCreatedCount: profile?.invoices_used_this_month,
        exportsCount: profile?.exports_used_this_month,
      });

      return {
        plan: normalizedPlan === 'legacy_free' ? 'free' : (normalizedPlan as UserPlan),
        normalizedPlan,
        legacyFreePlan: profile?.legacy_free_plan === true,
        gigsCount: profile?.legacy_free_plan ? null : (profile?.gigs_used_this_month ?? 0),
        expensesCount: profile?.legacy_free_plan ? null : (profile?.expenses_used_this_month ?? 0),
        invoicesCreatedCount: profile?.legacy_free_plan ? null : (profile?.invoices_used_this_month ?? 0),
        exportsCount: profile?.legacy_free_plan ? null : (profile?.exports_used_this_month ?? 0),
        usagePeriodStart: profile?.usage_period_start ?? null,
      };
    },
    enabled: !!userId,
    staleTime: 60000, // 60 seconds - entitlements don't change frequently
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
    placeholderData: (previousData) => previousData, // Prevent UI flash during refetch
    refetchOnWindowFocus: false, // Don't refetch on window focus
    // refetchOnMount defaults to true, which respects staleTime
    retry: 1, // Reduce retries for faster failure
    retryDelay: 500, // Faster retry
  });

  // Log errors
  if (error) {
    console.error('🔴 [useEntitlements] Query error:', error);
  }

  // Default values while loading
  const normalizedPlan = data?.normalizedPlan ?? 'free';
  const definition = getPlanDefinition(normalizedPlan, normalizedPlan === 'legacy_free');
  const isLegacyFree = normalizedPlan === 'legacy_free';
  const plan: UserPlan = data?.plan || 'free';
  const isProPlan = definition.isPaid;
  const limits: EntitlementsLimits = {
    gigsMax: definition.usage.gigs.limit,
    expensesMax: definition.usage.expenses.limit,
    invoicesMax: definition.usage.invoices.limit,
    exportsMax: definition.usage.exports.limit,
  };
  
  const usage: EntitlementsUsage = {
    gigsCount: data?.gigsCount ?? 0,
    expensesCount: data?.expensesCount ?? 0,
    invoicesCreatedCount: data?.invoicesCreatedCount ?? 0,
    exportsCount: data?.exportsCount ?? 0,
  };

  // Calculate capabilities
  const canCreateGig = limits.gigsMax === null || usage.gigsCount < limits.gigsMax;
  const canCreateExpense = limits.expensesMax === null || usage.expensesCount < limits.expensesMax;
  const canCreateInvoice = limits.invoicesMax === null || usage.invoicesCreatedCount < limits.invoicesMax;
  const canExport = limits.exportsMax === null || usage.exportsCount < limits.exportsMax;

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
    exportsRemaining: limits.exportsMax === null ? null : Math.max(0, limits.exportsMax - usage.exportsCount),
  };

  const resetDate = isLegacyFree ? null : getNextResetDate(data?.usagePeriodStart ?? null);

  return {
    normalizedPlan,
    plan,
    definition,
    isPro: isProPlan,
    isLegacyFree,
    limits,
    usage,
    can,
    remaining,
    resetDate,
    isLoading,
  };
}

function getNextResetDate(usagePeriodStart: string | null): Date | null {
  if (!usagePeriodStart) {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth() + 1, 1);
  }

  const start = new Date(usagePeriodStart);
  return new Date(start.getFullYear(), start.getMonth() + 1, 1);
}
