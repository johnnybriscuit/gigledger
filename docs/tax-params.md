# Tax Parameters Documentation

## Overview

GigLedger uses official IRS and state tax parameters to calculate accurate tax estimates for self-employed musicians. This document explains where the numbers come from, how to update them, and how to verify calculations.

## 📂 File Structure

```
src/tax/
├── config/
│   ├── federal_2025.ts      # Official IRS 2025 federal tax constants
│   ├── 2025.ts               # Complete 2025 config (federal + states)
│   └── ...
├── engine.ts                 # Tax calculation engine
└── __tests__/
    ├── federal_2025.test.ts  # Federal constants validation tests
    └── engine.test.ts        # Engine calculation tests
```

## 🏛️ Federal Tax Parameters

### Source Documents

Federal tax parameters come from official IRS publications released annually:

1. **IRS Revenue Procedure** (November/December)
   - Published each year for the following tax year
   - Contains inflation-adjusted amounts
   - Example: [Revenue Procedure 2024-40](https://www.irs.gov/pub/irs-drop/rp-24-40.pdf) for 2025
   - Sections to reference:
     - 3.01: Standard Deduction
     - 3.02: Additional Standard Deduction (age 65+/blind)
     - 3.05-3.07: Tax Rate Schedules (Single, MFJ, HOH)

2. **Form 1040 Instructions** (December/January)
   - Contains Tax Rate Schedules
   - Confirms standard deduction amounts
   - Available at: https://www.irs.gov/forms-pubs/about-form-1040

3. **Publication 501** (January)
   - Dependents, Standard Deduction details
   - Additional standard deduction rules
   - Available at: https://www.irs.gov/publications/p501

### What's Included

**Standard Deduction** (Rev. Proc. Section 3.01)
- Single filers
- Married Filing Jointly
- Head of Household
- Married Filing Separately (same as Single)

**Additional Standard Deduction** (Rev. Proc. Section 3.02)
- Per eligible person (age 65+ or blind)
- Different amounts for married vs. unmarried filers

**Tax Brackets** (Rev. Proc. Sections 3.05-3.07)
- Seven brackets: 10%, 12%, 22%, 24%, 32%, 35%, 37%
- Separate schedules for Single, MFJ, and HOH
- Inflation-adjusted thresholds

## 📅 Updating for a New Tax Year

### When to Update

- **November/December**: IRS releases Revenue Procedure for next year
- **December/January**: Form 1040 Instructions published
- **Update immediately** when official numbers are available

### Step-by-Step Process

#### 1. Create New Federal Config File

```bash
# Copy the template
cp src/tax/config/federal_2025.ts src/tax/config/federal_2026.ts
```

#### 2. Update Values

Open `federal_2026.ts` and update:

```typescript
// Update year in comments and version
constantsVersion: '2026.IRS.v1',

// Update standard deductions
standardDeduction: {
  single: 15400,              // ← Update from Rev. Proc.
  married_joint: 30800,       // ← Update from Rev. Proc.
  head: 23100,                // ← Update from Rev. Proc.
},

// Update additional standard deduction
additionalStandardDeduction: {
  marriedJointPerEligible: 1650,  // ← Update from Rev. Proc.
  unmarriedPerEligible: 2050,     // ← Update from Rev. Proc.
},

// Update brackets for each filing status
brackets: {
  single: [
    { upTo: 12200, rate: 0.10 },  // ← Update from Rev. Proc.
    { upTo: 49500, rate: 0.12 },  // ← Update from Rev. Proc.
    // ... etc
  ],
  // ... married_joint, head
},

// Update sources with new URLs
sources: [
  'https://www.irs.gov/pub/irs-drop/rp-25-XX.pdf',  // ← New Rev. Proc.
  'https://www.irs.gov/forms-pubs/about-form-1040',
  'https://www.irs.gov/publications/p501',
],
```

#### 3. Update Main Config

Edit `src/tax/config/2025.ts` (or create `2026.ts`):

```typescript
import { FEDERAL_2026 } from './federal_2026';

// Update federal section
federal: {
  standardDeduction: {
    single: FEDERAL_2026.standardDeduction.single,
    // ... etc
  },
  brackets: {
    single: FEDERAL_2026.brackets.single,
    // ... etc
  },
},
```

#### 4. Update getFederalConfig Function

In `federal_2026.ts`:

```typescript
export function getFederalConfig(year: number): FederalConfig2025 {
  if (year === 2026) {
    return FEDERAL_2026;
  }
  if (year === 2025) {
    return FEDERAL_2025;
  }
  throw new Error(`Federal tax config not available for year ${year}`);
}
```

#### 5. Run Tests

```bash
# Run federal config tests
npm test -- federal_2026.test

# Run all tax tests
npm test -- tax/

# Verify calculations
npm test
```

## 🧪 Testing & Verification

### Running Tests

```bash
# Test federal constants
npm test -- federal_2025.test.ts

# Test specific filing status
npm test -- federal_2025.test.ts -t "Single Filer"

# Test bracket edges
npm test -- federal_2025.test.ts -t "bracket edge"

# All tax tests
npm test -- src/tax/
```

### Manual Verification

Use the built-in preview utility:

```typescript
import { printFederalPreview } from './src/tax/config/federal_2025';

// Print Single filer parameters
printFederalPreview(2025, 'single');

// Print MFJ parameters
printFederalPreview(2025, 'married_joint');

// Print HOH parameters
printFederalPreview(2025, 'head');
```

Output example:
```
=== Federal Tax Parameters 2025 (single) ===
Version: 2025.IRS.v1

Standard Deduction: $15,000

Additional Standard Deduction:
  Per eligible person: $2,000

Tax Brackets:
  1.  10% - to $11,925
  2.  12% - to $48,475
  3.  22% - to $103,350
  4.  24% - to $197,300
  5.  32% - to $250,525
  6.  35% - to $626,350
  7.  37% - and above

Sources:
  - https://www.irs.gov/pub/irs-drop/rp-24-40.pdf
  - https://www.irs.gov/forms-pubs/about-form-1040
  - https://www.irs.gov/publications/p501
```

### Bracket Boundary Testing

Tests automatically verify calculations at bracket edges:

```typescript
// Example: Test at 12% bracket edge for Single
const income = 48474;  // Just below $48,475 threshold
const expectedTax = (11925 * 0.10) + ((48474 - 11925) * 0.12);
// = $1,192.50 + $4,385.88 = $5,578.38
```

## 🔍 Health Checks

### CI Validation

The configuration includes automatic validation:

```typescript
// Validates on module load
validateFederalConfig(FEDERAL_2025);

// Checks:
// ✓ Sources array is not empty
// ✓ At least one source contains 'irs.gov'
// ✓ All bracket arrays end with null (top bracket)
// ✓ Rates are in ascending order
```

### Pre-commit Hook (Optional)

Add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm test -- federal_2025.test.ts --passWithNoTests
if [ $? -ne 0 ]; then
  echo "❌ Federal tax config validation failed"
  exit 1
fi
```

## 🏛️ State Tax Parameters

### Current Status

- **Tennessee**: No state income tax ✅
- **Texas**: No state income tax ✅
- **California**: TODO - Awaiting 2025 FTB tables
- **New York**: TODO - Awaiting 2025 DTF tables
- **Maryland**: TODO - Awaiting 2025 Comptroller tables

### Updating State Parameters

Similar process to federal:

1. Find official state tax authority website
2. Locate annual tax tables/brackets
3. Update `src/tax/config/2025.ts` state section
4. Add source links in comments
5. Run tests

## 📚 Additional Resources

### IRS Resources

- [IRS Tax Statistics](https://www.irs.gov/statistics)
- [Tax Inflation Adjustments](https://www.irs.gov/newsroom/irs-provides-tax-inflation-adjustments)
- [Forms & Publications](https://www.irs.gov/forms-instructions)

### State Resources

- **California**: [Franchise Tax Board](https://www.ftb.ca.gov/)
- **New York**: [Department of Taxation](https://www.tax.ny.gov/)
- **Maryland**: [Comptroller of Maryland](https://www.marylandtaxes.gov/)

## ❓ FAQ

**Q: Why separate federal_2025.ts from 2025.ts?**
A: Separation of concerns. Federal constants are official IRS values that change annually. The main config combines federal + state + SE tax rules.

**Q: When should I update the constants?**
A: As soon as the IRS publishes the Revenue Procedure (usually November/December for the following year).

**Q: What if I use placeholder values?**
A: The app will work, but calculations won't be accurate. Always use official values when available.

**Q: How do I verify my updates are correct?**
A: Run the test suite (`npm test -- federal_2025.test`). Tests validate structure, bracket edges, and calculations.

**Q: What about Married Filing Separately?**
A: MFS uses the same brackets as Single filers (per IRS rules). We map it in the main config.

**Q: Do I need to update SE tax rates?**
A: SE tax rates rarely change (12.4% Social Security + 2.9% Medicare). The wage base cap changes annually and is in the main config.

## 🚀 Quick Reference

```bash
# View current federal config
cat src/tax/config/federal_2025.ts

# Run all tax tests
npm test -- src/tax/

# Test specific year
npm test -- federal_2025.test.ts

# Preview parameters
node -e "require('./src/tax/config/federal_2025').printFederalPreview(2025, 'single')"

# Validate config
npm test -- federal_2025.test.ts -t "Configuration Validation"
```

---

**Last Updated**: November 3, 2024  
**Current Tax Year**: 2025  
**Next Update Due**: November 2025 (for 2026 parameters)
