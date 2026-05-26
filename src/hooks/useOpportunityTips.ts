import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserId } from './useCurrentUser';
import { useAllocationBuckets } from './useAllocationBuckets';
import { useAllocationTransactions } from './useAllocationTransactions';
import { useGigs } from './useGigs';

export interface OpportunityTip {
  key: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaAction: 'learn_more' | 'add_expense' | 'review_mileage' | 'external_link';
  ctaUrl?: string;
  category: 'tax' | 'retirement' | 'deduction' | 'compliance';
  isDismissed: boolean;
}

type TipDef = Omit<OpportunityTip, 'isDismissed'> & { showCondition: boolean };

export function useOpportunityTips() {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { buckets } = useAllocationBuckets();
  const { ytdTotals } = useAllocationTransactions();
  const { data: gigs } = useGigs();

  const { data: dismissedKeys = [], isLoading } = useQuery<string[]>({
    queryKey: ['opportunity-tips-dismissed', userId],
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase
        .from('financial_tips_dismissed')
        .select('tip_key')
        .eq('user_id', userId);
      if (error) throw error;
      return (data ?? []).map((r: { tip_key: string }) => r.tip_key);
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });

  const year = new Date().getFullYear();
  const month = new Date().getMonth() + 1; // 1-12
  const yearStart = `${year}-01-01`;

  const ytdGigs = (gigs ?? []).filter(g => g.date >= yearStart);
  const ytdGigCount = ytdGigs.length;
  const ytdGrossIncome = ytdGigs.reduce((sum, g) => sum + (g.gross_amount ?? 0), 0);

  const retirementBucket = buckets.find(b => b.bucket_type === 'retirement');
  const federalTaxBucket = buckets.find(b => b.bucket_type === 'federal_tax');

  const retirementYtd = retirementBucket
    ? (ytdTotals.find(t => t.bucket_id === retirementBucket.id)?.total ?? 0)
    : 0;

  const tipDefs: TipDef[] = [
    {
      key: 'hits_act_2026',
      category: 'tax',
      title: 'Recording costs may be fully deductible this year',
      body: "Under the HITS Act, musicians may be able to deduct recording studio costs in the year incurred rather than amortizing over 15 years. If you've paid for studio time or production, this could significantly reduce your tax bill.",
      ctaLabel: 'Learn more',
      ctaAction: 'external_link',
      ctaUrl: 'https://www.congress.gov/bill/119th-congress/senate-bill/1127',
      showCondition: ytdGigCount >= 1,
    },
    {
      key: `sep_ira_deadline_${year}`,
      category: 'retirement',
      title: 'You can still boost your retirement savings',
      body: "You can contribute to a SEP-IRA until your tax filing deadline, including extensions. At your current pace, contributing more before October 15 could meaningfully reduce this year's taxes.",
      ctaLabel: 'Learn more',
      ctaAction: 'external_link',
      ctaUrl: 'https://www.irs.gov/retirement-plans/sep-plan-faqs',
      showCondition: !!retirementBucket && retirementYtd < 1000 && month >= 9,
    },
    {
      key: 'qbi_deduction',
      category: 'tax',
      title: 'You may qualify for the 20% QBI deduction',
      body: 'Self-employed workers can often deduct up to 20% of their qualified business income under Section 199A. At your income level, this could save you hundreds in taxes.',
      ctaLabel: 'Learn more',
      ctaAction: 'external_link',
      ctaUrl: 'https://www.irs.gov/newsroom/qualified-business-income-deduction',
      showCondition: ytdGrossIncome > 10000,
    },
    {
      key: 'home_office_deduction',
      category: 'deduction',
      title: 'Home office deduction is underused by gig workers',
      body: "If you use part of your home exclusively for gig work — teaching, producing, admin — you may qualify for the home office deduction. It's one of the most commonly missed deductions.",
      ctaLabel: 'Learn more',
      ctaAction: 'external_link',
      ctaUrl: 'https://www.irs.gov/businesses/small-businesses-self-employed/home-office-deduction',
      showCondition: ytdGigCount >= 5,
    },
    {
      key: 'health_insurance_deduction',
      category: 'deduction',
      title: 'Health insurance premiums are 100% deductible',
      body: 'As a self-employed worker, you can deduct 100% of health insurance premiums you pay for yourself and your family. Make sure these are captured in your expenses.',
      ctaLabel: 'Add health insurance expense',
      ctaAction: 'add_expense',
      showCondition: ytdGigCount >= 3 && !!federalTaxBucket,
    },
  ];

  const activeTips: OpportunityTip[] = tipDefs
    .filter(tip => tip.showCondition)
    .map(({ showCondition: _sc, ...tip }) => ({
      ...tip,
      isDismissed: dismissedKeys.includes(tip.key),
    }))
    .filter(tip => !tip.isDismissed);

  const dismissTip = async (key: string): Promise<void> => {
    if (!userId) return;
    await supabase
      .from('financial_tips_dismissed')
      .upsert(
        { user_id: userId, tip_key: key, dismissed_at: new Date().toISOString() },
        { ignoreDuplicates: true }
      );
    queryClient.invalidateQueries({ queryKey: ['opportunity-tips-dismissed', userId] });
  };

  return { activeTips, dismissTip, isLoading };
}
