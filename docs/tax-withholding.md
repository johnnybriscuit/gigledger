# Tax Withholding System

## Overview

The tax withholding system calculates recommended tax set-aside amounts for self-employed/1099 workers based on:
- **Federal Income Tax** (estimated using conservative flat rates)
- **Self-Employment Tax** (15.3% up to Social Security wage base)
- **State Income Tax** (varies by state, supports both flat and progressive brackets)

## Data Model

### `profiles` Table Updates
Added columns to store user tax information:
- `state_code` (TEXT): Two-letter US state code (e.g., 'TN', 'CA')
- `filing_status` (TEXT): Tax filing status - 'single', 'married', or 'hoh' (head of household)

### `state_tax_rates` Table
Stores state-specific tax rates that can be updated without code changes:

```sql
CREATE TABLE state_tax_rates (
  id UUID PRIMARY KEY,
  state_code TEXT NOT NULL,
  effective_year INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flat', 'bracket')),
  flat_rate NUMERIC,
  brackets JSONB,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(state_code, effective_year)
);
```

**Rate Types:**
1. **Flat**: Single rate applies to all income
   - Example: `{state_code: 'MD', type: 'flat', flat_rate: 0.0475}`
   
2. **Bracket**: Progressive tax brackets
   - Example: `{state_code: 'CA', type: 'bracket', brackets: [{"upTo": 10000, "rate": 0.01}, {"upTo": null, "rate": 0.08}]}`

## How to Update State Tax Rates

### Method 1: SQL Function (Flat Rates)
```sql
SELECT update_state_flat_rate('MD', 2025, 0.0475, 'Updated to actual 2025 rate');
```

### Method 2: Direct SQL (Any Rate Type)
```sql
-- Update flat rate
UPDATE state_tax_rates
SET flat_rate = 0.05, notes = 'Updated rate', updated_at = NOW()
WHERE state_code = 'IL' AND effective_year = 2025;

-- Update bracket rates
UPDATE state_tax_rates
SET brackets = '[
  {"upTo": 10000, "rate": 0.01},
  {"upTo": 50000, "rate": 0.04},
  {"upTo": null, "rate": 0.093}
]'::jsonb,
notes = 'Updated 2025 brackets',
updated_at = NOW()
WHERE state_code = 'CA' AND effective_year = 2025;
```

### Method 3: Insert New Year's Rates
```sql
INSERT INTO state_tax_rates (state_code, effective_year, type, flat_rate, notes)
VALUES ('TN', 2026, 'flat', 0, 'Tennessee has no state income tax');
```

## Architecture

### Core Components

1. **Tax Constants** (`src/lib/tax/constants.ts`)
   - Federal tax rates
   - Self-employment tax rates
   - Social Security wage base
   - Configurable via environment variables

2. **Withholding Engine** (`src/lib/tax/withholding.ts`)
   - `calculateWithholding()`: Main calculation function
   - `calculateWithholdingRate()`: Returns percentage
   - `formatWithholdingBreakdown()`: Formats for display

3. **Tax Service** (`src/services/taxService.ts`)
   - `getStateRate()`: Fetches state rates with caching
   - `getUserTaxProfile()`: Gets user's state and filing status
   - `updateUserTaxProfile()`: Updates user's tax info

4. **React Hook** (`src/hooks/useWithholding.ts`)
   - `useWithholding(amount)`: Returns breakdown, loading, error states

### Calculation Flow

```
User enters gig amount
       ↓
useWithholding hook
       ↓
Fetch user tax profile (state, filing status)
       ↓
Fetch state tax rate from DB (cached)
       ↓
Calculate:
  - Self-Employment Tax (15.3% on 92.35% of earnings)
  - Federal Income Tax (flat rate by filing status)
  - State Income Tax (flat or bracket-based)
       ↓
Return breakdown to UI
```

## Environment Variables

All configuration uses `EXPO_PUBLIC_*` prefix for Expo compatibility:

```bash
EXPO_PUBLIC_TAX_YEAR=2025
EXPO_PUBLIC_FEDERAL_FLAT_RATE_SINGLE=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_MARRIED=0.12
EXPO_PUBLIC_FEDERAL_FLAT_RATE_HOH=0.12
EXPO_PUBLIC_USE_FEDERAL_BRACKETS=false
```

## Onboarding Flow

1. User completes signup
2. `OnboardingTaxInfo` screen collects:
   - State of residence (dropdown of all 50 states + DC)
   - Filing status (Single / Married / Head of Household)
3. Data saved to `profiles` table
4. Tax calculations now use user's specific rates

## UI Integration

### Gig Form Withholding Card
Shows live calculation as user types gig amount:
```
Recommended Set-Aside: $450.00
• Federal (est.): $120.00
• SE Tax (est.): $300.00
• State (est.): $30.00

Estimates only. Not tax advice.
```

If user hasn't completed tax profile, shows prompt to complete onboarding.

## Testing

### Unit Tests
Test withholding calculations for different scenarios:
```typescript
// TN (no state tax)
const tn = calculateWithholding(
  { amount: 1000, stateCode: 'TN', filingStatus: 'single' },
  { state_code: 'TN', type: 'flat', flat_rate: 0 }
);
expect(tn.stateIncome).toBe(0);

// CA (progressive brackets)
const ca = calculateWithholding(
  { amount: 50000, stateCode: 'CA', filingStatus: 'single' },
  caStateRate
);
expect(ca.stateIncome).toBeGreaterThan(0);
```

### UI Tests
- Verify state dropdown shows all 51 options
- Verify TN shows $0 state tax
- Verify CA shows non-zero state tax
- Verify breakdown updates live as amount changes

## Important Disclaimers

### ⚠️ Current Limitations (MVP)

1. **Federal Tax**: Uses flat conservative rates (12%)
   - TODO: Implement bracket-based calculation
   - TODO: Account for standard deduction
   
2. **Self-Employment Tax**: Basic implementation
   - TODO: Implement Additional Medicare Tax (0.9% over threshold)
   - TODO: Handle multiple income sources for SS cap
   
3. **State Tax Rates**: PLACEHOLDER values seeded
   - TODO: Replace with actual 2025 rates before production
   - TODO: Verify all state rates with official sources

4. **Not Tax Advice**: All estimates are for planning only
   - Users should consult tax professionals
   - Rates may change; system requires annual updates

### Data Sources for Production

Before deploying to production, update rates from:
- **Federal**: IRS Publication 15 (Circular E)
- **State**: Each state's Department of Revenue website
- **Social Security**: https://www.ssa.gov/oact/cola/cbb.html

## Maintenance

### Annual Updates Required

1. Update `EXPO_PUBLIC_TAX_YEAR` in `.env`
2. Update federal tax brackets in `constants.ts`
3. Update Social Security wage base
4. Insert new year's state rates into `state_tax_rates` table
5. Test calculations with new rates

### Monitoring

- Cache hit rate for state rates
- User completion rate of tax onboarding
- Calculation errors/failures

## Security

- State tax rates table uses RLS
- Only authenticated users can read rates
- Only service role can modify rates
- User tax profiles are user-specific via RLS on profiles table

## Future Enhancements

1. Quarterly estimated tax payment reminders
2. Year-to-date tracking for accurate bracket placement
3. Multi-state income support
4. Local/city tax support
5. Deduction optimizer
6. Tax form generation (1099, Schedule C)
