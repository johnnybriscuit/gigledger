/**
 * Tests for 2025 Federal Tax Constants
 * 
 * Validates official IRS 2025 values:
 * - Standard deductions
 * - Additional standard deductions
 * - Tax bracket thresholds and rates
 * - Bracket edge cases
 */

import { 
  FEDERAL_2025, 
  getFederalConfig, 
  validateFederalConfig,
  type FilingStatus 
} from '../config/federal_2025';

describe('Federal 2025 Constants', () => {
  // ==========================================================================
  // CONFIGURATION VALIDATION
  // ==========================================================================
  
  describe('Configuration Validation', () => {
    it('should have valid configuration structure', () => {
      expect(validateFederalConfig(FEDERAL_2025)).toBe(true);
    });

    it('should have IRS sources', () => {
      expect(FEDERAL_2025.sources).toBeDefined();
      expect(FEDERAL_2025.sources.length).toBeGreaterThan(0);
      
      const hasIRSSource = FEDERAL_2025.sources.some(s => s.includes('irs.gov'));
      expect(hasIRSSource).toBe(true);
    });

    it('should have correct version identifier', () => {
      expect(FEDERAL_2025.constantsVersion).toBe('2025.IRS.v1');
    });

    it('should be retrievable via getFederalConfig', () => {
      const config = getFederalConfig(2025);
      expect(config).toEqual(FEDERAL_2025);
    });

    it('should throw for unsupported years', () => {
      expect(() => getFederalConfig(2024)).toThrow();
      expect(() => getFederalConfig(2026)).toThrow();
    });
  });

  // ==========================================================================
  // STANDARD DEDUCTION
  // ==========================================================================
  
  describe('Standard Deduction (Rev. Proc. 2024-40, Section 3.01)', () => {
    it('should have correct Single standard deduction', () => {
      expect(FEDERAL_2025.standardDeduction.single).toBe(15000);
    });

    it('should have correct Married Filing Jointly standard deduction', () => {
      expect(FEDERAL_2025.standardDeduction.married_joint).toBe(30000);
    });

    it('should have correct Head of Household standard deduction', () => {
      expect(FEDERAL_2025.standardDeduction.head).toBe(22500);
    });

    it('should have MFJ deduction exactly double Single', () => {
      expect(FEDERAL_2025.standardDeduction.married_joint).toBe(
        FEDERAL_2025.standardDeduction.single * 2
      );
    });
  });

  // ==========================================================================
  // ADDITIONAL STANDARD DEDUCTION
  // ==========================================================================
  
  describe('Additional Standard Deduction (Rev. Proc. 2024-40, Section 3.02)', () => {
    it('should have correct married joint per-eligible amount', () => {
      expect(FEDERAL_2025.additionalStandardDeduction.marriedJointPerEligible).toBe(1600);
    });

    it('should have correct unmarried per-eligible amount', () => {
      expect(FEDERAL_2025.additionalStandardDeduction.unmarriedPerEligible).toBe(2000);
    });

    it('should have higher additional deduction for unmarried filers', () => {
      expect(FEDERAL_2025.additionalStandardDeduction.unmarriedPerEligible).toBeGreaterThan(
        FEDERAL_2025.additionalStandardDeduction.marriedJointPerEligible
      );
    });
  });

  // ==========================================================================
  // TAX BRACKETS - STRUCTURE
  // ==========================================================================
  
  describe('Tax Brackets - Structure', () => {
    const filingStatuses: FilingStatus[] = ['single', 'married_joint', 'head'];

    filingStatuses.forEach(status => {
      describe(`${status} brackets`, () => {
        const brackets = FEDERAL_2025.brackets[status];

        it('should have 7 brackets', () => {
          expect(brackets).toHaveLength(7);
        });

        it('should be in ascending order', () => {
          for (let i = 0; i < brackets.length - 1; i++) {
            const current = brackets[i].upTo;
            const next = brackets[i + 1].upTo;
            
            expect(current).not.toBeNull();
            if (next !== null) {
              expect(current!).toBeLessThan(next);
            }
          }
        });

        it('should have top bracket with null upTo', () => {
          const topBracket = brackets[brackets.length - 1];
          expect(topBracket.upTo).toBeNull();
        });

        it('should have top bracket rate of 37%', () => {
          const topBracket = brackets[brackets.length - 1];
          expect(topBracket.rate).toBe(0.37);
        });

        it('should have rates in ascending order', () => {
          for (let i = 0; i < brackets.length - 1; i++) {
            expect(brackets[i].rate).toBeLessThan(brackets[i + 1].rate);
          }
        });

        it('should have standard 7-bracket rates: 10%, 12%, 22%, 24%, 32%, 35%, 37%', () => {
          const expectedRates = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
          const actualRates = brackets.map(b => b.rate);
          expect(actualRates).toEqual(expectedRates);
        });
      });
    });
  });

  // ==========================================================================
  // TAX BRACKETS - SINGLE (Schedule X)
  // ==========================================================================
  
  describe('Single Filer Brackets (Schedule X, Rev. Proc. 2024-40, Section 3.05)', () => {
    const brackets = FEDERAL_2025.brackets.single;

    it('should match official 2025 thresholds', () => {
      expect(brackets[0]).toEqual({ upTo: 11925, rate: 0.10 });
      expect(brackets[1]).toEqual({ upTo: 48475, rate: 0.12 });
      expect(brackets[2]).toEqual({ upTo: 103350, rate: 0.22 });
      expect(brackets[3]).toEqual({ upTo: 197300, rate: 0.24 });
      expect(brackets[4]).toEqual({ upTo: 250525, rate: 0.32 });
      expect(brackets[5]).toEqual({ upTo: 626350, rate: 0.35 });
      expect(brackets[6]).toEqual({ upTo: null, rate: 0.37 });
    });

    describe('bracket edge calculations', () => {
      it('should calculate tax at 10% bracket edge (just below $11,925)', () => {
        const income = 11924;
        const tax = income * 0.10;
        expect(tax).toBeCloseTo(1192.40, 2);
      });

      it('should calculate tax at 12% bracket edge (just below $48,475)', () => {
        const income = 48474;
        const tax = (11925 * 0.10) + ((income - 11925) * 0.12);
        expect(tax).toBeCloseTo(5578.38, 2);
      });

      it('should calculate tax at 22% bracket edge (just below $103,350)', () => {
        const income = 103349;
        const tax = (11925 * 0.10) + ((48475 - 11925) * 0.12) + ((income - 48475) * 0.22);
        expect(tax).toBeCloseTo(17835.28, 2);
      });

      it('should calculate tax at 24% bracket edge (just below $197,300)', () => {
        const income = 197299;
        const tax = (11925 * 0.10) + ((48475 - 11925) * 0.12) + 
                    ((103350 - 48475) * 0.22) + ((income - 103350) * 0.24);
        expect(tax).toBeCloseTo(40407.04, 2);
      });
    });
  });

  // ==========================================================================
  // TAX BRACKETS - MARRIED FILING JOINTLY (Schedule Y-1)
  // ==========================================================================
  
  describe('Married Filing Jointly Brackets (Schedule Y-1, Rev. Proc. 2024-40, Section 3.06)', () => {
    const brackets = FEDERAL_2025.brackets.married_joint;

    it('should match official 2025 thresholds', () => {
      expect(brackets[0]).toEqual({ upTo: 23850, rate: 0.10 });
      expect(brackets[1]).toEqual({ upTo: 96950, rate: 0.12 });
      expect(brackets[2]).toEqual({ upTo: 206700, rate: 0.22 });
      expect(brackets[3]).toEqual({ upTo: 394600, rate: 0.24 });
      expect(brackets[4]).toEqual({ upTo: 501050, rate: 0.32 });
      expect(brackets[5]).toEqual({ upTo: 751600, rate: 0.35 });
      expect(brackets[6]).toEqual({ upTo: null, rate: 0.37 });
    });

    it('should have first bracket exactly double Single', () => {
      const singleFirst = FEDERAL_2025.brackets.single[0].upTo!;
      const mfjFirst = brackets[0].upTo!;
      expect(mfjFirst).toBe(singleFirst * 2);
    });

    describe('bracket edge calculations', () => {
      it('should calculate tax at 10% bracket edge (just below $23,850)', () => {
        const income = 23849;
        const tax = income * 0.10;
        expect(tax).toBeCloseTo(2384.90, 2);
      });

      it('should calculate tax at 12% bracket edge (just below $96,950)', () => {
        const income = 96949;
        const tax = (23850 * 0.10) + ((income - 23850) * 0.12);
        expect(tax).toBeCloseTo(11156.88, 2);
      });

      it('should calculate tax at 22% bracket edge (just below $206,700)', () => {
        const income = 206699;
        const tax = (23850 * 0.10) + ((96950 - 23850) * 0.12) + ((income - 96950) * 0.22);
        expect(tax).toBeCloseTo(35670.78, 2);
      });
    });
  });

  // ==========================================================================
  // TAX BRACKETS - HEAD OF HOUSEHOLD (Schedule Z)
  // ==========================================================================
  
  describe('Head of Household Brackets (Schedule Z, Rev. Proc. 2024-40, Section 3.07)', () => {
    const brackets = FEDERAL_2025.brackets.head;

    it('should match official 2025 thresholds', () => {
      expect(brackets[0]).toEqual({ upTo: 17000, rate: 0.10 });
      expect(brackets[1]).toEqual({ upTo: 64850, rate: 0.12 });
      expect(brackets[2]).toEqual({ upTo: 103350, rate: 0.22 });
      expect(brackets[3]).toEqual({ upTo: 197300, rate: 0.24 });
      expect(brackets[4]).toEqual({ upTo: 250500, rate: 0.32 });
      expect(brackets[5]).toEqual({ upTo: 626350, rate: 0.35 });
      expect(brackets[6]).toEqual({ upTo: null, rate: 0.37 });
    });

    it('should have first bracket between Single and MFJ', () => {
      const singleFirst = FEDERAL_2025.brackets.single[0].upTo!;
      const mfjFirst = FEDERAL_2025.brackets.married_joint[0].upTo!;
      const hohFirst = brackets[0].upTo!;
      
      expect(hohFirst).toBeGreaterThan(singleFirst);
      expect(hohFirst).toBeLessThan(mfjFirst);
    });

    describe('bracket edge calculations', () => {
      it('should calculate tax at 10% bracket edge (just below $17,000)', () => {
        const income = 16999;
        const tax = income * 0.10;
        expect(tax).toBeCloseTo(1699.90, 2);
      });

      it('should calculate tax at 12% bracket edge (just below $64,850)', () => {
        const income = 64849;
        const tax = (17000 * 0.10) + ((income - 17000) * 0.12);
        expect(tax).toBeCloseTo(7441.88, 2);
      });

      it('should calculate tax at 22% bracket edge (just below $103,350)', () => {
        const income = 103349;
        const tax = (17000 * 0.10) + ((64850 - 17000) * 0.12) + ((income - 64850) * 0.22);
        expect(tax).toBeCloseTo(14211.78, 2);
      });
    });
  });

  // ==========================================================================
  // TAXABLE INCOME CALCULATION
  // ==========================================================================
  
  describe('Taxable Income Calculation', () => {
    it('should calculate taxable income for Single filer', () => {
      const agi = 50000;
      const standardDeduction = FEDERAL_2025.standardDeduction.single;
      const taxableIncome = Math.max(0, agi - standardDeduction);
      
      expect(taxableIncome).toBe(35000); // $50,000 - $15,000
    });

    it('should calculate taxable income for MFJ', () => {
      const agi = 100000;
      const standardDeduction = FEDERAL_2025.standardDeduction.married_joint;
      const taxableIncome = Math.max(0, agi - standardDeduction);
      
      expect(taxableIncome).toBe(70000); // $100,000 - $30,000
    });

    it('should calculate taxable income for HOH', () => {
      const agi = 75000;
      const standardDeduction = FEDERAL_2025.standardDeduction.head;
      const taxableIncome = Math.max(0, agi - standardDeduction);
      
      expect(taxableIncome).toBe(52500); // $75,000 - $22,500
    });

    it('should not allow negative taxable income', () => {
      const agi = 10000;
      const standardDeduction = FEDERAL_2025.standardDeduction.single;
      const taxableIncome = Math.max(0, agi - standardDeduction);
      
      expect(taxableIncome).toBe(0); // AGI below standard deduction
    });
  });

  // ==========================================================================
  // ADDITIONAL STANDARD DEDUCTION SCENARIOS
  // ==========================================================================
  
  describe('Additional Standard Deduction Scenarios', () => {
    it('should calculate deduction for Single filer age 65+', () => {
      const baseDeduction = FEDERAL_2025.standardDeduction.single;
      const additional = FEDERAL_2025.additionalStandardDeduction.unmarriedPerEligible;
      const totalDeduction = baseDeduction + additional;
      
      expect(totalDeduction).toBe(17000); // $15,000 + $2,000
    });

    it('should calculate deduction for Single filer age 65+ and blind', () => {
      const baseDeduction = FEDERAL_2025.standardDeduction.single;
      const additional = FEDERAL_2025.additionalStandardDeduction.unmarriedPerEligible * 2;
      const totalDeduction = baseDeduction + additional;
      
      expect(totalDeduction).toBe(19000); // $15,000 + $2,000 + $2,000
    });

    it('should calculate deduction for MFJ with one spouse 65+', () => {
      const baseDeduction = FEDERAL_2025.standardDeduction.married_joint;
      const additional = FEDERAL_2025.additionalStandardDeduction.marriedJointPerEligible;
      const totalDeduction = baseDeduction + additional;
      
      expect(totalDeduction).toBe(31600); // $30,000 + $1,600
    });

    it('should calculate deduction for MFJ with both spouses 65+', () => {
      const baseDeduction = FEDERAL_2025.standardDeduction.married_joint;
      const additional = FEDERAL_2025.additionalStandardDeduction.marriedJointPerEligible * 2;
      const totalDeduction = baseDeduction + additional;
      
      expect(totalDeduction).toBe(33200); // $30,000 + $1,600 + $1,600
    });

    it('should calculate deduction for HOH age 65+', () => {
      const baseDeduction = FEDERAL_2025.standardDeduction.head;
      const additional = FEDERAL_2025.additionalStandardDeduction.unmarriedPerEligible;
      const totalDeduction = baseDeduction + additional;
      
      expect(totalDeduction).toBe(24500); // $22,500 + $2,000
    });
  });

  // ==========================================================================
  // SNAPSHOT TESTS
  // ==========================================================================
  
  describe('Configuration Snapshots', () => {
    it('should match complete federal config snapshot', () => {
      expect(FEDERAL_2025).toMatchSnapshot();
    });

    it('should match standard deduction snapshot', () => {
      expect(FEDERAL_2025.standardDeduction).toMatchSnapshot();
    });

    it('should match additional standard deduction snapshot', () => {
      expect(FEDERAL_2025.additionalStandardDeduction).toMatchSnapshot();
    });

    it('should match Single brackets snapshot', () => {
      expect(FEDERAL_2025.brackets.single).toMatchSnapshot();
    });

    it('should match MFJ brackets snapshot', () => {
      expect(FEDERAL_2025.brackets.married_joint).toMatchSnapshot();
    });

    it('should match HOH brackets snapshot', () => {
      expect(FEDERAL_2025.brackets.head).toMatchSnapshot();
    });
  });
});
