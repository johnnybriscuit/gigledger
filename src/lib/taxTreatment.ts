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
