/**
 * 2025 Tax Configuration
 * 
 * This file contains all tax rates, brackets, and deductions for tax year 2025.
 * 
 * FEDERAL: Official 2025 values from IRS Revenue Procedure 2024-40 ✅
 * STATE TODO: Update with official 2025 values from:
 * - California: CA Franchise Tax Board annual tables
 * - New York: NY Dept of Taxation + NYC Finance + Yonkers
 * - Maryland: MD Comptroller state brackets + county piggyback rates
 * - Tennessee: No state income tax on wages
 * - Texas: No state income tax
 */

import { FEDERAL_2025, type FilingStatus as FederalFilingStatus } from './federal_2025';

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head';

export interface Bracket {
  upTo: number | null; // null = top bracket (no upper limit)
  rate: number;        // decimal (e.g., 0.10 for 10%)
}

export interface JurisdictionConfig {
  standardDeduction: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, Bracket[]>;
  
  // Optional state-specific features
  local?: {
    // Maryland: County flat rates (% of Maryland taxable income)
    mdCountyRates?: Record<string, number>;
    
    // New York City: Resident tax brackets
    nycResidentRates?: Record<FilingStatus, Bracket[]>;
    
    // Yonkers: Surcharge as % of NYS tax
    yonkersSurcharge?: number;
    
    // California: Millionaire surtax
    millionaireSurtax?: {
      threshold: number;
      extraRate: number;
    };
  };
}

export type StateCode = 'TN' | 'TX' | 'CA' | 'NY' | 'MD';

export interface TaxConfig2025 {
  federal: JurisdictionConfig;
  states: Record<StateCode, JurisdictionConfig>;
  seTax: {
    socialSecurityRate: number;      // Combined employer + employee
    socialSecurityWageBase: number;  // 2025 wage base limit
    medicareRate: number;            // Combined rate
    additionalMedicareThreshold: Record<FilingStatus, number>; // For 0.9% additional
  };
}

/**
 * 2025 Tax Configuration
 * 
 * PLACEHOLDER VALUES - Update with official 2025 numbers when available
 */
const config2025: TaxConfig2025 = {
  // ============================================================================
  // FEDERAL TAX (2025) - Official IRS Values 
  // ============================================================================
  // Source: IRS Revenue Procedure 2024-40
  // https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
  federal: {
    standardDeduction: {
      single: FEDERAL_2025.standardDeduction.single,                    // $15,000
      married_joint: FEDERAL_2025.standardDeduction.married_joint,      // $30,000
      married_separate: FEDERAL_2025.standardDeduction.single,          // $15,000 (same as single)
      head: FEDERAL_2025.standardDeduction.head,                        // $22,500
    },
    brackets: {
      single: FEDERAL_2025.brackets.single,
      married_joint: FEDERAL_2025.brackets.married_joint,
      married_separate: FEDERAL_2025.brackets.single,  // MFS uses same brackets as Single
      head: FEDERAL_2025.brackets.head,
    },
  },

  // ============================================================================
  // STATE TAXES
  // ============================================================================
  states: {
    // Tennessee: No state income tax on wages
    TN: {
    standardDeduction: {
      single: 0,
      married_joint: 0,
      married_separate: 0,
      head: 0,
    },
    brackets: {
      single: [{ upTo: null, rate: 0 }],
      married_joint: [{ upTo: null, rate: 0 }],
      married_separate: [{ upTo: null, rate: 0 }],
      head: [{ upTo: null, rate: 0 }],
    },
  },

  // Texas: No state income tax
  TX: {
    standardDeduction: {
      single: 0,
      married_joint: 0,
      married_separate: 0,
      head: 0,
    },
    brackets: {
      single: [{ upTo: null, rate: 0 }],
      married_joint: [{ upTo: null, rate: 0 }],
      married_separate: [{ upTo: null, rate: 0 }],
      head: [{ upTo: null, rate: 0 }],
    },
  },

  // California
  // TODO: Update from CA Franchise Tax Board
  // Source: https://www.ftb.ca.gov/forms/2025/2025-540-tax-rate-schedules.html
  CA: {
    standardDeduction: {
      single: 5363,           // TODO: 2025 value
      married_joint: 10726,   // TODO: 2025 value
      married_separate: 5363,
      head: 10726,
    },
    brackets: {
      single: [
        { upTo: 10412, rate: 0.01 },
        { upTo: 24684, rate: 0.02 },
        { upTo: 38959, rate: 0.04 },
        { upTo: 54081, rate: 0.06 },
        { upTo: 68350, rate: 0.08 },
        { upTo: 349137, rate: 0.093 },
        { upTo: 418961, rate: 0.103 },
        { upTo: 698271, rate: 0.113 },
        { upTo: null, rate: 0.123 },
      ],
      married_joint: [
        { upTo: 20824, rate: 0.01 },
        { upTo: 49368, rate: 0.02 },
        { upTo: 77918, rate: 0.04 },
        { upTo: 108162, rate: 0.06 },
        { upTo: 136700, rate: 0.08 },
        { upTo: 698274, rate: 0.093 },
        { upTo: 837922, rate: 0.103 },
        { upTo: 1000000, rate: 0.113 },
        { upTo: null, rate: 0.123 },
      ],
      married_separate: [
        { upTo: 10412, rate: 0.01 },
        { upTo: 24684, rate: 0.02 },
        { upTo: 38959, rate: 0.04 },
        { upTo: 54081, rate: 0.06 },
        { upTo: 68350, rate: 0.08 },
        { upTo: 349137, rate: 0.093 },
        { upTo: 418961, rate: 0.103 },
        { upTo: 500000, rate: 0.113 },
        { upTo: null, rate: 0.123 },
      ],
      head: [
        { upTo: 20839, rate: 0.01 },
        { upTo: 49371, rate: 0.02 },
        { upTo: 63644, rate: 0.04 },
        { upTo: 78765, rate: 0.06 },
        { upTo: 93037, rate: 0.08 },
        { upTo: 474824, rate: 0.093 },
        { upTo: 569790, rate: 0.103 },
        { upTo: 949649, rate: 0.113 },
        { upTo: null, rate: 0.123 },
      ],
    },
    local: {
      // Mental Health Services Tax: 1% on income over $1M
      millionaireSurtax: {
        threshold: 1000000,
        extraRate: 0.01,
      },
    },
  },

  // New York
  // TODO: Update from NY Dept of Taxation + NYC Finance
  // Sources:
  // - NYS: https://www.tax.ny.gov/pit/file/tax_tables.htm
  // - NYC: https://www.nyc.gov/site/finance/taxes/personal-income-tax-rates.page
  NY: {
    standardDeduction: {
      single: 8000,           // TODO: 2025 value
      married_joint: 16050,   // TODO: 2025 value
      married_separate: 8000,
      head: 11200,
    },
    brackets: {
      single: [
        { upTo: 8500, rate: 0.04 },
        { upTo: 11700, rate: 0.045 },
        { upTo: 13900, rate: 0.0525 },
        { upTo: 80650, rate: 0.055 },
        { upTo: 215400, rate: 0.06 },
        { upTo: 1077550, rate: 0.0685 },
        { upTo: 5000000, rate: 0.0965 },
        { upTo: 25000000, rate: 0.103 },
        { upTo: null, rate: 0.109 },
      ],
      married_joint: [
        { upTo: 17150, rate: 0.04 },
        { upTo: 23600, rate: 0.045 },
        { upTo: 27900, rate: 0.0525 },
        { upTo: 161550, rate: 0.055 },
        { upTo: 323200, rate: 0.06 },
        { upTo: 2155350, rate: 0.0685 },
        { upTo: 5000000, rate: 0.0965 },
        { upTo: 25000000, rate: 0.103 },
        { upTo: null, rate: 0.109 },
      ],
      married_separate: [
        { upTo: 8500, rate: 0.04 },
        { upTo: 11700, rate: 0.045 },
        { upTo: 13900, rate: 0.0525 },
        { upTo: 80650, rate: 0.055 },
        { upTo: 215400, rate: 0.06 },
        { upTo: 1077550, rate: 0.0685 },
        { upTo: 5000000, rate: 0.0965 },
        { upTo: 25000000, rate: 0.103 },
        { upTo: null, rate: 0.109 },
      ],
      head: [
        { upTo: 12800, rate: 0.04 },
        { upTo: 17650, rate: 0.045 },
        { upTo: 20900, rate: 0.0525 },
        { upTo: 107650, rate: 0.055 },
        { upTo: 269300, rate: 0.06 },
        { upTo: 1616450, rate: 0.0685 },
        { upTo: 5000000, rate: 0.0965 },
        { upTo: 25000000, rate: 0.103 },
        { upTo: null, rate: 0.109 },
      ],
    },
    local: {
      // NYC Resident Tax
      nycResidentRates: {
        single: [
          { upTo: 12000, rate: 0.03078 },
          { upTo: 25000, rate: 0.03762 },
          { upTo: 50000, rate: 0.03819 },
          { upTo: null, rate: 0.03876 },
        ],
        married_joint: [
          { upTo: 21600, rate: 0.03078 },
          { upTo: 45000, rate: 0.03762 },
          { upTo: 90000, rate: 0.03819 },
          { upTo: null, rate: 0.03876 },
        ],
        married_separate: [
          { upTo: 12000, rate: 0.03078 },
          { upTo: 25000, rate: 0.03762 },
          { upTo: 50000, rate: 0.03819 },
          { upTo: null, rate: 0.03876 },
        ],
        head: [
          { upTo: 14400, rate: 0.03078 },
          { upTo: 30000, rate: 0.03762 },
          { upTo: 60000, rate: 0.03819 },
          { upTo: null, rate: 0.03876 },
        ],
      },
      // Yonkers: 16.75% surcharge on NYS tax (if resident)
      yonkersSurcharge: 0.1675,
    },
  },

  // Maryland
  // TODO: Update from MD Comptroller
  // Sources:
  // - State: https://www.marylandtaxes.gov/individual/income/tax-info/tax-rates.php
  // - Counties: https://dat.maryland.gov/Pages/LocalGovernmentTaxRates.aspx
  MD: {
    standardDeduction: {
      single: 2550,           // TODO: 2025 value
      married_joint: 5100,    // TODO: 2025 value
      married_separate: 2550,
      head: 2550,
    },
    brackets: {
      single: [
        { upTo: 1000, rate: 0.02 },
        { upTo: 2000, rate: 0.03 },
        { upTo: 3000, rate: 0.04 },
        { upTo: 100000, rate: 0.0475 },
        { upTo: 125000, rate: 0.05 },
        { upTo: 150000, rate: 0.0525 },
        { upTo: 250000, rate: 0.055 },
        { upTo: null, rate: 0.0575 },
      ],
      married_joint: [
        { upTo: 1000, rate: 0.02 },
        { upTo: 2000, rate: 0.03 },
        { upTo: 3000, rate: 0.04 },
        { upTo: 150000, rate: 0.0475 },
        { upTo: 175000, rate: 0.05 },
        { upTo: 225000, rate: 0.0525 },
        { upTo: 300000, rate: 0.055 },
        { upTo: null, rate: 0.0575 },
      ],
      married_separate: [
        { upTo: 1000, rate: 0.02 },
        { upTo: 2000, rate: 0.03 },
        { upTo: 3000, rate: 0.04 },
        { upTo: 100000, rate: 0.0475 },
        { upTo: 125000, rate: 0.05 },
        { upTo: 150000, rate: 0.0525 },
        { upTo: 250000, rate: 0.055 },
        { upTo: null, rate: 0.0575 },
      ],
      head: [
        { upTo: 1000, rate: 0.02 },
        { upTo: 2000, rate: 0.03 },
        { upTo: 3000, rate: 0.04 },
        { upTo: 150000, rate: 0.0475 },
        { upTo: 175000, rate: 0.05 },
        { upTo: 225000, rate: 0.0525 },
        { upTo: 300000, rate: 0.055 },
        { upTo: null, rate: 0.0575 },
      ],
    },
    local: {
      // County "piggyback" tax rates (% of Maryland taxable income)
      // TODO: Update for 2025
      mdCountyRates: {
        'Allegany': 0.0305,
        'Anne Arundel': 0.027,
        'Baltimore City': 0.032,
        'Baltimore County': 0.032,
        'Calvert': 0.03,
        'Caroline': 0.0315,
        'Carroll': 0.0303,
        'Cecil': 0.028,
        'Charles': 0.03,
        'Dorchester': 0.0315,
        'Frederick': 0.0296,
        'Garrett': 0.0265,
        'Harford': 0.0306,
        'Howard': 0.032,
        'Kent': 0.0315,
        'Montgomery': 0.032,
        'Prince George\'s': 0.032,
        'Queen Anne\'s': 0.0315,
        'Somerset': 0.0315,
        'St. Mary\'s': 0.03,
        'Talbot': 0.0225,
        'Washington': 0.0295,
        'Wicomico': 0.0325,
        'Worcester': 0.0125,
      },
    },
  },
  }, // end states

  // ============================================================================
  // SELF-EMPLOYMENT TAX (2025)
  // ============================================================================
  // TODO: Update from IRS for 2025
  // Source: https://www.irs.gov/businesses/small-businesses-self-employed/self-employment-tax-social-security-and-medicare-taxes
  seTax: {
    // Social Security: 12.4% (employer 6.2% + employee 6.2%)
    socialSecurityRate: 0.124,
    
    // 2025 Social Security wage base
    // TODO: Update when announced (2024 was $168,600)
    socialSecurityWageBase: 168600,
    
    // Medicare: 2.9% (employer 1.45% + employee 1.45%)
    medicareRate: 0.029,
    
    // Additional Medicare Tax: 0.9% over threshold
    // Applies to SE income over these amounts
    additionalMedicareThreshold: {
      single: 200000,
      married_joint: 250000,
      married_separate: 125000,
      head: 200000,
    },
  },
};

export default config2025;
