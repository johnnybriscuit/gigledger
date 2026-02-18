/**
 * Tax Treatment utilities for W-2 vs 1099 tracking
 */

import type { Database } from '../types/database.types';

export type TaxTreatment = 'w2' | 'contractor_1099' | 'other';

export type Payer = Database['public']['Tables']['payers']['Row'];
export type Gig = Database['public']['Tables']['gigs']['Row'];

/**
 * Get the effective tax treatment for a gig
 * If gig has explicit tax_treatment, use it; otherwise inherit from payer
 */
export function getEffectiveTaxTreatment(
  gig: Pick<Gig, 'tax_treatment'> | null,
  payer: Pick<Payer, 'tax_treatment'> | null
): TaxTreatment {
  if (gig?.tax_treatment) {
    return gig.tax_treatment as TaxTreatment;
  }
  if (payer?.tax_treatment) {
    return payer.tax_treatment as TaxTreatment;
  }
  return 'contractor_1099'; // Default fallback
}

/**
 * Check if a gig should be excluded from tax set-aside calculations
 * W-2 gigs are excluded because taxes are withheld by the employer
 */
export function shouldExcludeFromTaxSetAside(
  gig: Pick<Gig, 'tax_treatment'> | null,
  payer: Pick<Payer, 'tax_treatment'> | null
): boolean {
  const effectiveTreatment = getEffectiveTaxTreatment(gig, payer);
  return effectiveTreatment === 'w2';
}

/**
 * Get display amount for a gig based on tax treatment and available fields
 * For W-2 gigs: prefer net_amount_w2, fall back to gross_amount
 * For contractor gigs: prefer gross_amount
 */
export function getGigDisplayAmount(gig: Partial<Gig>): number {
  // If net_amount_w2 is set, use it (W-2 specific)
  if (gig.net_amount_w2 != null) {
    return gig.net_amount_w2;
  }
  
  // Otherwise use gross_amount (standard field)
  if (gig.gross_amount != null) {
    return gig.gross_amount;
  }
  
  // Fallback to net_amount if set
  if (gig.net_amount != null) {
    return gig.net_amount;
  }
  
  return 0;
}

/**
 * Get the tax basis amount for a gig (used in tax calculations)
 * For contractor gigs: use gross_amount
 * For W-2 gigs: return 0 (excluded from tax set-aside)
 */
export function getGigTaxBasisAmount(
  gig: Partial<Gig>,
  payer: Pick<Payer, 'tax_treatment'> | null
): number {
  if (shouldExcludeFromTaxSetAside(gig as Pick<Gig, 'tax_treatment'>, payer)) {
    return 0;
  }
  
  return gig.gross_amount || 0;
}

/**
 * Get human-readable label for tax treatment
 */
export function getTaxTreatmentLabel(treatment: TaxTreatment | string | null): string {
  switch (treatment) {
    case 'w2':
      return 'W-2 (Payroll)';
    case 'contractor_1099':
      return '1099 / Contractor';
    case 'other':
      return 'Other / Mixed';
    default:
      return '1099 / Contractor'; // Default
  }
}

/**
 * Get short label for tax treatment (for badges)
 */
export function getTaxTreatmentShortLabel(treatment: TaxTreatment | string | null): string {
  switch (treatment) {
    case 'w2':
      return 'W-2';
    case 'contractor_1099':
      return '1099';
    case 'other':
      return 'Other';
    default:
      return '1099';
  }
}

/**
 * Determine default amount_type based on tax treatment
 */
export function getDefaultAmountType(treatment: TaxTreatment | string | null): 'gross' | 'net' {
  return treatment === 'w2' ? 'net' : 'gross';
}

/**
 * Type guard: Check if tax treatment is W-2
 */
export function isW2(treatment: TaxTreatment | string | null | undefined): boolean {
  return treatment === 'w2';
}

/**
 * Type guard: Check if tax treatment is 1099 contractor
 */
export function is1099(treatment: TaxTreatment | string | null | undefined): boolean {
  return treatment === 'contractor_1099';
}

/**
 * Type guard: Check if tax treatment should be included in Schedule C
 * Only contractor_1099 gigs are included in Schedule C / self-employment calculations
 * W-2 and 'other' are EXCLUDED
 */
export function shouldIncludeInScheduleC(treatment: TaxTreatment | string | null | undefined): boolean {
  return treatment === 'contractor_1099';
}

/**
 * Filter gigs to only those that should appear in Schedule C exports
 * CRITICAL: This is the single source of truth for Schedule C filtering
 * Only contractor_1099 gigs are included; W-2 and other are excluded
 */
export function filterGigsForScheduleC<T extends { tax_treatment?: string | null }>(gigs: T[], payers?: Map<string, Pick<Payer, 'tax_treatment'>>): T[] {
  return gigs.filter(gig => {
    let effectiveTreatment: TaxTreatment;
    
    if (gig.tax_treatment) {
      effectiveTreatment = gig.tax_treatment as TaxTreatment;
    } else if (payers && 'payer_id' in gig) {
      const payer = payers.get((gig as any).payer_id);
      effectiveTreatment = payer?.tax_treatment as TaxTreatment || 'contractor_1099';
    } else {
      effectiveTreatment = 'contractor_1099'; // Default
    }
    
    return shouldIncludeInScheduleC(effectiveTreatment);
  });
}

/**
 * Split gigs by tax treatment for reporting/export purposes
 * Returns separate arrays for W-2, 1099, and other gigs
 */
export function splitGigsByTaxTreatment<T extends { tax_treatment?: string | null }>(gigs: T[], payers?: Map<string, Pick<Payer, 'tax_treatment'>>): {
  w2: T[];
  contractor_1099: T[];
  other: T[];
} {
  const result = {
    w2: [] as T[],
    contractor_1099: [] as T[],
    other: [] as T[],
  };
  
  for (const gig of gigs) {
    let effectiveTreatment: TaxTreatment;
    
    if (gig.tax_treatment) {
      effectiveTreatment = gig.tax_treatment as TaxTreatment;
    } else if (payers && 'payer_id' in gig) {
      const payer = payers.get((gig as any).payer_id);
      effectiveTreatment = payer?.tax_treatment as TaxTreatment || 'contractor_1099';
    } else {
      effectiveTreatment = 'contractor_1099'; // Default
    }
    
    result[effectiveTreatment].push(gig);
  }
  
  return result;
}

/**
 * Calculate total income by tax treatment
 * Returns breakdown of income by W-2, 1099, and other
 */
export function calculateIncomeBySplit<T extends { gross_amount?: number | null; tips?: number | null; per_diem?: number | null; other_income?: number | null; fees?: number | null; tax_treatment?: string | null }>(gigs: T[], payers?: Map<string, Pick<Payer, 'tax_treatment'>>): {
  total: number;
  w2: number;
  contractor_1099: number;
  other: number;
} {
  const split = splitGigsByTaxTreatment(gigs, payers);
  
  const calculateGigIncome = (gig: T) => {
    return (gig.gross_amount || 0) + (gig.tips || 0) + (gig.per_diem || 0) + (gig.other_income || 0) - (gig.fees || 0);
  };
  
  const w2Total = split.w2.reduce((sum, gig) => sum + calculateGigIncome(gig), 0);
  const contractor1099Total = split.contractor_1099.reduce((sum, gig) => sum + calculateGigIncome(gig), 0);
  const otherTotal = split.other.reduce((sum, gig) => sum + calculateGigIncome(gig), 0);
  
  return {
    total: w2Total + contractor1099Total + otherTotal,
    w2: w2Total,
    contractor_1099: contractor1099Total,
    other: otherTotal,
  };
}
