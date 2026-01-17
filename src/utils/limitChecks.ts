import { supabase } from '../lib/supabase';
import { PLAN_LIMITS, PLAN_NAMES, type LimitType } from '../constants/plans';

export interface LimitCheckResult {
  allowed: boolean;
  message?: string;
}

export async function checkAndIncrementLimit(
  userId: string,
  limitType: LimitType
): Promise<LimitCheckResult> {
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, legacy_free_plan, gigs_used_this_month, expenses_used_this_month, invoices_used_this_month, exports_used_this_month, usage_period_start')
    .eq('id', userId)
    .single();
  
  if (error || !profile) {
    return { allowed: false, message: 'Profile not found' };
  }
  
  if (profile.plan === PLAN_NAMES.PRO_MONTHLY || profile.plan === PLAN_NAMES.PRO_ANNUAL) {
    return { allowed: true };
  }
  
  if (profile.legacy_free_plan) {
    if (limitType === 'gigs' || limitType === 'expenses') {
      const tableName = limitType === 'gigs' ? 'gigs' : 'expenses';
      const { count } = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const limit = limitType === 'gigs' 
        ? PLAN_LIMITS.LEGACY_FREE.GIGS_LIFETIME 
        : PLAN_LIMITS.LEGACY_FREE.EXPENSES_LIFETIME;
      
      if ((count || 0) >= limit) {
        return { 
          allowed: false, 
          message: `You've reached your ${limit} ${limitType} limit on the Legacy Free plan. Upgrade to Pro for unlimited ${limitType}!` 
        };
      }
    }
    return { allowed: true };
  }
  
  const usedField = `${limitType}_used_this_month` as keyof typeof profile;
  const used = (profile[usedField] as number) || 0;
  
  const limits = {
    gigs: PLAN_LIMITS.FREE.GIGS_PER_MONTH,
    expenses: PLAN_LIMITS.FREE.EXPENSES_PER_MONTH,
    invoices: PLAN_LIMITS.FREE.INVOICES_PER_MONTH,
    exports: PLAN_LIMITS.FREE.EXPORTS_PER_MONTH,
  };
  
  const limit = limits[limitType];
  
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
  
  return { allowed: true };
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
  
  if (profile.plan === PLAN_NAMES.PRO_MONTHLY || profile.plan === PLAN_NAMES.PRO_ANNUAL) {
    return { allowed: true };
  }
  
  if (profile.legacy_free_plan) {
    if (limitType === 'gigs' || limitType === 'expenses') {
      const tableName = limitType === 'gigs' ? 'gigs' : 'expenses';
      const { count } = await supabase
        .from(tableName)
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);
      
      const limit = limitType === 'gigs' 
        ? PLAN_LIMITS.LEGACY_FREE.GIGS_LIFETIME 
        : PLAN_LIMITS.LEGACY_FREE.EXPENSES_LIFETIME;
      
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
  
  const limits = {
    gigs: PLAN_LIMITS.FREE.GIGS_PER_MONTH,
    expenses: PLAN_LIMITS.FREE.EXPENSES_PER_MONTH,
    invoices: PLAN_LIMITS.FREE.INVOICES_PER_MONTH,
    exports: PLAN_LIMITS.FREE.EXPORTS_PER_MONTH,
  };
  
  const limit = limits[limitType];
  
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
  
  return { allowed: true };
}

function getNextResetDate(): Date {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth() + 1, 1);
}
