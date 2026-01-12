/**
 * Centralized plan limits and usage checking
 * Server-side helper to enforce free plan limits across all creation paths
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type PlanId = 'free' | 'monthly' | 'yearly';

export interface PlanLimits {
  maxGigs: number | null;      // null = unlimited
  maxExpenses: number | null;
}

export const PLAN_LIMITS: Record<PlanId, PlanLimits> = {
  free: { maxGigs: 20, maxExpenses: 20 },
  monthly: { maxGigs: null, maxExpenses: null },
  yearly: { maxGigs: null, maxExpenses: null },
};

export interface UsageSnapshot {
  gigCount: number;
  expenseCount: number;
}

export interface PlanCheckResult {
  plan: PlanId;
  usage: UsageSnapshot;
  canCreateGigs: boolean;
  canCreateExpenses: boolean;
  gigLimit: number | null;
  expenseLimit: number | null;
  isFreePlan: boolean;
}

export interface PlanCheckError {
  code: 'GIG_LIMIT_REACHED' | 'EXPENSE_LIMIT_REACHED';
  message: string;
  limit: number;
  current: number;
}

/**
 * Get user's plan and current usage
 * This is the single source of truth for plan enforcement
 */
export async function getPlanAndUsage(
  supabase: SupabaseClient,
  userId: string
): Promise<PlanCheckResult> {
  // 1. Get user's subscription tier (default to 'free' if no subscription)
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .single();

  let plan: PlanId = 'free';
  
  if (!subError && subscription) {
    // User has active subscription
    const isActive = subscription.status === 'active' || subscription.status === 'trialing';
    if (isActive && (subscription.tier === 'monthly' || subscription.tier === 'yearly')) {
      plan = subscription.tier;
    }
  }

  // 2. Count user's gigs
  const { count: gigCount, error: gigError } = await supabase
    .from('gigs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (gigError) {
    console.error('[getPlanAndUsage] Error counting gigs:', gigError);
    throw new Error(`Failed to count gigs: ${gigError.message}`);
  }

  // 3. Count user's expenses
  const { count: expenseCount, error: expenseError } = await supabase
    .from('expenses')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (expenseError) {
    console.error('[getPlanAndUsage] Error counting expenses:', expenseError);
    throw new Error(`Failed to count expenses: ${expenseError.message}`);
  }

  // 4. Get limits for this plan
  const limits = PLAN_LIMITS[plan];
  const isFreePlan = plan === 'free';

  // 5. Check if user can create more
  const canCreateGigs = limits.maxGigs === null || (gigCount ?? 0) < limits.maxGigs;
  const canCreateExpenses = limits.maxExpenses === null || (expenseCount ?? 0) < limits.maxExpenses;

  return {
    plan,
    usage: {
      gigCount: gigCount ?? 0,
      expenseCount: expenseCount ?? 0,
    },
    canCreateGigs,
    canCreateExpenses,
    gigLimit: limits.maxGigs,
    expenseLimit: limits.maxExpenses,
    isFreePlan,
  };
}

/**
 * Check if user can create N gigs (for batch imports)
 */
export function canCreateGigBatch(
  planCheck: PlanCheckResult,
  batchSize: number
): { allowed: boolean; error?: PlanCheckError } {
  if (!planCheck.isFreePlan) {
    return { allowed: true };
  }

  const projectedTotal = planCheck.usage.gigCount + batchSize;
  
  if (planCheck.gigLimit !== null && projectedTotal > planCheck.gigLimit) {
    return {
      allowed: false,
      error: {
        code: 'GIG_LIMIT_REACHED',
        message: `You've reached the Free plan limit. Upgrade to Pro to unlock unlimited gigs, expenses, invoices, and exports. Cancel anytime. Your data stays yours.`,
        limit: planCheck.gigLimit,
        current: planCheck.usage.gigCount,
      },
    };
  }

  return { allowed: true };
}

/**
 * Check if user can create N expenses (for batch imports)
 */
export function canCreateExpenseBatch(
  planCheck: PlanCheckResult,
  batchSize: number
): { allowed: boolean; error?: PlanCheckError } {
  if (!planCheck.isFreePlan) {
    return { allowed: true };
  }

  const projectedTotal = planCheck.usage.expenseCount + batchSize;
  
  if (planCheck.expenseLimit !== null && projectedTotal > planCheck.expenseLimit) {
    return {
      allowed: false,
      error: {
        code: 'EXPENSE_LIMIT_REACHED',
        message: `You've reached the Free plan limit. Upgrade to Pro to unlock unlimited gigs, expenses, invoices, and exports. Cancel anytime. Your data stays yours.`,
        limit: planCheck.expenseLimit,
        current: planCheck.usage.expenseCount,
      },
    };
  }

  return { allowed: true };
}

/**
 * Create a plan limit error for gigs
 */
export function createGigLimitError(planCheck: PlanCheckResult): Error {
  const error: any = new Error(
    `You've reached the Free plan limit of ${planCheck.gigLimit} gigs. Upgrade to Pro to unlock unlimited gigs, expenses, invoices, and exports. Cancel anytime. Your data stays yours.`
  );
  error.code = 'GIG_LIMIT_REACHED';
  error.limit = planCheck.gigLimit;
  error.current = planCheck.usage.gigCount;
  return error;
}

/**
 * Create a plan limit error for expenses
 */
export function createExpenseLimitError(planCheck: PlanCheckResult): Error {
  const error: any = new Error(
    `You've reached the Free plan limit of ${planCheck.expenseLimit} expenses. Upgrade to Pro to unlock unlimited gigs, expenses, invoices, and exports. Cancel anytime. Your data stays yours.`
  );
  error.code = 'EXPENSE_LIMIT_REACHED';
  error.limit = planCheck.expenseLimit;
  error.current = planCheck.usage.expenseCount;
  return error;
}
