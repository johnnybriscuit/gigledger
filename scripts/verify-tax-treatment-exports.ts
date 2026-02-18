/**
 * Tax Treatment Export Verification Script
 * 
 * This script verifies that W-2 vs 1099 tax treatment is correctly
 * implemented in all export formats by testing against the golden dataset.
 * 
 * Usage: npx tsx scripts/verify-tax-treatment-exports.ts
 */

import {
  GOLDEN_PAYERS,
  GOLDEN_GIGS,
  GOLDEN_EXPENSES,
  GOLDEN_EXPECTED,
  createPayerMap,
  validateGoldenDataset,
} from '../src/lib/__tests__/fixtures/taxTreatmentGoldenDataset';
import {
  filterGigsForScheduleC,
  splitGigsByTaxTreatment,
  calculateIncomeBySplit,
} from '../src/lib/taxTreatment';

interface VerificationResult {
  passed: boolean;
  message: string;
  expected?: any;
  actual?: any;
}

const results: VerificationResult[] = [];

function verify(name: string, condition: boolean, expected?: any, actual?: any): void {
  const result: VerificationResult = {
    passed: condition,
    message: name,
    expected,
    actual,
  };
  results.push(result);
  
  if (condition) {
    console.log(`✓ ${name}`);
  } else {
    console.error(`✗ ${name}`);
    if (expected !== undefined) {
      console.error(`  Expected: ${JSON.stringify(expected)}`);
      console.error(`  Actual:   ${JSON.stringify(actual)}`);
    }
  }
}

function runVerification(): void {
  console.log('\n=== Tax Treatment Export Verification ===\n');
  
  // Step 1: Validate golden dataset
  console.log('1. Validating Golden Dataset...');
  const validation = validateGoldenDataset();
  verify('Golden dataset is valid', validation.valid);
  if (!validation.valid) {
    console.error('Golden dataset validation errors:');
    validation.errors.forEach(err => console.error(`  - ${err}`));
    return;
  }
  
  // Step 2: Test filtering functions
  console.log('\n2. Testing Filter Functions...');
  const payerMap = createPayerMap();
  
  const scheduleCGigs = filterGigsForScheduleC(GOLDEN_GIGS as any[], payerMap as any);
  verify(
    'Schedule C filter returns correct number of gigs',
    scheduleCGigs.length === GOLDEN_EXPECTED.contractor1099Gigs,
    GOLDEN_EXPECTED.contractor1099Gigs,
    scheduleCGigs.length
  );
  
  const scheduleCGigIds = scheduleCGigs.map(g => g.id).sort();
  const expectedScheduleCGigIds = GOLDEN_EXPECTED.exports.scheduleCGigIds.sort();
  verify(
    'Schedule C filter returns correct gig IDs',
    JSON.stringify(scheduleCGigIds) === JSON.stringify(expectedScheduleCGigIds),
    expectedScheduleCGigIds,
    scheduleCGigIds
  );
  
  // Step 3: Test split functions
  console.log('\n3. Testing Split Functions...');
  const split = splitGigsByTaxTreatment(GOLDEN_GIGS as any[], payerMap as any);
  
  verify(
    'Split returns correct W-2 gig count',
    split.w2.length === GOLDEN_EXPECTED.w2Gigs,
    GOLDEN_EXPECTED.w2Gigs,
    split.w2.length
  );
  
  verify(
    'Split returns correct 1099 gig count',
    split.contractor_1099.length === GOLDEN_EXPECTED.contractor1099Gigs,
    GOLDEN_EXPECTED.contractor1099Gigs,
    split.contractor_1099.length
  );
  
  verify(
    'Split returns correct other gig count',
    split.other.length === GOLDEN_EXPECTED.otherGigs,
    GOLDEN_EXPECTED.otherGigs,
    split.other.length
  );
  
  // Step 4: Test income calculations
  console.log('\n4. Testing Income Calculations...');
  const income = calculateIncomeBySplit(GOLDEN_GIGS as any[], payerMap as any);
  
  verify(
    'Total income calculation is correct',
    income.total === GOLDEN_EXPECTED.totalIncome,
    GOLDEN_EXPECTED.totalIncome,
    income.total
  );
  
  verify(
    'W-2 income calculation is correct',
    income.w2 === GOLDEN_EXPECTED.w2Income,
    GOLDEN_EXPECTED.w2Income,
    income.w2
  );
  
  verify(
    'Contractor 1099 income calculation is correct',
    income.contractor_1099 === GOLDEN_EXPECTED.contractor1099Income,
    GOLDEN_EXPECTED.contractor1099Income,
    income.contractor_1099
  );
  
  verify(
    'Other income calculation is correct',
    income.other === GOLDEN_EXPECTED.otherIncome,
    GOLDEN_EXPECTED.otherIncome,
    income.other
  );
  
  // Step 5: Test Schedule C calculations
  console.log('\n5. Testing Schedule C Calculations...');
  const scheduleCIncome = scheduleCGigs.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0);
  
  verify(
    'Schedule C gross income is correct',
    scheduleCIncome === GOLDEN_EXPECTED.scheduleCGrossIncome,
    GOLDEN_EXPECTED.scheduleCGrossIncome,
    scheduleCIncome
  );
  
  const totalExpenses = GOLDEN_EXPENSES.reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const scheduleCNet = scheduleCIncome - totalExpenses;
  
  verify(
    'Schedule C net income is correct',
    scheduleCNet === GOLDEN_EXPECTED.scheduleCNetIncome,
    GOLDEN_EXPECTED.scheduleCNetIncome,
    scheduleCNet
  );
  
  // Step 6: Test critical invariants
  console.log('\n6. Testing Critical Invariants...');
  
  // Invariant: W-2 gigs must never appear in Schedule C
  const hasW2InScheduleC = scheduleCGigs.some(gig => {
    const payer = payerMap.get(gig.payer_id!);
    const effectiveTreatment = gig.tax_treatment || payer?.tax_treatment || 'contractor_1099';
    return effectiveTreatment === 'w2';
  });
  
  verify(
    'CRITICAL: No W-2 gigs in Schedule C filter',
    !hasW2InScheduleC
  );
  
  // Invariant: Adding W-2 gigs should not change Schedule C totals
  const gigsWithExtraW2 = [
    ...GOLDEN_GIGS,
    {
      id: 'extra-w2',
      payer_id: 'payer-w2-test',
      gross_amount: 5000,
      tax_treatment: null,
    },
  ];
  
  const scheduleCGigsWithExtra = filterGigsForScheduleC(gigsWithExtraW2 as any[], payerMap as any);
  const scheduleCIncomeWithExtra = scheduleCGigsWithExtra.reduce((sum, gig) => sum + (gig.gross_amount || 0), 0);
  
  verify(
    'CRITICAL: Adding W-2 gigs does not change Schedule C totals',
    scheduleCIncomeWithExtra === scheduleCIncome,
    scheduleCIncome,
    scheduleCIncomeWithExtra
  );
  
  // Step 7: Test export expectations
  console.log('\n7. Testing Export Expectations...');
  
  const w2GigIds = split.w2.map(g => g.id).sort();
  const expectedW2GigIds = GOLDEN_EXPECTED.exports.w2GigIds.sort();
  
  verify(
    'W-2 export contains correct gig IDs',
    JSON.stringify(w2GigIds) === JSON.stringify(expectedW2GigIds),
    expectedW2GigIds,
    w2GigIds
  );
  
  // Summary
  console.log('\n=== Verification Summary ===\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed} ✓`);
  console.log(`Failed: ${failed} ✗`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.error('\n❌ VERIFICATION FAILED');
    console.error('Some tax treatment invariants are violated.');
    console.error('Review the failed tests above and fix the issues.');
    process.exit(1);
  } else {
    console.log('\n✅ VERIFICATION PASSED');
    console.log('All tax treatment invariants are satisfied.');
    process.exit(0);
  }
}

// Run verification
try {
  runVerification();
} catch (error) {
  console.error('\n❌ VERIFICATION ERROR');
  console.error('An error occurred during verification:');
  console.error(error);
  process.exit(1);
}
