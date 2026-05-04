/**
 * Tax Engine Unit Tests
 * 
 * Tests for 2025 tax calculations with dummy brackets
 */

import {
  calcBracketTax,
  calcTaxableIncome,
  calcFederalTax,
  calcStateTax,
  calcSETax,
  calcTotalTax,
  taxDeltaForGig,
  calcYTDEffectiveRate,
  calculateSplitTax,
  type TaxProfile,
  type YTDData,
  type GigData,
} from './engine';
import config2025 from './config/2025';

describe('Tax Engine', () => {
  // ============================================================================
  // CORE CALCULATIONS
  // ============================================================================

  describe('calcBracketTax', () => {
    it('should calculate tax in single bracket', () => {
      const brackets = [{ upTo: null, rate: 0.10 }];
      expect(calcBracketTax(10000, brackets)).toBe(1000);
    });

    it('should calculate tax across multiple brackets', () => {
      const brackets = [
        { upTo: 10000, rate: 0.10 },
        { upTo: 20000, rate: 0.20 },
        { upTo: null, rate: 0.30 },
      ];
      // First $10k at 10% = $1,000
      // Next $10k at 20% = $2,000
      // Next $5k at 30% = $1,500
      // Total = $4,500
      expect(calcBracketTax(25000, brackets)).toBe(4500);
    });

    it('should handle amount exactly at bracket boundary', () => {
      const brackets = [
        { upTo: 10000, rate: 0.10 },
        { upTo: null, rate: 0.20 },
      ];
      expect(calcBracketTax(10000, brackets)).toBe(1000);
    });

    it('should handle zero income', () => {
      const brackets = [{ upTo: null, rate: 0.10 }];
      expect(calcBracketTax(0, brackets)).toBe(0);
    });
  });

  describe('calcTaxableIncome', () => {
    it('should calculate taxable income correctly', () => {
      expect(calcTaxableIncome(100000, 5000, 14600)).toBe(80400);
    });

    it('should not return negative taxable income', () => {
      expect(calcTaxableIncome(10000, 5000, 20000)).toBe(0);
    });
  });

  // ============================================================================
  // FEDERAL TAX
  // ============================================================================

  describe('calcFederalTax', () => {
    const profile: TaxProfile = {
      filingStatus: 'single',
      state: 'TN',
      deductionMethod: 'standard',
      seIncome: true,
    };

    it('should calculate federal tax for single filer', () => {
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const tax = calcFederalTax(ytd, profile);
      expect(tax).toBeGreaterThan(0);
      expect(tax).toBeLessThan(100000);
    });

    it('should return zero tax for income below standard deduction', () => {
      const ytd: YTDData = {
        grossIncome: 10000,
        adjustments: 0,
        netSE: 10000,
      };
      
      const tax = calcFederalTax(ytd, profile);
      expect(tax).toBe(0);
    });

    it('should use itemized deduction when specified', () => {
      const itemizedProfile: TaxProfile = {
        ...profile,
        deductionMethod: 'itemized',
        itemizedAmount: 25000,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const standardTax = calcFederalTax(ytd, profile);
      const itemizedTax = calcFederalTax(ytd, itemizedProfile);
      
      // Itemized should result in lower tax (higher deduction)
      expect(itemizedTax).toBeLessThan(standardTax);
    });
  });

  // ============================================================================
  // STATE TAX
  // ============================================================================

  describe('calcStateTax', () => {
    it('should return zero for Tennessee (no state income tax)', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'TN',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const { state, local } = calcStateTax(ytd, profile);
      expect(state).toBe(0);
      expect(local).toBe(0);
    });

    it('should return zero for Texas (no state income tax)', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'TX',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const { state, local } = calcStateTax(ytd, profile);
      expect(state).toBe(0);
      expect(local).toBe(0);
    });

    it('should calculate California state tax', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'CA',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const { state, local } = calcStateTax(ytd, profile);
      expect(state).toBeGreaterThan(0);
    });

    it('should apply CA millionaire surtax over $1M', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'CA',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytdUnder: YTDData = {
        grossIncome: 999000,
        adjustments: 0,
        netSE: 999000,
      };
      
      const ytdOver: YTDData = {
        grossIncome: 1100000,
        adjustments: 0,
        netSE: 1100000,
      };
      
      const taxUnder = calcStateTax(ytdUnder, profile);
      const taxOver = calcStateTax(ytdOver, profile);
      
      // Over $1M should have higher effective rate due to surtax
      const effectiveUnder = taxUnder.state / ytdUnder.grossIncome;
      const effectiveOver = taxOver.state / ytdOver.grossIncome;
      expect(effectiveOver).toBeGreaterThan(effectiveUnder);
    });

    it('should calculate NYC resident tax', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'NY',
        nycResident: true,
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const { state, local } = calcStateTax(ytd, profile);
      expect(state).toBeGreaterThan(0);
      expect(local).toBeGreaterThan(0); // NYC tax
    });

    it('should calculate Yonkers surcharge', () => {
      const profileNoYonkers: TaxProfile = {
        filingStatus: 'single',
        state: 'NY',
        yonkersResident: false,
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const profileYonkers: TaxProfile = {
        ...profileNoYonkers,
        yonkersResident: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const taxNoYonkers = calcStateTax(ytd, profileNoYonkers);
      const taxYonkers = calcStateTax(ytd, profileYonkers);
      
      // Yonkers should have higher local tax
      expect(taxYonkers.local).toBeGreaterThan(taxNoYonkers.local);
    });

    it('should calculate Maryland county tax', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'MD',
        county: 'Baltimore City',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const { state, local } = calcStateTax(ytd, profile);
      expect(state).toBeGreaterThan(0);
      expect(local).toBeGreaterThan(0); // County tax
    });
  });

  // ============================================================================
  // SELF-EMPLOYMENT TAX
  // ============================================================================

  describe('calcSETax', () => {
    const profile: TaxProfile = {
      filingStatus: 'single',
      state: 'TN',
      deductionMethod: 'standard',
      seIncome: true,
    };

    it('should calculate SE tax correctly', () => {
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const seTax = calcSETax(ytd, profile);
      
      // SE tax should be roughly 15.3% of 92.35% of net SE
      const expected = 100000 * 0.9235 * 0.153;
      expect(seTax).toBeCloseTo(expected, -2); // Within $100
    });

    it('should cap Social Security at wage base', () => {
      const ytdUnder: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const ytdOver: YTDData = {
        grossIncome: 200000,
        adjustments: 0,
        netSE: 200000,
      };
      
      const seTaxUnder = calcSETax(ytdUnder, profile);
      const seTaxOver = calcSETax(ytdOver, profile);
      
      // Marginal SE tax rate should be lower over wage base (only Medicare)
      const marginalRate = (seTaxOver - seTaxUnder) / (ytdOver.netSE - ytdUnder.netSE);
      expect(marginalRate).toBeLessThan(0.153); // Less than full SE rate
    });

    it('should apply additional Medicare tax over threshold', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'TN',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytdUnder: YTDData = {
        grossIncome: 190000,
        adjustments: 0,
        netSE: 190000,
      };
      
      const ytdOver: YTDData = {
        grossIncome: 210000,
        adjustments: 0,
        netSE: 210000,
      };
      
      const seTaxUnder = calcSETax(ytdUnder, profile);
      const seTaxOver = calcSETax(ytdOver, profile);
      
      // Should have additional 0.9% Medicare tax over $200k
      expect(seTaxOver).toBeGreaterThan(seTaxUnder);
    });

    it('should return zero if no SE income', () => {
      const profileNoSE: TaxProfile = {
        ...profile,
        seIncome: false,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 0,
      };
      
      const seTax = calcSETax(ytd, profileNoSE);
      expect(seTax).toBe(0);
    });
  });

  // ============================================================================
  // TOTAL TAX
  // ============================================================================

  describe('calcTotalTax', () => {
    it('should sum all tax components', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'CA',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const result = calcTotalTax(ytd, profile);
      
      expect(result.total).toBe(result.federal + result.state + result.local + result.seTax);
      expect(result.effectiveRate).toBeCloseTo(result.total / ytd.grossIncome, 4);
    });

    it('should calculate effective rate correctly', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'TN',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const result = calcTotalTax(ytd, profile);
      
      expect(result.effectiveRate).toBeGreaterThan(0);
      expect(result.effectiveRate).toBeLessThan(1);
    });
  });

  // ============================================================================
  // GIG SET-ASIDE
  // ============================================================================

  describe('taxDeltaForGig', () => {
    const profile: TaxProfile = {
      filingStatus: 'single',
      state: 'CA',
      deductionMethod: 'standard',
      seIncome: true,
    };

    it('should calculate marginal tax for gig', () => {
      const ytd: YTDData = {
        grossIncome: 50000,
        adjustments: 0,
        netSE: 50000,
      };
      
      const gig: GigData = {
        gross: 5000,
        expenses: 500,
      };
      
      const result = taxDeltaForGig(ytd, gig, profile);
      
      expect(result.amount).toBeGreaterThan(0);
      expect(result.rate).toBeGreaterThan(0);
      expect(result.rate).toBeLessThan(1);
      expect(result.breakdown.federal).toBeGreaterThan(0);
      expect(result.breakdown.seTax).toBeGreaterThan(0);
    });

    it('should return zero for gig with no net income', () => {
      const ytd: YTDData = {
        grossIncome: 50000,
        adjustments: 0,
        netSE: 50000,
      };
      
      const gig: GigData = {
        gross: 1000,
        expenses: 1000,
      };
      
      const result = taxDeltaForGig(ytd, gig, profile);
      
      expect(result.amount).toBe(0);
      expect(result.rate).toBe(0);
    });

    it('should show higher marginal rate at higher income', () => {
      const ytdLow: YTDData = {
        grossIncome: 30000,
        adjustments: 0,
        netSE: 30000,
      };
      
      const ytdHigh: YTDData = {
        grossIncome: 150000,
        adjustments: 0,
        netSE: 150000,
      };
      
      const gig: GigData = {
        gross: 5000,
        expenses: 500,
      };
      
      const resultLow = taxDeltaForGig(ytdLow, gig, profile);
      const resultHigh = taxDeltaForGig(ytdHigh, gig, profile);
      
      // Higher income should have higher marginal rate
      expect(resultHigh.rate).toBeGreaterThan(resultLow.rate);
    });

    it('should trigger CA millionaire surtax', () => {
      const ytdUnder: YTDData = {
        grossIncome: 990000,
        adjustments: 0,
        netSE: 990000,
      };
      
      const ytdOver: YTDData = {
        grossIncome: 1010000,
        adjustments: 0,
        netSE: 1010000,
      };
      
      const gig: GigData = {
        gross: 10000,
        expenses: 1000,
      };
      
      const resultUnder = taxDeltaForGig(ytdUnder, gig, profile);
      const resultOver = taxDeltaForGig(ytdOver, gig, profile);
      
      // Crossing $1M threshold should trigger 1% surtax
      expect(resultOver.breakdown.state).toBeGreaterThan(resultUnder.breakdown.state);
    });
  });

  // ============================================================================
  // YTD EFFECTIVE RATE
  // ============================================================================

  describe('calcYTDEffectiveRate', () => {
    it('should calculate YTD effective rate', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'NY',
        nycResident: true,
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const ytd: YTDData = {
        grossIncome: 100000,
        adjustments: 0,
        netSE: 100000,
      };
      
      const result = calcYTDEffectiveRate(ytd, profile);
      
      expect(result.effectiveRate).toBeGreaterThan(0);
      expect(result.totalTax).toBeGreaterThan(0);
      expect(result.breakdown.federal).toBeGreaterThan(0);
      expect(result.breakdown.state).toBeGreaterThan(0);
      expect(result.breakdown.local).toBeGreaterThan(0); // NYC
      expect(result.breakdown.seTax).toBeGreaterThan(0);
      
      // Verify total matches sum
      const sum = result.breakdown.federal + result.breakdown.state + 
                  result.breakdown.local + result.breakdown.seTax;
      expect(result.totalTax).toBeCloseTo(sum, 2);
    });
  });

  // ============================================================================
  // SPLIT TAX CALCULATION (W-2 + 1099)
  // ============================================================================

  describe('calculateSplitTax', () => {
    it('should calculate tax for pure 1099 income, no W-2, supported state (CA)', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'CA',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const result = calculateSplitTax(
        80000,  // gigIncome1099
        0,      // gigIncomeW2
        15000,  // totalDeductions
        profile
      );
      
      // Verify income split
      expect(result.income1099).toBe(80000);
      expect(result.incomeW2).toBe(0);
      expect(result.netIncome1099).toBe(65000); // 80000 - 15000
      
      // Verify SE tax calculation (15.3% × 92.35% of net)
      const expectedSETax = 65000 * 0.9235 * 0.153;
      expect(result.seTax).toBeCloseTo(expectedSETax, 2);
      
      // Verify federal and state taxes are calculated
      expect(result.federalTax1099).toBeGreaterThan(0);
      expect(result.stateTax1099).toBeGreaterThan(0);
      expect(result.localTax1099).toBe(0); // CA has no local tax
      
      // Verify total and effective rate
      expect(result.totalOwed1099).toBe(
        result.seTax + result.federalTax1099 + result.stateTax1099 + result.localTax1099
      );
      expect(result.effectiveRate1099).toBeCloseTo(result.totalOwed1099 / 80000, 4);
      
      // Verify set aside calculations
      expect(result.setAsideAmount).toBe(Math.round(result.totalOwed1099));
      expect(result.setAsidePercent).toBeCloseTo(result.effectiveRate1099 * 100, 1);
      
      // Verify quarterly payment estimate (depends on current month)
      expect(result.quarterlyPaymentEstimate).toBeGreaterThan(0);
      expect(result.quarterlyPaymentEstimate).toBeLessThanOrEqual(result.setAsideAmount);
      
      // Verify W-2 note for no W-2 income
      expect(result.w2Note).toBe("No W-2 income recorded. Add a W-2 payer in Contacts if you have employer income.");
      
      // Verify supported state
      expect(result.hasUnsupportedState).toBe(false);
    });

    it('should calculate tax for mixed income — both 1099 and W-2', () => {
      const profile: TaxProfile = {
        filingStatus: 'married_joint',
        state: 'NY',
        nycResident: true,
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const result = calculateSplitTax(
        50000,  // gigIncome1099
        60000,  // gigIncomeW2
        10000,  // totalDeductions
        profile
      );
      
      // Verify income split
      expect(result.income1099).toBe(50000);
      expect(result.incomeW2).toBe(60000);
      expect(result.netIncome1099).toBe(40000); // 50000 - 10000
      
      // Verify SE tax only applies to 1099 income
      const expectedSETax = 40000 * 0.9235 * 0.153;
      expect(result.seTax).toBeCloseTo(expectedSETax, 2);
      
      // Verify taxes are calculated on 1099 income only
      expect(result.federalTax1099).toBeGreaterThan(0);
      expect(result.stateTax1099).toBeGreaterThan(0);
      expect(result.localTax1099).toBeGreaterThan(0); // NYC has local tax
      
      // Verify W-2 note for mixed income
      expect(result.w2Note).toBe(
        "W-2 taxes are withheld by your employer. Verify your W-4 withholding is correct — especially if your gig income is significantly higher than last year."
      );
      
      // Verify supported state
      expect(result.hasUnsupportedState).toBe(false);
    });

    it('should detect unsupported state (FL) and set hasUnsupportedState = true', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'FL' as any, // Unsupported state
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const result = calculateSplitTax(
        60000,  // gigIncome1099
        0,      // gigIncomeW2
        12000,  // totalDeductions
        profile
      );
      
      // Verify income calculations
      expect(result.income1099).toBe(60000);
      expect(result.netIncome1099).toBe(48000);
      
      // Verify SE and federal taxes are calculated
      expect(result.seTax).toBeGreaterThan(0);
      expect(result.federalTax1099).toBeGreaterThan(0);
      
      // FL has no state income tax, so state tax should be 0
      expect(result.stateTax1099).toBe(0);
      expect(result.localTax1099).toBe(0);
      
      // Verify unsupported state flag
      expect(result.hasUnsupportedState).toBe(true);
    });

    it('should return zero taxes for zero 1099 income, only W-2', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'CA',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const result = calculateSplitTax(
        0,      // gigIncome1099
        75000,  // gigIncomeW2
        5000,   // totalDeductions (not applied since no 1099 income)
        profile
      );
      
      // Verify all income is W-2
      expect(result.income1099).toBe(0);
      expect(result.incomeW2).toBe(75000);
      expect(result.netIncome1099).toBe(0);
      
      // Verify all taxes are zero
      expect(result.seTax).toBe(0);
      expect(result.federalTax1099).toBe(0);
      expect(result.stateTax1099).toBe(0);
      expect(result.localTax1099).toBe(0);
      expect(result.totalOwed1099).toBe(0);
      expect(result.effectiveRate1099).toBe(0);
      
      // Verify set aside is zero
      expect(result.setAsideAmount).toBe(0);
      expect(result.setAsidePercent).toBe(0);
      expect(result.quarterlyPaymentEstimate).toBe(0);
      
      // Verify W-2 only note
      expect(result.w2Note).toBe(
        "All income is from W-2 employment. Taxes are withheld by your employer — no estimated tax payments needed for this income."
      );
    });

    it('should handle high income crossing federal bracket boundary', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'TX', // No state tax to isolate federal calculation
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      // Test income that crosses into higher brackets
      const result = calculateSplitTax(
        150000, // gigIncome1099 - crosses multiple brackets
        0,      // gigIncomeW2
        20000,  // totalDeductions
        profile
      );
      
      // Verify income calculations
      expect(result.income1099).toBe(150000);
      expect(result.netIncome1099).toBe(130000); // 150000 - 20000
      
      // Verify SE tax
      const expectedSETax = 130000 * 0.9235 * 0.153;
      expect(result.seTax).toBeCloseTo(expectedSETax, 2);
      
      // Verify federal tax is calculated (should be substantial at this income)
      expect(result.federalTax1099).toBeGreaterThan(10000);
      
      // TX has no state tax
      expect(result.stateTax1099).toBe(0);
      expect(result.localTax1099).toBe(0);
      
      // Verify total tax is meaningful
      expect(result.totalOwed1099).toBeGreaterThan(20000);
      
      // Verify effective rate is reasonable for high income
      expect(result.effectiveRate1099).toBeGreaterThan(0.20); // Should be > 20%
      expect(result.effectiveRate1099).toBeLessThan(0.50); // Should be < 50%
      
      // Verify set aside percent is rounded to 1 decimal
      const percentString = result.setAsidePercent.toString();
      const decimalPlaces = percentString.includes('.') 
        ? percentString.split('.')[1].length 
        : 0;
      expect(decimalPlaces).toBeLessThanOrEqual(1);
    });

    it('should handle negative 1099 income (loss scenario)', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'CA',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const result = calculateSplitTax(
        -5000,  // gigIncome1099 (negative/loss)
        40000,  // gigIncomeW2
        0,      // totalDeductions
        profile
      );
      
      // Should treat as W-2 only scenario
      expect(result.income1099).toBe(-5000);
      expect(result.incomeW2).toBe(40000);
      expect(result.netIncome1099).toBe(0);
      
      // All taxes should be zero
      expect(result.seTax).toBe(0);
      expect(result.federalTax1099).toBe(0);
      expect(result.totalOwed1099).toBe(0);
      
      // Should show W-2 only message
      expect(result.w2Note).toBe(
        "All income is from W-2 employment. Taxes are withheld by your employer — no estimated tax payments needed for this income."
      );
    });

    it('should handle deductions exceeding 1099 income', () => {
      const profile: TaxProfile = {
        filingStatus: 'single',
        state: 'NY',
        deductionMethod: 'standard',
        seIncome: true,
      };
      
      const result = calculateSplitTax(
        30000,  // gigIncome1099
        0,      // gigIncomeW2
        35000,  // totalDeductions (exceeds income)
        profile
      );
      
      // Net income should be zero (not negative)
      expect(result.netIncome1099).toBe(0);
      
      // All taxes should be zero
      expect(result.seTax).toBe(0);
      expect(result.federalTax1099).toBe(0);
      expect(result.totalOwed1099).toBe(0);
      expect(result.setAsideAmount).toBe(0);
    });
  });
});
