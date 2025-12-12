import type { BusinessStructure } from '../hooks/useProfile';
import type { SubscriptionTier } from '../hooks/useSubscription';

export type PlanId = 'free' | 'pro' | 'other';

export function getResolvedPlan(input: {
  subscriptionTier?: SubscriptionTier | null;
  subscriptionStatus?: string | null;
  profilePlan?: string | null;
}): PlanId {
  const isActive = input.subscriptionStatus === 'active' || input.subscriptionStatus === 'trialing';
  const tier = input.subscriptionTier;

  if (isActive && (tier === 'monthly' || tier === 'yearly')) {
    return 'pro';
  }

  if (input.profilePlan === 'pro_monthly' || input.profilePlan === 'pro_yearly') {
    return 'pro';
  }

  if (!tier || tier === 'free') {
    return 'free';
  }

  return 'free';
}

export function isSCalcEligibleForBusinessStructure(
  business_structure: BusinessStructure,
  plan: PlanId
): {
  usesSelfEmploymentTax: boolean;
  requiresProForSelection: boolean;
} {
  if (business_structure === 'llc_scorp') {
    return {
      usesSelfEmploymentTax: false,
      requiresProForSelection: true,
    };
  }

  if (business_structure === 'llc_multi_member') {
    return {
      usesSelfEmploymentTax: false,
      requiresProForSelection: false,
    };
  }

  // individual or llc_single_member
  return {
    usesSelfEmploymentTax: true,
    requiresProForSelection: false,
  };
}

export function getProfileBusinessStructure(profile: { business_structure?: unknown } | null | undefined): BusinessStructure {
  const value = profile?.business_structure;
  if (
    value === 'individual' ||
    value === 'llc_single_member' ||
    value === 'llc_scorp' ||
    value === 'llc_multi_member'
  ) {
    return value;
  }
  return 'individual';
}
