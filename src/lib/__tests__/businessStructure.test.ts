import { getResolvedPlan, isSCalcEligibleForBusinessStructure, getProfileBusinessStructure } from '../businessStructure';
import type { SubscriptionTier } from '../../hooks/useSubscription';

describe('businessStructure helpers', () => {
  describe('getResolvedPlan', () => {
    it('should return "pro" for active monthly subscription', () => {
      const result = getResolvedPlan({
        subscriptionTier: 'monthly' as SubscriptionTier,
        subscriptionStatus: 'active',
      });
      expect(result).toBe('pro');
    });

    it('should return "pro" for active yearly subscription', () => {
      const result = getResolvedPlan({
        subscriptionTier: 'yearly' as SubscriptionTier,
        subscriptionStatus: 'active',
      });
      expect(result).toBe('pro');
    });

    it('should return "pro" for trialing monthly subscription', () => {
      const result = getResolvedPlan({
        subscriptionTier: 'monthly' as SubscriptionTier,
        subscriptionStatus: 'trialing',
      });
      expect(result).toBe('pro');
    });

    it('should return "free" for free tier', () => {
      const result = getResolvedPlan({
        subscriptionTier: 'free' as SubscriptionTier,
        subscriptionStatus: 'active',
      });
      expect(result).toBe('free');
    });

    it('should return "free" for null subscription', () => {
      const result = getResolvedPlan({
        subscriptionTier: null,
        subscriptionStatus: null,
      });
      expect(result).toBe('free');
    });

    it('should return "free" for inactive monthly subscription', () => {
      const result = getResolvedPlan({
        subscriptionTier: 'monthly' as SubscriptionTier,
        subscriptionStatus: 'canceled',
      });
      expect(result).toBe('free');
    });

    it('should return "free" for past_due subscription', () => {
      const result = getResolvedPlan({
        subscriptionTier: 'monthly' as SubscriptionTier,
        subscriptionStatus: 'past_due',
      });
      expect(result).toBe('free');
    });

    it('should fallback to profilePlan for pro_monthly', () => {
      const result = getResolvedPlan({
        subscriptionTier: null,
        subscriptionStatus: null,
        profilePlan: 'pro_monthly',
      });
      expect(result).toBe('pro');
    });

    it('should fallback to profilePlan for pro_yearly', () => {
      const result = getResolvedPlan({
        subscriptionTier: null,
        subscriptionStatus: null,
        profilePlan: 'pro_yearly',
      });
      expect(result).toBe('pro');
    });
  });

  describe('isSCalcEligibleForBusinessStructure', () => {
    describe('individual', () => {
      it('should use SE tax on free plan', () => {
        const result = isSCalcEligibleForBusinessStructure('individual', 'free');
        expect(result.usesSelfEmploymentTax).toBe(true);
        expect(result.requiresProForSelection).toBe(false);
      });

      it('should use SE tax on pro plan', () => {
        const result = isSCalcEligibleForBusinessStructure('individual', 'pro');
        expect(result.usesSelfEmploymentTax).toBe(true);
        expect(result.requiresProForSelection).toBe(false);
      });
    });

    describe('llc_single_member', () => {
      it('should use SE tax on free plan', () => {
        const result = isSCalcEligibleForBusinessStructure('llc_single_member', 'free');
        expect(result.usesSelfEmploymentTax).toBe(true);
        expect(result.requiresProForSelection).toBe(false);
      });

      it('should use SE tax on pro plan', () => {
        const result = isSCalcEligibleForBusinessStructure('llc_single_member', 'pro');
        expect(result.usesSelfEmploymentTax).toBe(true);
        expect(result.requiresProForSelection).toBe(false);
      });
    });

    describe('llc_scorp', () => {
      it('should NOT use SE tax on free plan and require Pro', () => {
        const result = isSCalcEligibleForBusinessStructure('llc_scorp', 'free');
        expect(result.usesSelfEmploymentTax).toBe(false);
        expect(result.requiresProForSelection).toBe(true);
      });

      it('should NOT use SE tax on pro plan and require Pro', () => {
        const result = isSCalcEligibleForBusinessStructure('llc_scorp', 'pro');
        expect(result.usesSelfEmploymentTax).toBe(false);
        expect(result.requiresProForSelection).toBe(true);
      });
    });

    describe('llc_multi_member', () => {
      it('should NOT use SE tax on free plan and NOT require Pro', () => {
        const result = isSCalcEligibleForBusinessStructure('llc_multi_member', 'free');
        expect(result.usesSelfEmploymentTax).toBe(false);
        expect(result.requiresProForSelection).toBe(false);
      });

      it('should NOT use SE tax on pro plan and NOT require Pro', () => {
        const result = isSCalcEligibleForBusinessStructure('llc_multi_member', 'pro');
        expect(result.usesSelfEmploymentTax).toBe(false);
        expect(result.requiresProForSelection).toBe(false);
      });
    });
  });

  describe('getProfileBusinessStructure', () => {
    it('should return individual for valid individual value', () => {
      const result = getProfileBusinessStructure({ business_structure: 'individual' });
      expect(result).toBe('individual');
    });

    it('should return llc_single_member for valid value', () => {
      const result = getProfileBusinessStructure({ business_structure: 'llc_single_member' });
      expect(result).toBe('llc_single_member');
    });

    it('should return llc_scorp for valid value', () => {
      const result = getProfileBusinessStructure({ business_structure: 'llc_scorp' });
      expect(result).toBe('llc_scorp');
    });

    it('should return llc_multi_member for valid value', () => {
      const result = getProfileBusinessStructure({ business_structure: 'llc_multi_member' });
      expect(result).toBe('llc_multi_member');
    });

    it('should return individual for null profile', () => {
      const result = getProfileBusinessStructure(null);
      expect(result).toBe('individual');
    });

    it('should return individual for undefined profile', () => {
      const result = getProfileBusinessStructure(undefined);
      expect(result).toBe('individual');
    });

    it('should return individual for missing business_structure', () => {
      const result = getProfileBusinessStructure({});
      expect(result).toBe('individual');
    });

    it('should return individual for invalid business_structure value', () => {
      const result = getProfileBusinessStructure({ business_structure: 'invalid_value' });
      expect(result).toBe('individual');
    });

    it('should return individual for numeric business_structure', () => {
      const result = getProfileBusinessStructure({ business_structure: 123 });
      expect(result).toBe('individual');
    });
  });
});
