/**
 * Centralized Entitlements Hook
 * Single source of truth for plan limits, usage, and capabilities
 * 
 * Phase 1: Monetization Plumbing
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';
import { isPro } from '../config/plans';
import type { UserPlan } from '../config/plans';

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
  const [userId, setUserId] = useState<string | null>(null);
  
  // Get userId from auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) {
        setUserId(user.id);
      }
    });
  }, []);

  // Fetch profile (for plan) and usage counts in parallel
  const { data, isLoading } = useQuery({
    queryKey: userId ? ['entitlements', userId] : ['entitlements-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      // Fetch profile for plan
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('plan, invoices_created_count')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Count gigs
      const { count: gigsCount, error: gigsError } = await supabase
        .from('gigs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (gigsError) throw gigsError;

      // Count expenses
      const { count: expensesCount, error: expensesError } = await supabase
        .from('expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (expensesError) throw expensesError;

      return {
        plan: (profile?.plan || 'free') as UserPlan,
        gigsCount: gigsCount ?? 0,
        expensesCount: expensesCount ?? 0,
        invoicesCreatedCount: profile?.invoices_created_count ?? 0,
      };
    },
    enabled: !!userId,
    staleTime: 30000, // 30 seconds - balance freshness with performance
    refetchOnWindowFocus: true,
  });

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
