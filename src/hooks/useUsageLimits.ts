import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { PLAN_LIMITS, PLAN_NAMES } from '../constants/plans';

export interface UsageLimits {
  plan: string;
  isPro: boolean;
  isLegacyFree: boolean;
  limits: {
    gigs: { used: number; limit: number; unlimited: boolean };
    expenses: { used: number; limit: number; unlimited: boolean };
    invoices: { used: number; limit: number; unlimited: boolean };
    exports: { used: number; limit: number; unlimited: boolean };
  };
  resetDate: Date | null;
}

export function useUsageLimits(userId?: string) {
  return useQuery<UsageLimits>({
    queryKey: ['usageLimits', userId],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID');
      
      const { data: profile, error } = await supabase
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
      
      if (error) throw error;
      
      const isPro = profile.plan === PLAN_NAMES.PRO_MONTHLY || 
                    profile.plan === PLAN_NAMES.PRO_ANNUAL;
      const isLegacyFree = profile.legacy_free_plan === true;
      
      let limits;
      if (isPro) {
        limits = {
          gigs: { used: 0, limit: Infinity, unlimited: true },
          expenses: { used: 0, limit: Infinity, unlimited: true },
          invoices: { used: 0, limit: Infinity, unlimited: true },
          exports: { used: 0, limit: Infinity, unlimited: true },
        };
      } else if (isLegacyFree) {
        const [gigsCount, expensesCount] = await Promise.all([
          supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('expenses').select('id', { count: 'exact', head: true }).eq('user_id', userId),
        ]);
        
        limits = {
          gigs: { 
            used: gigsCount.count || 0, 
            limit: PLAN_LIMITS.LEGACY_FREE.GIGS_LIFETIME,
            unlimited: false 
          },
          expenses: { 
            used: expensesCount.count || 0, 
            limit: PLAN_LIMITS.LEGACY_FREE.EXPENSES_LIFETIME,
            unlimited: false 
          },
          invoices: { used: 0, limit: Infinity, unlimited: true },
          exports: { used: 0, limit: Infinity, unlimited: true },
        };
      } else {
        limits = {
          gigs: { 
            used: profile.gigs_used_this_month || 0, 
            limit: PLAN_LIMITS.FREE.GIGS_PER_MONTH,
            unlimited: false 
          },
          expenses: { 
            used: profile.expenses_used_this_month || 0, 
            limit: PLAN_LIMITS.FREE.EXPENSES_PER_MONTH,
            unlimited: false 
          },
          invoices: { 
            used: profile.invoices_used_this_month || 0, 
            limit: PLAN_LIMITS.FREE.INVOICES_PER_MONTH,
            unlimited: false 
          },
          exports: { 
            used: profile.exports_used_this_month || 0, 
            limit: PLAN_LIMITS.FREE.EXPORTS_PER_MONTH,
            unlimited: false 
          },
        };
      }
      
      return {
        plan: profile.plan,
        isPro,
        isLegacyFree,
        limits,
        resetDate: isLegacyFree ? null : getNextResetDate(),
      };
    },
    enabled: !!userId,
    staleTime: 30000,
  });
}

function getNextResetDate(): Date {
  const today = new Date();
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  return nextMonth;
}
