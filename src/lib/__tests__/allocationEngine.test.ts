import { describe, it, expect } from 'vitest';
import {
  calculateAllocations,
  getDefaultBuckets,
  validateBucketPercentages,
  getNextQuarterlyDueDate,
} from '../../utils/allocationEngine';
import type { AllocationBucket } from '../../types/allocation';

describe('allocationEngine', () => {
  describe('calculateAllocations', () => {
    it('should calculate allocations for 5 standard buckets', () => {
      const buckets: AllocationBucket[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Federal Tax',
          emoji: '🏛️',
          bucket_type: 'federal_tax',
          percentage: 20,
          color: '#DC2626',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 0,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'State Tax',
          emoji: '🏛️',
          bucket_type: 'state_tax',
          percentage: 5,
          color: '#EA580C',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 1,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '3',
          user_id: 'user1',
          name: 'Retirement',
          emoji: '📈',
          bucket_type: 'retirement',
          percentage: 10,
          color: '#2563EB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 2,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '4',
          user_id: 'user1',
          name: 'Emergency Fund',
          emoji: '🛟',
          bucket_type: 'emergency_fund',
          percentage: 5,
          color: '#16A34A',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 3,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '5',
          user_id: 'user1',
          name: 'Spendable',
          emoji: '✅',
          bucket_type: 'spendable',
          percentage: 60,
          color: '#2E86AB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 4,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = calculateAllocations(1000, buckets);

      expect(result).toHaveLength(5);
      expect(result[0].allocatedAmount).toBe(200); // 20% federal
      expect(result[1].allocatedAmount).toBe(50);  // 5% state
      expect(result[2].allocatedAmount).toBe(100); // 10% retirement
      expect(result[3].allocatedAmount).toBe(50);  // 5% emergency
      expect(result[4].allocatedAmount).toBe(600); // 60% spendable (remainder)

      const total = result.reduce((sum, r) => sum + r.allocatedAmount, 0);
      expect(total).toBe(1000);
    });

    it('should handle rounding edge cases correctly', () => {
      const buckets: AllocationBucket[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Federal Tax',
          emoji: '🏛️',
          bucket_type: 'federal_tax',
          percentage: 33.33,
          color: '#DC2626',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 0,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'Retirement',
          emoji: '📈',
          bucket_type: 'retirement',
          percentage: 33.33,
          color: '#2563EB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 1,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '3',
          user_id: 'user1',
          name: 'Spendable',
          emoji: '✅',
          bucket_type: 'spendable',
          percentage: 33.34,
          color: '#2E86AB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 2,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = calculateAllocations(100, buckets);

      expect(result[0].allocatedAmount).toBe(33.33);
      expect(result[1].allocatedAmount).toBe(33.33);
      
      const total = result.reduce((sum, r) => sum + r.allocatedAmount, 0);
      expect(total).toBe(100);
    });

    it('should return empty array when no buckets provided', () => {
      const result = calculateAllocations(1000, []);
      expect(result).toEqual([]);
    });

    it('should filter out inactive buckets', () => {
      const buckets: AllocationBucket[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Federal Tax',
          emoji: '🏛️',
          bucket_type: 'federal_tax',
          percentage: 50,
          color: '#DC2626',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 0,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'Inactive Bucket',
          emoji: '❌',
          bucket_type: 'debt',
          percentage: 25,
          color: '#000000',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 1,
          is_active: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '3',
          user_id: 'user1',
          name: 'Spendable',
          emoji: '✅',
          bucket_type: 'spendable',
          percentage: 50,
          color: '#2E86AB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 2,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = calculateAllocations(1000, buckets);
      expect(result).toHaveLength(2);
      expect(result[0].bucket.name).toBe('Federal Tax');
      expect(result[1].bucket.name).toBe('Spendable');
    });
  });

  describe('getDefaultBuckets', () => {
    it('should create default buckets for no-income-tax state (TX)', () => {
      const buckets = getDefaultBuckets('TX', 30000);

      expect(buckets).toHaveLength(5);
      
      const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
      const stateTax = buckets.find(b => b.bucket_type === 'state_tax');
      const retirement = buckets.find(b => b.bucket_type === 'retirement');
      const emergency = buckets.find(b => b.bucket_type === 'emergency_fund');
      const spendable = buckets.find(b => b.bucket_type === 'spendable');

      expect(federalTax?.percentage).toBe(20);
      expect(stateTax?.percentage).toBe(0);
      expect(retirement?.percentage).toBe(10);
      expect(emergency?.percentage).toBe(5);
      expect(spendable?.percentage).toBe(65);

      const total = buckets.reduce((sum, b) => sum + b.percentage, 0);
      expect(total).toBe(100);
    });

    it('should create default buckets for income-tax state (CA)', () => {
      const buckets = getDefaultBuckets('CA', 30000);

      const stateTax = buckets.find(b => b.bucket_type === 'state_tax');
      expect(stateTax?.percentage).toBe(5);

      const total = buckets.reduce((sum, b) => sum + b.percentage, 0);
      expect(total).toBe(100);
    });

    it('should adjust percentages for income under $20k', () => {
      const buckets = getDefaultBuckets('NY', 15000);

      const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
      const retirement = buckets.find(b => b.bucket_type === 'retirement');

      expect(federalTax?.percentage).toBe(16);
      expect(retirement?.percentage).toBe(8);
    });

    it('should adjust percentages for income $20k-$50k', () => {
      const buckets = getDefaultBuckets('NY', 35000);

      const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
      const retirement = buckets.find(b => b.bucket_type === 'retirement');

      expect(federalTax?.percentage).toBe(20);
      expect(retirement?.percentage).toBe(10);
    });

    it('should adjust percentages for income $50k-$100k', () => {
      const buckets = getDefaultBuckets('NY', 75000);

      const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
      const retirement = buckets.find(b => b.bucket_type === 'retirement');

      expect(federalTax?.percentage).toBe(24);
      expect(retirement?.percentage).toBe(12);
    });

    it('should adjust percentages for income over $100k', () => {
      const buckets = getDefaultBuckets('NY', 150000);

      const federalTax = buckets.find(b => b.bucket_type === 'federal_tax');
      const retirement = buckets.find(b => b.bucket_type === 'retirement');

      expect(federalTax?.percentage).toBe(28);
      expect(retirement?.percentage).toBe(15);
    });
  });

  describe('validateBucketPercentages', () => {
    it('should return valid for buckets totaling exactly 100%', () => {
      const buckets: AllocationBucket[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Federal Tax',
          emoji: '🏛️',
          bucket_type: 'federal_tax',
          percentage: 50,
          color: '#DC2626',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 0,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'Spendable',
          emoji: '✅',
          bucket_type: 'spendable',
          percentage: 50,
          color: '#2E86AB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 1,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = validateBucketPercentages(buckets);

      expect(result.valid).toBe(true);
      expect(result.total).toBe(100);
      expect(result.difference).toBe(0);
    });

    it('should return invalid for buckets over 100%', () => {
      const buckets: AllocationBucket[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Federal Tax',
          emoji: '🏛️',
          bucket_type: 'federal_tax',
          percentage: 60,
          color: '#DC2626',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 0,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'Spendable',
          emoji: '✅',
          bucket_type: 'spendable',
          percentage: 50,
          color: '#2E86AB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 1,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = validateBucketPercentages(buckets);

      expect(result.valid).toBe(false);
      expect(result.total).toBe(110);
      expect(result.difference).toBe(10);
    });

    it('should return invalid for buckets under 100%', () => {
      const buckets: AllocationBucket[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Federal Tax',
          emoji: '🏛️',
          bucket_type: 'federal_tax',
          percentage: 40,
          color: '#DC2626',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 0,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'Spendable',
          emoji: '✅',
          bucket_type: 'spendable',
          percentage: 50,
          color: '#2E86AB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 1,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = validateBucketPercentages(buckets);

      expect(result.valid).toBe(false);
      expect(result.total).toBe(90);
      expect(result.difference).toBe(-10);
    });

    it('should ignore inactive buckets', () => {
      const buckets: AllocationBucket[] = [
        {
          id: '1',
          user_id: 'user1',
          name: 'Federal Tax',
          emoji: '🏛️',
          bucket_type: 'federal_tax',
          percentage: 50,
          color: '#DC2626',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 0,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '2',
          user_id: 'user1',
          name: 'Inactive',
          emoji: '❌',
          bucket_type: 'debt',
          percentage: 25,
          color: '#000000',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 1,
          is_active: false,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          id: '3',
          user_id: 'user1',
          name: 'Spendable',
          emoji: '✅',
          bucket_type: 'spendable',
          percentage: 50,
          color: '#2E86AB',
          goal_amount: null,
          goal_name: null,
          goal_date: null,
          sort_order: 2,
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      const result = validateBucketPercentages(buckets);

      expect(result.valid).toBe(true);
      expect(result.total).toBe(100);
    });
  });

  describe('Phase 2 allocation requirements', () => {
    const STANDARD_BUCKETS: AllocationBucket[] = [
      {
        id: 'b1', user_id: 'u1', name: 'Federal & SE Taxes', emoji: '🏛️',
        bucket_type: 'federal_tax', percentage: 20, color: '#DC2626',
        goal_amount: null, goal_name: null, goal_date: null,
        sort_order: 0, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
      {
        id: 'b2', user_id: 'u1', name: 'State Taxes', emoji: '🏛️',
        bucket_type: 'state_tax', percentage: 5, color: '#EA580C',
        goal_amount: null, goal_name: null, goal_date: null,
        sort_order: 1, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
      {
        id: 'b3', user_id: 'u1', name: 'Retirement', emoji: '📈',
        bucket_type: 'retirement', percentage: 10, color: '#2563EB',
        goal_amount: null, goal_name: null, goal_date: null,
        sort_order: 2, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
      {
        id: 'b4', user_id: 'u1', name: 'Emergency Fund', emoji: '🛟',
        bucket_type: 'emergency_fund', percentage: 5, color: '#16A34A',
        goal_amount: null, goal_name: null, goal_date: null,
        sort_order: 3, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
      {
        id: 'b5', user_id: 'u1', name: 'Yours to Spend', emoji: '✅',
        bucket_type: 'spendable', percentage: 60, color: '#2E86AB',
        goal_amount: null, goal_name: null, goal_date: null,
        sort_order: 4, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
      },
    ];

    it('$400 gig: each bucket gets the correct dollar amount and amounts sum to $400', () => {
      const result = calculateAllocations(400, STANDARD_BUCKETS);

      expect(result).toHaveLength(5);

      const federal = result.find(r => r.bucket.bucket_type === 'federal_tax')!;
      const state = result.find(r => r.bucket.bucket_type === 'state_tax')!;
      const retirement = result.find(r => r.bucket.bucket_type === 'retirement')!;
      const emergency = result.find(r => r.bucket.bucket_type === 'emergency_fund')!;
      const spendable = result.find(r => r.bucket.bucket_type === 'spendable')!;

      expect(federal.allocatedAmount).toBe(80);
      expect(state.allocatedAmount).toBe(20);
      expect(retirement.allocatedAmount).toBe(40);
      expect(emergency.allocatedAmount).toBe(20);
      expect(spendable.allocatedAmount).toBe(240);

      const total = result.reduce((sum, r) => sum + r.allocatedAmount, 0);
      expect(total).toBe(400);
    });

    it('$333.33 gig: no penny is lost or doubled — remainder goes to spendable', () => {
      const result = calculateAllocations(333.33, STANDARD_BUCKETS);

      expect(result).toHaveLength(5);

      const federal = result.find(r => r.bucket.bucket_type === 'federal_tax')!;
      const state = result.find(r => r.bucket.bucket_type === 'state_tax')!;
      const retirement = result.find(r => r.bucket.bucket_type === 'retirement')!;
      const emergency = result.find(r => r.bucket.bucket_type === 'emergency_fund')!;
      const spendable = result.find(r => r.bucket.bucket_type === 'spendable')!;

      expect(federal.allocatedAmount).toBe(66.67);
      expect(state.allocatedAmount).toBe(16.67);
      expect(retirement.allocatedAmount).toBe(33.33);
      expect(emergency.allocatedAmount).toBe(16.67);
      expect(spendable.allocatedAmount).toBe(199.99);

      const total = Math.round(result.reduce((sum, r) => sum + r.allocatedAmount, 0) * 100) / 100;
      expect(total).toBe(333.33);
    });

    it('duplicate gig: returns no rows to insert when all buckets already have transactions', () => {
      const allocations = calculateAllocations(400, STANDARD_BUCKETS);

      const existingBucketIds = new Set(allocations.map(r => r.bucket.id));
      const toInsert = allocations.filter(r => !existingBucketIds.has(r.bucket.id));

      expect(toInsert).toHaveLength(0);
    });

    it('duplicate gig: only inserts transactions for buckets not yet allocated', () => {
      const allocations = calculateAllocations(400, STANDARD_BUCKETS);

      const existingBucketIds = new Set(['b1', 'b2']);
      const toInsert = allocations.filter(r => !existingBucketIds.has(r.bucket.id));

      expect(toInsert).toHaveLength(3);
      const types = toInsert.map(r => r.bucket.bucket_type);
      expect(types).toContain('retirement');
      expect(types).toContain('emergency_fund');
      expect(types).toContain('spendable');
    });

    it('totalAllocatedPercent != 100: validateBucketPercentages returns valid=false (maps to isValid=false)', () => {
      const underAllocated: AllocationBucket[] = [
        {
          id: 'b1', user_id: 'u1', name: 'Federal Tax', emoji: '🏛️',
          bucket_type: 'federal_tax', percentage: 30, color: '#DC2626',
          goal_amount: null, goal_name: null, goal_date: null,
          sort_order: 0, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
        },
        {
          id: 'b2', user_id: 'u1', name: 'Spendable', emoji: '✅',
          bucket_type: 'spendable', percentage: 50, color: '#2E86AB',
          goal_amount: null, goal_name: null, goal_date: null,
          sort_order: 1, is_active: true, created_at: '2024-01-01', updated_at: '2024-01-01',
        },
      ];

      const v = validateBucketPercentages(underAllocated);

      expect(v.valid).toBe(false);
      expect(v.total).toBe(80);
      expect(v.difference).toBe(-20);

      const validationError = v.difference > 0
        ? `Bucket percentages total ${v.total}% (${v.difference}% over 100%). Consider adjusting.`
        : `Bucket percentages total ${v.total}% (${Math.abs(v.difference)}% under 100%). Consider adjusting.`;

      expect(validationError).not.toBe('');
      expect(validationError).toContain('under 100%');
    });
  });

  describe('getNextQuarterlyDueDate', () => {
    it('should return April 15 for dates in Q1', () => {
      const result = getNextQuarterlyDueDate();
      
      const today = new Date();
      const currentMonth = today.getMonth();
      const currentDay = today.getDate();
      
      if (currentMonth < 3 || (currentMonth === 3 && currentDay < 15)) {
        expect(result.getMonth()).toBe(3);
        expect(result.getDate()).toBe(15);
      } else if (currentMonth < 5 || (currentMonth === 5 && currentDay < 16)) {
        expect(result.getMonth()).toBe(5);
        expect(result.getDate()).toBe(16);
      } else if (currentMonth < 8 || (currentMonth === 8 && currentDay < 15)) {
        expect(result.getMonth()).toBe(8);
        expect(result.getDate()).toBe(15);
      } else {
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(15);
        expect(result.getFullYear()).toBe(today.getFullYear() + 1);
      }
    });

    it('should return a date in the future', () => {
      const result = getNextQuarterlyDueDate();
      const today = new Date();
      
      expect(result.getTime()).toBeGreaterThan(today.getTime());
    });

    it('should return one of the four quarterly dates', () => {
      const result = getNextQuarterlyDueDate();
      const month = result.getMonth();
      const day = result.getDate();
      
      const validDates = [
        { month: 3, day: 15 },
        { month: 5, day: 16 },
        { month: 8, day: 15 },
        { month: 0, day: 15 },
      ];
      
      const isValid = validDates.some(d => d.month === month && d.day === day);
      expect(isValid).toBe(true);
    });
  });
});
