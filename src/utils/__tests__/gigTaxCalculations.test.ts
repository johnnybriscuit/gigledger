import { calculateGigTaxSummary, type BusinessStructureGigTaxInput } from '../gigTaxCalculations';

describe('calculateGigTaxSummary with BusinessStructure', () => {
  const mockTaxBreakdown = {
    federal: 1000,
    state: 500,
    seTax: 800,
    total: 2300,
  };

  describe('individual business structure', () => {
    it('should calculate SE tax for individual on free plan', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'individual',
        plan: 'free',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.gross).toBe(10000);
      expect(result.expensesTotal).toBe(2000);
      expect(result.netBeforeTax).toBe(8000);
      expect(result.taxToSetAside).toBe(2300);
      expect(result.takeHome).toBe(5700);
      expect(result.federal).toBe(1000);
      expect(result.state).toBe(500);
      expect(result.seTax).toBe(800);
      expect(result.mode).toBe('self_employment');
      expect(result.business_structure).toBe('individual');
    });

    it('should calculate SE tax for individual on pro plan', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'individual',
        plan: 'pro',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.mode).toBe('self_employment');
      expect(result.seTax).toBe(800);
      expect(result.taxToSetAside).toBe(2300);
    });
  });

  describe('llc_single_member business structure', () => {
    it('should calculate SE tax for single-member LLC on free plan', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'llc_single_member',
        plan: 'free',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.mode).toBe('self_employment');
      expect(result.seTax).toBe(800);
      expect(result.taxToSetAside).toBe(2300);
      expect(result.business_structure).toBe('llc_single_member');
    });

    it('should calculate SE tax for single-member LLC on pro plan', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'llc_single_member',
        plan: 'pro',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.mode).toBe('self_employment');
      expect(result.seTax).toBe(800);
      expect(result.taxToSetAside).toBe(2300);
    });
  });

  describe('llc_scorp business structure', () => {
    it('should NOT calculate SE tax for S-Corp on pro plan', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'llc_scorp',
        plan: 'pro',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.gross).toBe(10000);
      expect(result.expensesTotal).toBe(2000);
      expect(result.netBeforeTax).toBe(8000);
      expect(result.taxToSetAside).toBe(0);
      expect(result.takeHome).toBe(8000);
      expect(result.federal).toBe(0);
      expect(result.state).toBe(0);
      expect(result.seTax).toBe(0);
      expect(result.mode).toBe('no_se_tax');
      expect(result.business_structure).toBe('llc_scorp');
    });

    it('should NOT calculate SE tax for S-Corp on free plan (client-side check)', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'llc_scorp',
        plan: 'free',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.taxToSetAside).toBe(0);
      expect(result.seTax).toBe(0);
      expect(result.mode).toBe('no_se_tax');
    });
  });

  describe('llc_multi_member business structure', () => {
    it('should NOT calculate SE tax for multi-member LLC on free plan', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'llc_multi_member',
        plan: 'free',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.gross).toBe(10000);
      expect(result.expensesTotal).toBe(2000);
      expect(result.netBeforeTax).toBe(8000);
      expect(result.taxToSetAside).toBe(0);
      expect(result.takeHome).toBe(8000);
      expect(result.seTax).toBe(0);
      expect(result.mode).toBe('no_se_tax');
      expect(result.business_structure).toBe('llc_multi_member');
    });

    it('should NOT calculate SE tax for multi-member LLC on pro plan', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: mockTaxBreakdown,
        business_structure: 'llc_multi_member',
        plan: 'pro',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.taxToSetAside).toBe(0);
      expect(result.seTax).toBe(0);
      expect(result.mode).toBe('no_se_tax');
    });
  });

  describe('edge cases', () => {
    it('should handle zero gross income', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 0,
        expensesTotal: 0,
        taxBreakdown: { federal: 0, state: 0, seTax: 0, total: 0 },
        business_structure: 'individual',
        plan: 'free',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.netBeforeTax).toBe(0);
      expect(result.taxToSetAside).toBe(0);
      expect(result.takeHome).toBe(0);
      expect(result.effectiveRate).toBe(0);
    });

    it('should handle expenses exceeding gross', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 5000,
        expensesTotal: 7000,
        taxBreakdown: { federal: 0, state: 0, seTax: 0, total: 0 },
        business_structure: 'individual',
        plan: 'free',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.netBeforeTax).toBe(-2000);
      expect(result.takeHome).toBe(-2000);
    });

    it('should calculate effective rate correctly', () => {
      const input: BusinessStructureGigTaxInput = {
        gross: 10000,
        expensesTotal: 2000,
        taxBreakdown: { federal: 1000, state: 500, seTax: 800, total: 2300 },
        business_structure: 'individual',
        plan: 'free',
      };

      const result = calculateGigTaxSummary(input);

      expect(result.effectiveRate).toBeCloseTo(2300 / 8000, 5);
    });
  });
});
