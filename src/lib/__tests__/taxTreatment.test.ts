/**
 * Unit tests for tax treatment logic
 * 
 * These tests verify the single source of truth for W-2 vs 1099 handling
 * and ensure W-2 gigs are correctly excluded from Schedule C calculations
 */

import { describe, it, expect } from 'vitest';
import {
  getEffectiveTaxTreatment,
  shouldExcludeFromTaxSetAside,
  isW2,
  is1099,
  shouldIncludeInScheduleC,
  filterGigsForScheduleC,
  splitGigsByTaxTreatment,
  calculateIncomeBySplit,
} from '../taxTreatment';
import {
  GOLDEN_PAYERS,
  GOLDEN_GIGS,
  GOLDEN_EXPECTED,
  createPayerMap,
  validateGoldenDataset,
} from './fixtures/taxTreatmentGoldenDataset';

describe('Tax Treatment Logic', () => {
  describe('Golden Dataset Validation', () => {
    it('should have valid golden dataset with correct invariants', () => {
      const validation = validateGoldenDataset();
      expect(validation.valid).toBe(true);
      expect(validation.errors).toEqual([]);
    });
  });

  describe('getEffectiveTaxTreatment', () => {
    it('should use gig tax_treatment when explicitly set', () => {
      const gig = { tax_treatment: 'w2' };
      const payer = { tax_treatment: 'contractor_1099' };
      expect(getEffectiveTaxTreatment(gig, payer)).toBe('w2');
    });

    it('should inherit from payer when gig tax_treatment is null', () => {
      const gig = { tax_treatment: null };
      const payer = { tax_treatment: 'w2' };
      expect(getEffectiveTaxTreatment(gig, payer)).toBe('w2');
    });

    it('should default to contractor_1099 when both are null', () => {
      const gig = { tax_treatment: null };
      const payer = { tax_treatment: null as any };
      expect(getEffectiveTaxTreatment(gig, payer)).toBe('contractor_1099');
    });

    it('should handle null gig', () => {
      const payer = { tax_treatment: 'w2' };
      expect(getEffectiveTaxTreatment(null, payer)).toBe('w2');
    });

    it('should handle null payer', () => {
      const gig = { tax_treatment: 'contractor_1099' };
      expect(getEffectiveTaxTreatment(gig, null)).toBe('contractor_1099');
    });
  });

  describe('Type Guards', () => {
    it('isW2 should correctly identify W-2 treatment', () => {
      expect(isW2('w2')).toBe(true);
      expect(isW2('contractor_1099')).toBe(false);
      expect(isW2('other')).toBe(false);
      expect(isW2(null)).toBe(false);
      expect(isW2(undefined)).toBe(false);
    });

    it('is1099 should correctly identify 1099 treatment', () => {
      expect(is1099('contractor_1099')).toBe(true);
      expect(is1099('w2')).toBe(false);
      expect(is1099('other')).toBe(false);
      expect(is1099(null)).toBe(false);
    });

    it('shouldIncludeInScheduleC should only return true for contractor_1099', () => {
      expect(shouldIncludeInScheduleC('contractor_1099')).toBe(true);
      expect(shouldIncludeInScheduleC('w2')).toBe(false);
      expect(shouldIncludeInScheduleC('other')).toBe(false);
      expect(shouldIncludeInScheduleC(null)).toBe(false);
    });
  });

  describe('shouldExcludeFromTaxSetAside', () => {
    it('should exclude W-2 gigs from tax set-aside', () => {
      const gig = { tax_treatment: null };
      const payer = { tax_treatment: 'w2' };
      expect(shouldExcludeFromTaxSetAside(gig, payer)).toBe(true);
    });

    it('should include 1099 gigs in tax set-aside', () => {
      const gig = { tax_treatment: null };
      const payer = { tax_treatment: 'contractor_1099' };
      expect(shouldExcludeFromTaxSetAside(gig, payer)).toBe(false);
    });

    it('should respect gig override: W-2 payer + 1099 gig override = included', () => {
      const gig = { tax_treatment: 'contractor_1099' };
      const payer = { tax_treatment: 'w2' };
      expect(shouldExcludeFromTaxSetAside(gig, payer)).toBe(false);
    });

    it('should respect gig override: 1099 payer + W-2 gig override = excluded', () => {
      const gig = { tax_treatment: 'w2' };
      const payer = { tax_treatment: 'contractor_1099' };
      expect(shouldExcludeFromTaxSetAside(gig, payer)).toBe(true);
    });
  });

  describe('filterGigsForScheduleC', () => {
    const payerMap = createPayerMap();

    it('should only include contractor_1099 gigs in Schedule C', () => {
      const filtered = filterGigsForScheduleC(GOLDEN_GIGS as any[], payerMap as any);
      
      // Should only include the two 1099 gigs
      expect(filtered.length).toBe(2);
      expect(filtered.map(g => g.id)).toEqual(['gig-1099-1', 'gig-1099-2']);
    });

    it('should exclude W-2 gigs from Schedule C', () => {
      const filtered = filterGigsForScheduleC(GOLDEN_GIGS as any[], payerMap as any);
      
      // Should NOT include the W-2 gig
      const w2GigIds = filtered.map(g => g.id);
      expect(w2GigIds).not.toContain('gig-w2-1');
    });

    it('should handle gigs with explicit tax_treatment', () => {
      const gigs = [
        { id: '1', tax_treatment: 'contractor_1099', gross_amount: 100 },
        { id: '2', tax_treatment: 'w2', gross_amount: 200 },
        { id: '3', tax_treatment: 'other', gross_amount: 300 },
      ];
      
      const filtered = filterGigsForScheduleC(gigs);
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should default to contractor_1099 when no payer map provided', () => {
      const gigs = [
        { id: '1', tax_treatment: null, gross_amount: 100 },
      ];
      
      const filtered = filterGigsForScheduleC(gigs);
      expect(filtered.length).toBe(1);
    });
  });

  describe('splitGigsByTaxTreatment', () => {
    const payerMap = createPayerMap();

    it('should correctly split gigs by tax treatment', () => {
      const split = splitGigsByTaxTreatment(GOLDEN_GIGS as any[], payerMap as any);
      
      expect(split.w2.length).toBe(1);
      expect(split.contractor_1099.length).toBe(2);
      expect(split.other.length).toBe(0);
      
      expect(split.w2[0].id).toBe('gig-w2-1');
      expect(split.contractor_1099.map(g => g.id)).toEqual(['gig-1099-1', 'gig-1099-2']);
    });

    it('should handle explicit tax_treatment on gigs', () => {
      const gigs = [
        { id: '1', tax_treatment: 'w2', payer_id: 'any' },
        { id: '2', tax_treatment: 'contractor_1099', payer_id: 'any' },
        { id: '3', tax_treatment: 'other', payer_id: 'any' },
      ];
      
      const split = splitGigsByTaxTreatment(gigs);
      
      expect(split.w2.length).toBe(1);
      expect(split.contractor_1099.length).toBe(1);
      expect(split.other.length).toBe(1);
    });
  });

  describe('calculateIncomeBySplit', () => {
    const payerMap = createPayerMap();

    it('should calculate correct income totals from golden dataset', () => {
      const income = calculateIncomeBySplit(GOLDEN_GIGS as any[], payerMap as any);
      
      expect(income.total).toBe(GOLDEN_EXPECTED.totalIncome);
      expect(income.w2).toBe(GOLDEN_EXPECTED.w2Income);
      expect(income.contractor_1099).toBe(GOLDEN_EXPECTED.contractor1099Income);
      expect(income.other).toBe(GOLDEN_EXPECTED.otherIncome);
    });

    it('should include tips, per_diem, other_income and subtract fees', () => {
      const gigs = [
        {
          tax_treatment: 'contractor_1099',
          gross_amount: 1000,
          tips: 100,
          per_diem: 50,
          other_income: 25,
          fees: 75,
        },
      ];
      
      const income = calculateIncomeBySplit(gigs);
      
      // 1000 + 100 + 50 + 25 - 75 = 1100
      expect(income.contractor_1099).toBe(1100);
      expect(income.total).toBe(1100);
    });

    it('should handle null/undefined amounts', () => {
      const gigs = [
        {
          tax_treatment: 'contractor_1099',
          gross_amount: 1000,
          tips: null,
          per_diem: undefined,
          other_income: null,
          fees: null,
        },
      ];
      
      const income = calculateIncomeBySplit(gigs);
      expect(income.contractor_1099).toBe(1000);
    });
  });

  describe('Schedule C Invariants (Critical Tests)', () => {
    const payerMap = createPayerMap();

    it('CRITICAL: Schedule C gigs must equal expected 1099 gigs from golden dataset', () => {
      const scheduleCGigs = filterGigsForScheduleC(GOLDEN_GIGS as any[], payerMap as any);
      const scheduleCGigIds = scheduleCGigs.map(g => g.id);
      
      expect(scheduleCGigIds).toEqual(GOLDEN_EXPECTED.exports.scheduleCGigIds);
    });

    it('CRITICAL: Schedule C income must exclude W-2 and equal expected amount', () => {
      const scheduleCGigs = filterGigsForScheduleC(GOLDEN_GIGS as any[], payerMap as any);
      const scheduleCIncome = scheduleCGigs.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0);
      
      expect(scheduleCIncome).toBe(GOLDEN_EXPECTED.scheduleCGrossIncome);
    });

    it('CRITICAL: W-2 gigs must never appear in Schedule C filter', () => {
      const scheduleCGigs = filterGigsForScheduleC(GOLDEN_GIGS as any[], payerMap as any);
      const hasW2Gigs = scheduleCGigs.some(gig => {
        const payer = payerMap.get(gig.payer_id!);
        const effectiveTreatment = getEffectiveTaxTreatment(gig as any, payer as any);
        return effectiveTreatment === 'w2';
      });
      
      expect(hasW2Gigs).toBe(false);
    });

    it('CRITICAL: Adding/removing W-2 gigs should not change Schedule C totals', () => {
      // Calculate Schedule C total with all gigs
      const scheduleCGigs1 = filterGigsForScheduleC(GOLDEN_GIGS as any[], payerMap as any);
      const total1 = scheduleCGigs1.reduce((sum, g) => sum + (g.gross_amount || 0), 0);
      
      // Add a W-2 gig
      const gigsWithExtraW2 = [
        ...GOLDEN_GIGS,
        {
          id: 'extra-w2',
          payer_id: 'payer-w2-test',
          gross_amount: 5000,
          tax_treatment: null,
        },
      ];
      
      const scheduleCGigs2 = filterGigsForScheduleC(gigsWithExtraW2 as any[], payerMap as any);
      const total2 = scheduleCGigs2.reduce((sum, g) => sum + (g.gross_amount || 0), 0);
      
      // Schedule C total should be unchanged
      expect(total2).toBe(total1);
      expect(total2).toBe(GOLDEN_EXPECTED.scheduleCGrossIncome);
    });
  });
});
