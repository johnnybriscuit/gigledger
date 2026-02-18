/**
 * Golden Test Dataset for Tax Treatment Verification
 * 
 * This fixture represents the canonical test data used to verify
 * that W-2 vs 1099 tax treatment is handled correctly across
 * all calculations, UI displays, and export formats.
 * 
 * EXPECTED OUTCOMES:
 * - Total income (all gigs): $2,500
 * - W-2 income: $1,000 (excluded from Schedule C)
 * - 1099 income: $1,500 (included in Schedule C)
 * - Expenses: $300
 * - Schedule C net income: $1,500 - $300 = $1,200
 * - Tax set-aside basis: $1,200 (1099 net only, W-2 excluded)
 */

import type { Database } from '../../../types/database.types';

type Payer = Database['public']['Tables']['payers']['Row'];
type Gig = Database['public']['Tables']['gigs']['Row'];
type Expense = Database['public']['Tables']['expenses']['Row'];

export const GOLDEN_PAYERS: Partial<Payer>[] = [
  {
    id: 'payer-w2-test',
    name: 'Test W-2 Employer',
    payer_type: 'Corporation',
    tax_treatment: 'w2',
    w2_employer_name: 'Test W-2 Employer LLC',
    w2_employer_ein_last4: '1234',
    payroll_provider: 'ADP',
    expect_1099: false,
  },
  {
    id: 'payer-1099-test',
    name: 'Test 1099 Client',
    payer_type: 'Client',
    tax_treatment: 'contractor_1099',
    expect_1099: true,
    tax_id_type: 'ein',
    tax_id_last4: '5678',
  },
];

export const GOLDEN_GIGS: Partial<Gig>[] = [
  {
    id: 'gig-w2-1',
    payer_id: 'payer-w2-test',
    date: '2024-01-15',
    title: 'W-2 Gig',
    gross_amount: 1000,
    tips: 0,
    fees: 0,
    per_diem: 0,
    other_income: 0,
    net_amount: 1000,
    tax_treatment: null, // Inherits from payer (w2)
    paid: true,
    taxes_withheld: true,
  },
  {
    id: 'gig-1099-1',
    payer_id: 'payer-1099-test',
    date: '2024-01-20',
    title: '1099 Gig #1',
    gross_amount: 1000,
    tips: 0,
    fees: 0,
    per_diem: 0,
    other_income: 0,
    net_amount: 1000,
    tax_treatment: null, // Inherits from payer (contractor_1099)
    paid: true,
    taxes_withheld: false,
  },
  {
    id: 'gig-1099-2',
    payer_id: 'payer-1099-test',
    date: '2024-01-25',
    title: '1099 Gig #2',
    gross_amount: 500,
    tips: 0,
    fees: 0,
    per_diem: 0,
    other_income: 0,
    net_amount: 500,
    tax_treatment: null, // Inherits from payer (contractor_1099)
    paid: true,
    taxes_withheld: false,
  },
];

export const GOLDEN_EXPENSES: Partial<Expense>[] = [
  {
    id: 'expense-1',
    date: '2024-01-22',
    category: 'Equipment/Gear',
    description: 'Test Equipment',
    amount: 300,
  },
];

/**
 * Expected calculation outcomes for the golden dataset
 */
export const GOLDEN_EXPECTED = {
  // Total income across all gigs
  totalIncome: 2500,
  
  // Income by tax treatment
  w2Income: 1000,
  contractor1099Income: 1500,
  otherIncome: 0,
  
  // Schedule C calculations (1099 only)
  scheduleCGrossIncome: 1500,
  scheduleCExpenses: 300,
  scheduleCNetIncome: 1200,
  
  // Tax set-aside basis (1099 net only, W-2 excluded)
  taxSetAsideBasis: 1200,
  
  // Gig counts
  totalGigs: 3,
  w2Gigs: 1,
  contractor1099Gigs: 2,
  otherGigs: 0,
  
  // Export expectations
  exports: {
    // Schedule C exports should ONLY include 1099 gigs
    scheduleCGigIds: ['gig-1099-1', 'gig-1099-2'],
    
    // W-2 gigs should appear in separate W-2 summary
    w2GigIds: ['gig-w2-1'],
    
    // JSON backup includes everything
    jsonBackupGigIds: ['gig-w2-1', 'gig-1099-1', 'gig-1099-2'],
  },
};

/**
 * Helper to create a payer map for testing
 */
export function createPayerMap(): Map<string, Partial<Payer>> {
  const map = new Map<string, Partial<Payer>>();
  for (const payer of GOLDEN_PAYERS) {
    if (payer.id) {
      map.set(payer.id, payer);
    }
  }
  return map;
}

/**
 * Validation function to ensure golden dataset maintains expected invariants
 */
export function validateGoldenDataset(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate total income
  const totalIncome = GOLDEN_GIGS.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0);
  if (totalIncome !== GOLDEN_EXPECTED.totalIncome) {
    errors.push(`Total income mismatch: expected ${GOLDEN_EXPECTED.totalIncome}, got ${totalIncome}`);
  }
  
  // Validate gig counts
  if (GOLDEN_GIGS.length !== GOLDEN_EXPECTED.totalGigs) {
    errors.push(`Total gig count mismatch: expected ${GOLDEN_EXPECTED.totalGigs}, got ${GOLDEN_GIGS.length}`);
  }
  
  // Validate expense total
  const totalExpenses = GOLDEN_EXPENSES.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  if (totalExpenses !== GOLDEN_EXPECTED.scheduleCExpenses) {
    errors.push(`Total expenses mismatch: expected ${GOLDEN_EXPECTED.scheduleCExpenses}, got ${totalExpenses}`);
  }
  
  // Validate Schedule C net
  const scheduleCNet = GOLDEN_EXPECTED.scheduleCGrossIncome - GOLDEN_EXPECTED.scheduleCExpenses;
  if (scheduleCNet !== GOLDEN_EXPECTED.scheduleCNetIncome) {
    errors.push(`Schedule C net income calculation error: ${GOLDEN_EXPECTED.scheduleCGrossIncome} - ${GOLDEN_EXPECTED.scheduleCExpenses} should equal ${GOLDEN_EXPECTED.scheduleCNetIncome}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
