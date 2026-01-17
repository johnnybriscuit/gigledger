export const PLAN_LIMITS = {
  FREE: {
    GIGS_PER_MONTH: 10,
    EXPENSES_PER_MONTH: 10,
    INVOICES_PER_MONTH: 3,
    EXPORTS_PER_MONTH: 2,
  },
  LEGACY_FREE: {
    GIGS_LIFETIME: 20,
    EXPENSES_LIFETIME: 20,
    INVOICES_UNLIMITED: true,
    EXPORTS_UNLIMITED: true,
  },
  PRO: {
    UNLIMITED: true,
  },
} as const;

export const PLAN_NAMES = {
  FREE: 'free',
  LEGACY_FREE: 'legacy_free',
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_yearly',
} as const;

export const PLAN_PRICES = {
  FREE: 0,
  PRO_MONTHLY: 10,
  PRO_ANNUAL: 60,
} as const;

export type PlanName = typeof PLAN_NAMES[keyof typeof PLAN_NAMES];
export type LimitType = 'gigs' | 'expenses' | 'invoices' | 'exports';
