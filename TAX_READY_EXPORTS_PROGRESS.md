# Tax-Ready Exports Implementation Progress

## 🎯 Goal
Make GigLedger exports truly tax-ready (CPA-friendly and optionally TXF for TurboTax Desktop), with a pre-export validator and improved UI.

---

## ✅ Phase A: Export Schemas & Generators (COMPLETED)

### 1. Zod Schemas Created
**Location:** `src/lib/exports/schemas.ts`

✅ **GigExportSchema** - 19 fields including:
- IRS-compliant headers (gig_id, date, title, payer_name, payer_ein_or_ssn, etc.)
- Withholding fields (federal/state)
- Payment tracking (paid, payment_method, invoice_url)

✅ **ExpenseExportSchema** - 11 fields including:
- **irs_schedule_c_line** (REQUIRED for tax filing)
- **meals_percent_allowed** (default 0.5 for 50% limitation)
- GL category mapping to IRS line codes

✅ **MileageExportSchema** - 9 fields including:
- Business miles tracking
- IRS standard rate application
- Calculated deduction

✅ **PayerExportSchema** - 12 fields including:
- Full contact information
- EIN/SSN for 1099 reconciliation
- Address fields for tax forms

✅ **ScheduleCSummarySchema** - 36 fields including:
- All IRS Schedule C Part I (Income) lines
- All IRS Schedule C Part II (Expense) lines
- Tax estimates (SE tax, federal, state)
- Set-aside recommendations

### 2. IRS Schedule C Line Mapping
✅ Complete mapping table: `CATEGORY_TO_IRS_LINE`
- Maps GigLedger categories to IRS line codes
- Covers all common expense types
- Defaults to "Other" (27a) for unmapped categories

✅ IRS Line Code Constants:
```typescript
ADVERTISING: '8'
CAR_TRUCK: '9'
COMMISSIONS: '10'
MEALS: '24b' // Subject to 50% limitation
TRAVEL: '24a'
OFFICE_EXPENSE: '18'
... (all 20+ Schedule C expense lines)
```

### 3. Schedule C Calculator
**Location:** `src/lib/exports/generator.ts`

✅ **Income Calculations:**
- Gross receipts (all gig income)
- Tips (optional inclusion)
- Per diem
- Other income
- Fees (as reduction or deduction)
- Total income (Line 7)

✅ **Expense Calculations:**
- Categorizes by IRS line code
- Applies 50% meals limitation automatically
- Calculates mileage deduction (miles × IRS rate)
- Sums all expense categories
- Total expenses (Line 28)

✅ **Net Profit:**
- Total income - Total expenses
- Can be negative (loss)

✅ **Tax Estimates (Informational):**
- SE tax basis (92.35% of net profit)
- Estimated SE tax (15.3% with SS wage base cap)
- Estimated federal income tax (simplified)
- Estimated state income tax (5% flat assumption)
- Total estimated tax
- Suggested set-aside amount

### 4. CSV Generators
✅ `generateGigsCSV()` - Exact IRS-compliant headers
✅ `generateExpensesCSV()` - With Schedule C line codes
✅ `generateMileageCSV()` - With calculated deductions
✅ `generatePayersCSV()` - With EIN/SSN fields
✅ `generateScheduleCSummaryCSV()` - Complete tax summary

✅ **CSV Utilities:**
- Proper field escaping (commas, quotes, newlines)
- Exact header order preservation
- Null/undefined handling

---

## ✅ Phase B: Pre-Export Validator (COMPLETED)

**Location:** `src/lib/exports/validator.ts`

### Blocking Errors (Prevent Export)
✅ **Expenses:**
- Missing `irs_schedule_c_line` → BLOCKS export
- Negative amounts → BLOCKS export
- Invalid dates → BLOCKS export

✅ **Gigs:**
- Negative gross_amount → BLOCKS export
- Invalid dates → BLOCKS export

✅ **Mileage:**
- Negative miles → BLOCKS export
- Invalid dates → BLOCKS export

### Warnings (Allow Export with Review)
✅ **Expenses:**
- Meals without `meals_percent_allowed` → Defaults to 50%

✅ **Gigs:**
- Missing payer_name → Warn (needed for 1099 reconciliation)
- Missing payer_ein_or_ssn on paid gigs → Warn (needed for 1099)

✅ **Mileage:**
- Missing purpose → Warn (IRS requires business purpose)
- Missing origin/destination → Warn (documentation requirement)

### Validation Features
✅ `validateExportData()` - Main validation function
✅ `getValidationSummary()` - User-friendly summary
✅ `groupIssuesByCategory()` - Organized issue display
✅ Date format validation (YYYY-MM-DD)
✅ Issue categorization (error vs warning)

---

## ✅ Phase C: Database Migration (COMPLETED)

**Location:** `supabase/migrations/20251112_add_irs_schedule_c_line.sql`

✅ Added `irs_schedule_c_line` column to expenses table
✅ Added `meals_percent_allowed` column with 0-1 constraint
✅ Created index for faster filtering
✅ Backfilled existing expenses with best-effort IRS line codes
✅ Set meals_percent_allowed to 0.5 for meals categories

---

## 🚧 Phase D: TXF Generator (PENDING)

**Status:** Not yet implemented

**Requirements:**
- Feature flag for TXF export option
- TXF format generator (TurboTax Desktop only)
- Header with tax year and filer info
- Income records (one per gig or summary)
- Expense records (one per category with totals)
- Comments explaining Desktop-only support
- Warning in UI about TurboTax Online incompatibility

**File to create:** `src/lib/exports/txf-generator.ts`

---

## 🚧 Phase E: UI/UX Polish (PENDING)

**Status:** Not yet implemented

**Requirements:**
1. **Validation Status Card:**
   - Show "✅ All checks passed" or "❌ X issues found"
   - Click to view detailed issue list
   - Group issues by category (Gigs, Expenses, Mileage)

2. **Export Actions Card:**
   - "Download CSVs" button (disabled if blocking errors)
   - "Download JSON Backup" button (always enabled)
   - "Download TXF (TurboTax Desktop)" button (feature-flagged)
   - Clear descriptions of each export type

3. **Info Tooltips:**
   - TurboTax Online vs Desktop explanation
   - CSV format for CPAs
   - JSON backup for data portability

4. **Filters:**
   - Tax year selector (sticky at top)
   - Optional custom date range
   - Include tips checkbox
   - Fees as deduction checkbox

**File to update:** `src/screens/ExportsScreen.tsx`

---

## 🚧 Phase F: Schedule C PDF Generator (PENDING)

**Status:** Not yet implemented

**Requirements:**
- Use react-pdf or puppeteer
- Clean, readable design
- IRS Schedule C format (simplified)
- Part I: Income section with line items
- Part II: Expenses section with line items
- Net profit calculation
- Tax estimates section (informational)
- Footnotes and disclaimers
- Professional appearance for CPA review

**File to create:** `src/lib/exports/pdf-generator.ts`

---

## 🚧 Phase G: Unit Tests (PENDING)

**Status:** Not yet implemented

**Requirements:**
1. **Calculation Tests:**
   - Meals 50% reduction
   - Mileage deduction (miles × rate)
   - Category rollups match totals
   - Net profit = income - expenses
   - SE tax calculation

2. **Validation Tests:**
   - Catches missing irs_schedule_c_line
   - Catches negative amounts
   - Catches invalid dates
   - Warnings for missing payer info
   - Warnings for missing mileage details

3. **CSV Generation Tests:**
   - Headers match schema
   - Field escaping works correctly
   - Null/undefined handled properly

4. **Fixture Dataset:**
   - Small test dataset (5 gigs, 10 expenses, 5 mileage)
   - Snapshot of ScheduleCSummary.csv
   - Known expected totals

**File to create:** `src/lib/exports/__tests__/`

---

## 🚧 Phase H: Documentation (PENDING)

**Status:** Not yet implemented

**Requirements:**
- `/docs/exports.md` with:
  * Exact CSV headers with examples
  * IRS category mapping table
  * How to enable TXF
  * Known limitations
  * Disclaimers (not tax advice)
  * CPA guidance

---

## 🚧 Phase I: Environment & Config (PENDING)

**Status:** Not yet implemented

**Requirements:**
- Add `IRS_MILEAGE_RATE_2025=0.67` to `.env.example`
- Add to `app.json` extra config
- Use existing 2025 tax constants for estimates
- Feature flag for TXF export

**Files to update:**
- `.env.example`
- `app.json`
- `src/config/constants.ts` (if needed)

---

## 📊 Overall Progress

| Phase | Status | Files Created | Files Updated |
|-------|--------|---------------|---------------|
| A. Schemas & Generators | ✅ DONE | 3 | 0 |
| B. Validator | ✅ DONE | 1 | 0 |
| C. Database Migration | ✅ DONE | 1 | 0 |
| D. TXF Generator | ⏳ PENDING | 0 | 0 |
| E. UI/UX Polish | ⏳ PENDING | 0 | 1 |
| F. PDF Generator | ⏳ PENDING | 0 | 0 |
| G. Unit Tests | ⏳ PENDING | 0 | 0 |
| H. Documentation | ⏳ PENDING | 1 | 0 |
| I. Env & Config | ⏳ PENDING | 0 | 3 |

**Total Progress:** 3/9 phases complete (33%)

---

## 🎯 Next Steps

1. **Run Database Migration:**
   ```bash
   # Apply the migration to add irs_schedule_c_line field
   supabase db push
   ```

2. **Test Core Functionality:**
   - Import new export schemas in ExportsScreen
   - Test validation with sample data
   - Verify Schedule C calculations

3. **Continue with Phase D (TXF Generator):**
   - Research TXF format specification
   - Implement basic TXF generator
   - Add feature flag

4. **Polish UI (Phase E):**
   - Add validation status card
   - Improve export actions layout
   - Add helpful tooltips

5. **Add PDF Generation (Phase F):**
   - Choose PDF library (react-pdf recommended)
   - Design Schedule C PDF layout
   - Implement generator

6. **Write Tests (Phase G):**
   - Create test fixtures
   - Test all calculations
   - Test validation logic

7. **Document Everything (Phase H):**
   - Write comprehensive export guide
   - Add IRS mapping reference
   - Include CPA instructions

---

## 📝 Notes

### Design Decisions
- **Zod for validation:** Type-safe schemas with runtime validation
- **Exact IRS headers:** CPAs can import directly into their systems
- **Blocking vs warnings:** Critical errors block export, minor issues warn
- **50% meals limitation:** Applied automatically based on IRS line code
- **Mileage rate from env:** Easy to update for new tax years
- **Tax estimates only:** Not full tax prep, just planning estimates

### Known Limitations
- State tax uses 5% flat rate (simplified)
- Federal tax uses 12% bracket assumption (simplified)
- No depreciation calculations (user must track separately)
- No home office deduction (complex, requires separate form)
- TXF only for TurboTax Desktop (Online doesn't support generic imports)

### Future Enhancements
- Integration with actual tax engine for accurate estimates
- Support for more complex deductions
- Multi-year comparison reports
- Quarterly estimated tax payment calculator
- 1099-MISC/NEC reconciliation tool

---

## 🚀 Ready for Testing

The core export system is now ready for initial testing:

1. ✅ Schemas defined with exact IRS headers
2. ✅ Validator catches critical errors
3. ✅ Schedule C calculator with proper categorization
4. ✅ CSV generators with correct formatting
5. ✅ Database migration ready to apply

**Next:** Apply migration, integrate with UI, and test with real data!
