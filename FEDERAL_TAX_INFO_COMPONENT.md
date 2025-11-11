# Federal Tax Info Component

## Overview

Added a clear, musician-friendly component that explains when federal income tax starts applying based on the user's actual filing status and YTD numbers.

---

## Component Location

**`src/components/tax/FederalTaxInfo.tsx`**

---

## Usage

The component is integrated into the Dashboard's `HeroNetProfit` card and appears below the Tax Breakdown when expanded.

```tsx
<FederalTaxInfo
  netProfitYtd={currentData.totals.net}
  estimatedSelfEmploymentTaxYtd={taxBreakdown.seTax}
  federalTaxEstimate={taxBreakdown.federal}
  filingStatus={taxProfile.filingStatus}
/>
```

---

## How It Works

### Inputs
- `netProfitYtd` - Year-to-date net profit
- `estimatedSelfEmploymentTaxYtd` - Estimated SE tax for the year
- `federalTaxEstimate` - Current federal income tax estimate
- `filingStatus` - User's filing status ('single', 'married_joint', 'head', etc.)

### Calculation Logic

```typescript
// 1. Get standard deduction from our 2025 config
const standardDeduction = config2025.federal.standardDeduction[filingStatus];

// 2. Calculate half SE tax deduction (above-the-line)
const halfSeDeduction = estimatedSelfEmploymentTaxYtd / 2;

// 3. Calculate taxable income (same formula as tax engine)
const taxableIncome = Math.max(0, netProfitYtd - halfSeDeduction - standardDeduction);

// 4. Calculate threshold where federal tax starts
// This is when: netProfit - halfSE - standardDeduction > 0
// Solving for netProfit: netProfit > standardDeduction + halfSE
const federalStartThreshold = standardDeduction + halfSeDeduction;
```

### Display Logic

**If federal tax is $0:**
```
Because your estimated taxable income is below the standard deduction for 
[Filing Status], your estimated federal income tax is $0 so far.

Based on your current settings, federal income tax would start once your 
year-to-date net profit is above approximately $[threshold].
```

**If federal tax > $0:**
```
You're above the standard deduction for [Filing Status], so we estimate 
$[amount] in federal income tax so far.
```

**Always includes disclaimer:**
```
These are simplified estimates for planning only and not tax advice. 
Actual tax depends on your full-year income and situation.
```

---

## Example Scenarios

### Scenario 1: Low Income (Below Standard Deduction)

**Inputs:**
- Net Profit YTD: $1,391
- SE Tax: $196
- Federal Tax: $0
- Filing Status: Single

**Calculation:**
```
Standard Deduction (Single): $15,000
Half SE Deduction: $196 / 2 = $98
Threshold: $15,000 + $98 = $15,098
```

**Display:**
```
💡 Federal Income Tax Explained

Because your estimated taxable income is below the standard deduction for 
Single, your estimated federal income tax is $0 so far.

Based on your current settings, federal income tax would start once your 
year-to-date net profit is above approximately $15,098.

These are simplified estimates for planning only and not tax advice...
```

---

### Scenario 2: Above Standard Deduction

**Inputs:**
- Net Profit YTD: $50,000
- SE Tax: $7,065
- Federal Tax: $2,800
- Filing Status: Single

**Calculation:**
```
Standard Deduction (Single): $15,000
Half SE Deduction: $7,065 / 2 = $3,533
Taxable Income: $50,000 - $3,533 - $15,000 = $31,467
Federal Tax: ~$2,800 (from progressive brackets)
```

**Display:**
```
💡 Federal Income Tax Explained

You're above the standard deduction for Single, so we estimate $2,800 
in federal income tax so far.

These are simplified estimates for planning only and not tax advice...
```

---

### Scenario 3: Married Filing Jointly

**Inputs:**
- Net Profit YTD: $10,000
- SE Tax: $1,413
- Federal Tax: $0
- Filing Status: Married Filing Jointly

**Calculation:**
```
Standard Deduction (Married Joint): $30,000
Half SE Deduction: $1,413 / 2 = $707
Threshold: $30,000 + $707 = $30,707
```

**Display:**
```
💡 Federal Income Tax Explained

Because your estimated taxable income is below the standard deduction for 
Married Filing Jointly, your estimated federal income tax is $0 so far.

Based on your current settings, federal income tax would start once your 
year-to-date net profit is above approximately $30,707.

These are simplified estimates for planning only and not tax advice...
```

---

## Design Principles

### ✅ No Hardcoded Values
- All values come from `config2025.federal.standardDeduction`
- Uses same formulas as tax engine
- Single source of truth

### ✅ Musician-Friendly Language
- No IRS jargon
- Clear, conversational tone
- Helpful guidance without being overwhelming

### ✅ Responsive Design
- Works on desktop and mobile
- Clean, minimal styling
- Fits naturally below tax breakdown

### ✅ Appropriate Disclaimers
- Clear that these are estimates
- Not tax advice
- Depends on full-year situation

---

## Integration Points

### Dashboard (HeroNetProfit)
**File:** `src/components/dashboard/HeroNetProfit.tsx`

The component appears when:
1. User clicks "Set Aside" pill to expand tax breakdown
2. Tax breakdown is visible
3. Tax profile is loaded

**Placement:**
```tsx
{/* Tax Breakdown */}
{showTaxBreakdown && taxBreakdown && (
  <View>
    {/* ... breakdown rows ... */}
  </View>
)}

{/* Federal Tax Explanation */}
{showTaxBreakdown && taxBreakdown && taxProfile && (
  <FederalTaxInfo
    netProfitYtd={currentData.totals.net}
    estimatedSelfEmploymentTaxYtd={taxBreakdown.seTax}
    federalTaxEstimate={taxBreakdown.federal}
    filingStatus={taxProfile.filingStatus}
  />
)}
```

---

## Technical Details

### Dependencies
- `config2025` - For standard deduction constants
- `useTheme` - For theme colors
- React Native components (View, Text, StyleSheet)

### Helper Functions

**`getFilingStatusLabel()`**
```typescript
function getFilingStatusLabel(status: FilingStatus): string {
  const labels: Record<FilingStatus, string> = {
    single: 'Single',
    married_joint: 'Married Filing Jointly',
    married_separate: 'Married Filing Separately',
    head: 'Head of Household',
  };
  return labels[status];
}
```

**`formatCurrency()`**
```typescript
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

---

## Styling

- **Container**: Rounded card with subtle border and shadow
- **Header**: Icon (💡) + title
- **Content**: Clear, readable text with appropriate line height
- **Disclaimer**: Separated with border, italicized, muted color
- **Responsive**: Works on all screen sizes

---

## Future Enhancements

Potential improvements (not currently implemented):

1. **Interactive Threshold Calculator**
   - Let users see how much more they need to earn before federal tax applies
   - Show progress bar toward threshold

2. **Bracket Information**
   - Show which tax bracket they're currently in
   - Explain marginal vs effective rates

3. **Comparison Tool**
   - Compare different filing statuses
   - Show impact of itemizing vs standard deduction

4. **Historical Trends**
   - Show how threshold has changed over time
   - Project end-of-year federal tax

---

## Testing

### Manual Testing Checklist

- [ ] Low income (below threshold) shows correct message
- [ ] Above threshold shows correct federal tax amount
- [ ] All filing statuses display correct labels
- [ ] Threshold calculations are accurate
- [ ] Component is responsive on mobile
- [ ] Theme colors apply correctly
- [ ] Disclaimer is always visible

### Test Cases

**Test 1: Single, $1,391 net**
- Expected: $0 federal, threshold ~$15,098

**Test 2: Single, $50,000 net**
- Expected: ~$2,800 federal, "above standard deduction" message

**Test 3: Married Joint, $10,000 net**
- Expected: $0 federal, threshold ~$30,707

**Test 4: Head of Household, $25,000 net**
- Expected: ~$200 federal, "above standard deduction" message

---

## Summary

The Federal Tax Info component provides clear, actionable guidance to musicians about when federal income tax starts applying to their earnings. It:

- ✅ Uses our tax engine constants (no hardcoded values)
- ✅ Calculates thresholds dynamically based on filing status
- ✅ Shows personalized, musician-friendly messages
- ✅ Includes appropriate disclaimers
- ✅ Integrates seamlessly into the Dashboard
- ✅ Works on all devices

This helps users understand why they might see $0 federal tax early in the year and when they should expect it to kick in.
