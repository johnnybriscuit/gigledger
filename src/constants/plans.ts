export const PLAN_NAMES = {
  FREE: 'free',
  LEGACY_FREE: 'legacy_free',
  PRO_MONTHLY: 'pro_monthly',
  PRO_ANNUAL: 'pro_yearly',
} as const;

export type PlanName = typeof PLAN_NAMES[keyof typeof PLAN_NAMES];
export type UserPlan = Exclude<PlanName, typeof PLAN_NAMES.LEGACY_FREE>;
export type LimitType = 'gigs' | 'expenses' | 'invoices' | 'exports';

export interface PlanDefinition {
  id: PlanName;
  label: string;
  description: string;
  isPaid: boolean;
  allowsExports: boolean;
  usage: {
    gigs: { limit: number | null; period: 'month' | 'lifetime' };
    expenses: { limit: number | null; period: 'month' | 'lifetime' };
    invoices: { limit: number | null; period: 'month' | 'lifetime' };
    exports: { limit: number | null; period: 'month' | 'lifetime' };
  };
}

export const PLAN_DEFINITIONS: Record<PlanName, PlanDefinition> = {
  [PLAN_NAMES.FREE]: {
    id: PLAN_NAMES.FREE,
    label: 'Free',
    description: 'Monthly limits for core tracking and exports.',
    isPaid: false,
    allowsExports: false,
    usage: {
      gigs: { limit: 7, period: 'month' },
      expenses: { limit: 7, period: 'month' },
      invoices: { limit: 3, period: 'month' },
      exports: { limit: 2, period: 'month' },
    },
  },
  [PLAN_NAMES.LEGACY_FREE]: {
    id: PLAN_NAMES.LEGACY_FREE,
    label: 'Legacy Free',
    description: 'Grandfathered lifetime tracking limits with unlimited exports.',
    isPaid: false,
    allowsExports: true,
    usage: {
      gigs: { limit: 20, period: 'lifetime' },
      expenses: { limit: 20, period: 'lifetime' },
      invoices: { limit: null, period: 'lifetime' },
      exports: { limit: null, period: 'lifetime' },
    },
  },
  [PLAN_NAMES.PRO_MONTHLY]: {
    id: PLAN_NAMES.PRO_MONTHLY,
    label: 'Pro Monthly',
    description: 'Unlimited tracking and exports.',
    isPaid: true,
    allowsExports: true,
    usage: {
      gigs: { limit: null, period: 'month' },
      expenses: { limit: null, period: 'month' },
      invoices: { limit: null, period: 'month' },
      exports: { limit: null, period: 'month' },
    },
  },
  [PLAN_NAMES.PRO_ANNUAL]: {
    id: PLAN_NAMES.PRO_ANNUAL,
    label: 'Pro Yearly',
    description: 'Unlimited tracking and exports.',
    isPaid: true,
    allowsExports: true,
    usage: {
      gigs: { limit: null, period: 'month' },
      expenses: { limit: null, period: 'month' },
      invoices: { limit: null, period: 'month' },
      exports: { limit: null, period: 'month' },
    },
  },
};

export const PLAN_LIMITS = {
  FREE: {
    GIGS_PER_MONTH: PLAN_DEFINITIONS[PLAN_NAMES.FREE].usage.gigs.limit!,
    EXPENSES_PER_MONTH: PLAN_DEFINITIONS[PLAN_NAMES.FREE].usage.expenses.limit!,
    INVOICES_PER_MONTH: PLAN_DEFINITIONS[PLAN_NAMES.FREE].usage.invoices.limit!,
    EXPORTS_PER_MONTH: PLAN_DEFINITIONS[PLAN_NAMES.FREE].usage.exports.limit!,
  },
  LEGACY_FREE: {
    GIGS_LIFETIME: PLAN_DEFINITIONS[PLAN_NAMES.LEGACY_FREE].usage.gigs.limit!,
    EXPENSES_LIFETIME: PLAN_DEFINITIONS[PLAN_NAMES.LEGACY_FREE].usage.expenses.limit!,
    INVOICES_UNLIMITED: PLAN_DEFINITIONS[PLAN_NAMES.LEGACY_FREE].usage.invoices.limit === null,
    EXPORTS_UNLIMITED: PLAN_DEFINITIONS[PLAN_NAMES.LEGACY_FREE].usage.exports.limit === null,
  },
  PRO: {
    UNLIMITED: true,
  },
} as const;

export const PLAN_PRICES = {
  FREE: 0,
  PRO_MONTHLY: 10,
  PRO_ANNUAL: 60,
} as const;

export function normalizePlan(plan: string | null | undefined, legacyFreePlan: boolean = false): PlanName {
  if (legacyFreePlan) {
    return PLAN_NAMES.LEGACY_FREE;
  }

  if (plan === PLAN_NAMES.PRO_MONTHLY || plan === PLAN_NAMES.PRO_ANNUAL || plan === PLAN_NAMES.FREE) {
    return plan;
  }

  return PLAN_NAMES.FREE;
}

export function isPaidPlan(plan: string | null | undefined, legacyFreePlan: boolean = false): boolean {
  return PLAN_DEFINITIONS[normalizePlan(plan, legacyFreePlan)].isPaid;
}

export function canPlanExport(plan: string | null | undefined, legacyFreePlan: boolean = false): boolean {
  return PLAN_DEFINITIONS[normalizePlan(plan, legacyFreePlan)].allowsExports;
}

export function getPlanDefinition(plan: string | null | undefined, legacyFreePlan: boolean = false): PlanDefinition {
  return PLAN_DEFINITIONS[normalizePlan(plan, legacyFreePlan)];
}
