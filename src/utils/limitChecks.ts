import { supabase } from '../lib/supabase';
import {
  getPlanDefinition,
  normalizePlan,
  PLAN_NAMES,
  type LimitType,
} from '../constants/plans';

export interface LimitCheckResult {
  allowed: boolean;
  message?: string;
  incremented?: boolean;
}

interface SubscriptionSnapshot {
  tier: string | null;
  status: string | null;
}

function hasActivePaidSubscription(subscription: SubscriptionSnapshot | null): boolean {
  if (!subscription) return false;
  const isActive = subscription.status === 'active' || subscription.status === 'trialing';
  const isPaidTier = subscription.tier === 'monthly' || subscription.tier === 'yearly';
  return isActive && isPaidTier;
}

function hasPaidProfilePlan(plan: string | null | undefined): boolean {
  return plan === 'pro_monthly' || plan === 'pro_yearly' || plan === 'monthly' || plan === 'yearly';
}

async function isPaidUser(userId: string, profilePlan: string | null | undefined): Promise<boolean> {
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('tier, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.warn('[limitChecks] Error fetching subscription for limit check:', error);
  }

  if (hasActivePaidSubscription(subscription)) {
    return true;
  }

  return hasPaidProfilePlan(profilePlan);
}

export async function checkAndIncrementLimit(
  userId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, legacy_free_plan, gigs_used_this_month, expenses_used_this_month, invoices_used_this_month, exports_used_this_month, usage_period_start')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching profile for limit check:', error);
      // If columns don't exist yet, allow the action (graceful degradation)
      if (error.message?.includes('column') || error.code === '42703') {
        console.warn('Monthly limit columns not found - allowing action');
        return { allowed: true };
      }
      return { allowed: false, message: 'Profile not found' };
    }
    
    if (!profile) {
      return { allowed: false, message: 'Profile not found' };
    }

    const paidUser = await isPaidUser(userId, profile.plan);
    if (paidUser) {
      return { allowed: true, incremented: false };
    }
  
  const normalizedPlan = normalizePlan(profile.plan, profile.legacy_free_plan === true);
  const definition = getPlanDefinition(profile.plan, profile.legacy_free_plan === true);
  
  if (normalizedPlan === PLAN_NAMES.LEGACY_FREE) {
    if (limitType === 'gigs' || limitType === 'expenses') {
      const tableName = limitType === 'gigs' ? 'gigs' : 'expenses';
      const { count } = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const limit = definition.usage[limitType].limit ?? Infinity;
      
      if ((count || 0) >= limit) {
        return { 
          allowed: false, 
          message: `You've reached your ${limit} ${limitType} limit on the Legacy Free plan. Upgrade to Pro for unlimited ${limitType}!` 
        };
      }
    }
    return { allowed: true, incremented: false };
  }
  
  const usedField = `${limitType}_used_this_month` as keyof typeof profile;
  const used = (profile[usedField] as number) || 0;
  const limit = definition.usage[limitType].limit ?? Infinity;
  
  if (used >= limit) {
    const resetDate = getNextResetDate().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
    return { 
      allowed: false, 
      message: `You've used all ${limit} ${limitType} for this month. Resets on ${resetDate}. Upgrade to Pro for unlimited access!` 
    };
  }
  
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ [usedField]: used + 1 })
    .eq('id', userId);
  
  if (updateError) {
    console.error('Error incrementing usage counter:', updateError);
    return { allowed: false, message: 'Error updating usage counter' };
  }
  
  return { allowed: true, incremented: true };
  
  } catch (error) {
    console.error('Unexpected error in checkAndIncrementLimit:', error);
    // Allow action on unexpected errors (graceful degradation)
    return { allowed: true, incremented: false };
  }
}

export async function checkLimit(
  userId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, legacy_free_plan, gigs_used_this_month, expenses_used_this_month, invoices_used_this_month, exports_used_this_month')
    .eq('id', userId)
    .single();
  
  if (error || !profile) {
    return { allowed: false, message: 'Profile not found' };
  }

  const paidUser = await isPaidUser(userId, profile.plan);
  if (paidUser) {
    return { allowed: true, incremented: false };
  }
  
  const normalizedPlan = normalizePlan(profile.plan, profile.legacy_free_plan === true);
  const definition = getPlanDefinition(profile.plan, profile.legacy_free_plan === true);
  
  if (normalizedPlan === PLAN_NAMES.LEGACY_FREE) {
    if (limitType === 'gigs' || limitType === 'expenses') {
      const tableName = limitType === 'gigs' ? 'gigs' : 'expenses';
      const { count } = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const limit = definition.usage[limitType].limit ?? Infinity;
      
      if ((count || 0) >= limit) {
        return { 
          allowed: false, 
          message: `You've reached your ${limit} ${limitType} limit on the Legacy Free plan.` 
        };
      }
    }
    return { allowed: true };
  }
  
  const usedField = `${limitType}_used_this_month` as keyof typeof profile;
  const used = (profile[usedField] as number) || 0;
  const limit = definition.usage[limitType].limit ?? Infinity;
  
  if (used >= limit) {
    const resetDate = getNextResetDate().toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });
    return { 
      allowed: false, 
      message: `You've used all ${limit} ${limitType} for this month. Resets on ${resetDate}.` 
    };
  }
  
  return { allowed: true, incremented: false };
}

export async function incrementLimitUsage(
  userId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('plan, legacy_free_plan, gigs_used_this_month, expenses_used_this_month, invoices_used_this_month, exports_used_this_month')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile for usage increment:', error);
      if (error.message?.includes('column') || error.code === '42703') {
        return { allowed: true, incremented: false };
      }
      return { allowed: false, message: 'Profile not found' };
    }

    if (!profile) {
      return { allowed: false, message: 'Profile not found' };
    }

    const paidUser = await isPaidUser(userId, profile.plan);
    if (paidUser) {
      return { allowed: true, incremented: false };
    }

    const normalizedPlan = normalizePlan(profile.plan, profile.legacy_free_plan === true);
    if (normalizedPlan === PLAN_NAMES.LEGACY_FREE) {
      return { allowed: true, incremented: false };
    }

    const usedField = `${limitType}_used_this_month` as keyof typeof profile;
    const used = (profile[usedField] as number) || 0;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ [usedField]: used + 1 })
      .eq('id', userId);

    if (updateError) {
      console.error('Error incrementing usage counter:', updateError);
      return { allowed: false, message: 'Error updating usage counter' };
    }

    return { allowed: true, incremented: true };
  } catch (error) {
    console.error('Unexpected error in incrementLimitUsage:', error);
    return { allowed: true, incremented: false };
  }
}

function getNextResetDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 1);
}
