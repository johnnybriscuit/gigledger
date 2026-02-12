import type { AllocationMode, AllocationJson, GigAllocationPreview, TourFinancials } from '../types/tours.types';

interface GigForAllocation {
  id: string;
  title: string | null;
  date: string;
  gross_amount: number;
  tips?: number;
  per_diem?: number | null;
  other_income?: number | null;
}

interface ExpenseAllocation {
  amount: number;
  allocation_mode: AllocationMode;
  allocation_json: AllocationJson | null;
}

interface SettlementAllocation {
  amount: number;
  allocation_mode: AllocationMode;
  allocation_json: AllocationJson | null;
}

/**
 * Calculate allocation of an amount across gigs based on mode
 */
export function calculateAllocation(
  amount: number,
  gigs: GigForAllocation[],
  mode: AllocationMode,
  customAllocations?: AllocationJson
): AllocationJson {
  if (gigs.length === 0) {
    return {};
  }

  switch (mode) {
    case 'none':
      return {};

    case 'even': {
      const perGig = amount / gigs.length;
      return gigs.reduce((acc, gig) => {
        acc[gig.id] = perGig;
        return acc;
      }, {} as AllocationJson);
    }

    case 'custom': {
      if (!customAllocations) {
        return {};
      }
      return customAllocations;
    }

    case 'weighted': {
      const weights = gigs.map(gig => {
        const guarantee = gig.gross_amount || 0;
        return { gigId: gig.id, weight: guarantee };
      });

      const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

      if (totalWeight === 0) {
        const perGig = amount / gigs.length;
        return gigs.reduce((acc, gig) => {
          acc[gig.id] = perGig;
          return acc;
        }, {} as AllocationJson);
      }

      return weights.reduce((acc, w) => {
        acc[w.gigId] = (w.weight / totalWeight) * amount;
        return acc;
      }, {} as AllocationJson);
    }

    default:
      return {};
  }
}

/**
 * Generate preview of allocation for UI display
 */
export function generateAllocationPreview(
  amount: number,
  gigs: GigForAllocation[],
  mode: AllocationMode,
  customAllocations?: AllocationJson
): GigAllocationPreview[] {
  const allocations = calculateAllocation(amount, gigs, mode, customAllocations);

  return gigs.map(gig => {
    const allocatedAmount = allocations[gig.id] || 0;
    const weight = mode === 'weighted' ? (gig.gross_amount || 0) : undefined;

    return {
      gigId: gig.id,
      gigTitle: gig.title || 'Untitled Gig',
      gigDate: gig.date,
      allocatedAmount,
      weight,
    };
  });
}

/**
 * Build comprehensive tour financials with per-gig breakdown
 */
export function buildTourFinancials(
  gigs: GigForAllocation[],
  settlements: SettlementAllocation[],
  tourExpenses: ExpenseAllocation[],
  gigExpenses: { [gigId: string]: number }
): TourFinancials {
  const perGig: TourFinancials['perGig'] = {};

  gigs.forEach(gig => {
    perGig[gig.id] = {
      allocatedIncome: 0,
      allocatedSharedExpenses: 0,
      gigSpecificExpenses: gigExpenses[gig.id] || 0,
      net: 0,
    };
  });

  let totalGross = 0;

  settlements.forEach(settlement => {
    const allocations = calculateAllocation(
      settlement.amount,
      gigs,
      settlement.allocation_mode,
      settlement.allocation_json || undefined
    );

    Object.entries(allocations).forEach(([gigId, amount]) => {
      if (perGig[gigId]) {
        perGig[gigId].allocatedIncome += amount;
        totalGross += amount;
      }
    });
  });

  let totalExpenses = 0;

  tourExpenses.forEach(expense => {
    const allocations = calculateAllocation(
      expense.amount,
      gigs,
      expense.allocation_mode,
      expense.allocation_json || undefined
    );

    Object.entries(allocations).forEach(([gigId, amount]) => {
      if (perGig[gigId]) {
        perGig[gigId].allocatedSharedExpenses += amount;
        totalExpenses += amount;
      }
    });
  });

  Object.values(gigExpenses).forEach(amount => {
    totalExpenses += amount;
  });

  Object.keys(perGig).forEach(gigId => {
    const gig = perGig[gigId];
    gig.net = gig.allocatedIncome - gig.allocatedSharedExpenses - gig.gigSpecificExpenses;
  });

  return {
    totals: {
      gross: totalGross,
      expenses: totalExpenses,
      net: totalGross - totalExpenses,
    },
    perGig,
  };
}

/**
 * Validate custom allocations sum to total amount
 */
export function validateCustomAllocations(
  allocations: AllocationJson,
  totalAmount: number,
  tolerance: number = 0.01
): { valid: boolean; difference: number } {
  const sum = Object.values(allocations).reduce((acc, val) => acc + val, 0);
  const difference = Math.abs(sum - totalAmount);
  
  return {
    valid: difference <= tolerance,
    difference,
  };
}

/**
 * Get display name for allocation mode
 */
export function getAllocationModeLabel(mode: AllocationMode): string {
  switch (mode) {
    case 'even':
      return 'Split Evenly';
    case 'custom':
      return 'Custom Amounts';
    case 'weighted':
      return 'Weighted by Guarantee';
    case 'none':
      return 'No Allocation';
    default:
      return 'Unknown';
  }
}
