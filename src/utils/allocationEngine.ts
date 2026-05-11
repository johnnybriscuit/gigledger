import type { AllocationBucket, AllocationResult, BucketValidation, BucketType } from '../types/allocation';

const NO_INCOME_TAX_STATES = ['TX', 'FL', 'WA', 'NV', 'WY', 'SD', 'AK', 'NH', 'TN'];

export function calculateAllocations(
  grossAmount: number,
  buckets: AllocationBucket[]
): AllocationResult[] {
  if (buckets.length === 0) {
    return [];
  }

  const activeBuckets = buckets.filter(b => b.is_active);
  
  if (activeBuckets.length === 0) {
    return [];
  }

  const results: AllocationResult[] = [];
  let totalAllocated = 0;
  let spendableBucket: AllocationBucket | null = null;

  for (const bucket of activeBuckets) {
    if (bucket.bucket_type === 'spendable') {
      spendableBucket = bucket;
      continue;
    }

    const allocatedAmount = Math.round((grossAmount * bucket.percentage / 100) * 100) / 100;
    totalAllocated += allocatedAmount;

    results.push({
      bucket,
      allocatedAmount,
      percentage: bucket.percentage,
    });
  }

  if (spendableBucket) {
    const spendableAmount = Math.round((grossAmount - totalAllocated) * 100) / 100;
    results.push({
      bucket: spendableBucket,
      allocatedAmount: spendableAmount,
      percentage: spendableBucket.percentage,
    });
  }

  return results;
}

export function getDefaultBuckets(
  state: string,
  estimatedAnnualIncome: number
): Omit<AllocationBucket, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] {
  const stateUpperCase = state.toUpperCase();
  const hasNoIncomeTax = NO_INCOME_TAX_STATES.includes(stateUpperCase);

  let federalTaxPercent: number;
  let retirementPercent: number;

  if (estimatedAnnualIncome < 20000) {
    federalTaxPercent = 16;
    retirementPercent = 8;
  } else if (estimatedAnnualIncome < 50000) {
    federalTaxPercent = 20;
    retirementPercent = 10;
  } else if (estimatedAnnualIncome < 100000) {
    federalTaxPercent = 24;
    retirementPercent = 12;
  } else {
    federalTaxPercent = 28;
    retirementPercent = 15;
  }

  const stateTaxPercent = hasNoIncomeTax ? 0 : 5;
  const emergencyFundPercent = 5;
  const spendablePercent = 100 - federalTaxPercent - stateTaxPercent - retirementPercent - emergencyFundPercent;

  const buckets: Omit<AllocationBucket, 'id' | 'user_id' | 'created_at' | 'updated_at'>[] = [
    {
      name: 'Federal & SE Taxes',
      emoji: '🏛️',
      bucket_type: 'federal_tax',
      percentage: federalTaxPercent,
      color: '#DC2626',
      goal_amount: null,
      goal_name: null,
      goal_date: null,
      sort_order: 0,
      is_active: true,
    },
    {
      name: 'State Taxes',
      emoji: '🏛️',
      bucket_type: 'state_tax',
      percentage: stateTaxPercent,
      color: '#EA580C',
      goal_amount: null,
      goal_name: null,
      goal_date: null,
      sort_order: 1,
      is_active: true,
    },
    {
      name: 'Retirement',
      emoji: '📈',
      bucket_type: 'retirement',
      percentage: retirementPercent,
      color: '#2563EB',
      goal_amount: null,
      goal_name: null,
      goal_date: null,
      sort_order: 2,
      is_active: true,
    },
    {
      name: 'Emergency Fund',
      emoji: '🛟',
      bucket_type: 'emergency_fund',
      percentage: emergencyFundPercent,
      color: '#16A34A',
      goal_amount: null,
      goal_name: null,
      goal_date: null,
      sort_order: 3,
      is_active: true,
    },
    {
      name: 'Yours to Spend',
      emoji: '✅',
      bucket_type: 'spendable',
      percentage: spendablePercent,
      color: '#2E86AB',
      goal_amount: null,
      goal_name: null,
      goal_date: null,
      sort_order: 4,
      is_active: true,
    },
  ];

  return buckets;
}

export function validateBucketPercentages(buckets: AllocationBucket[]): BucketValidation {
  const activeBuckets = buckets.filter(b => b.is_active);
  const total = activeBuckets.reduce((sum, bucket) => sum + bucket.percentage, 0);
  const roundedTotal = Math.round(total * 100) / 100;
  const difference = Math.round((roundedTotal - 100) * 100) / 100;

  return {
    valid: roundedTotal === 100,
    total: roundedTotal,
    difference,
  };
}

export function getNextQuarterlyDueDate(): Date {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();

  const dueDates = [
    new Date(currentYear, 3, 15),
    new Date(currentYear, 5, 16),
    new Date(currentYear, 8, 15),
    new Date(currentYear + 1, 0, 15),
  ];

  for (const dueDate of dueDates) {
    if (dueDate > today) {
      return dueDate;
    }
  }

  return new Date(currentYear + 1, 3, 15);
}
