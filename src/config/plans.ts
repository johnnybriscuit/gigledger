/**
 * Plan configuration and limits for GigLedger
 */

export type UserPlan = 'free' | 'pro_monthly' | 'pro_yearly';

export const FREE_GIG_LIMIT = 20;

export const PLAN_FEATURES = {
  free: {
    gigLimit: FREE_GIG_LIMIT,
    canExport: false,
    name: 'Free',
    description: 'Track up to 20 gigs',
  },
  pro_monthly: {
    gigLimit: Infinity,
    canExport: true,
    name: 'Pro Monthly',
    description: 'Unlimited gigs + exports',
  },
  pro_yearly: {
    gigLimit: Infinity,
    canExport: true,
    name: 'Pro Yearly',
    description: 'Unlimited gigs + exports',
  },
} as const;

export function isPro(plan: UserPlan | null | undefined): boolean {
  return plan === 'pro_monthly' || plan === 'pro_yearly';
}

export function canExport(plan: UserPlan | null | undefined): boolean {
  if (!plan) return false;
  return PLAN_FEATURES[plan].canExport;
}

export function getGigLimit(plan: UserPlan | null | undefined): number {
  if (!plan) return FREE_GIG_LIMIT;
  return PLAN_FEATURES[plan].gigLimit;
}
