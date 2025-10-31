# Dashboard Tax Metrics - Implementation Plan

## Overview
Build a comprehensive tax planning dashboard that shows musicians exactly what they need to set aside for taxes, based on their income, expenses, and state of residence.

## Metrics to Display (from your sheet)

### Income Metrics
1. **YTD Gross Income** - Sum of all gig gross amounts
2. **YTD Net Income (after expenses)** - Gross income minus deductible expenses

### Tax Estimates
3. **YTD Estimated Self-Employment Tax** (15.3% of net income)
   - Formula: Net Income × 0.153
   - This is Social Security (12.4%) + Medicare (2.9%)

4. **YTD Estimated Federal Income Tax**
   - Based on tax brackets (progressive)
   - We'll use simplified calculation or allow user to set their rate
   - Default: ~12-22% depending on income level

5. **YTD Estimated State Income Tax**
   - Varies by state (OH = ~3%, MD = ~5.75%, etc.)
   - User can set their state tax rate in settings
   - Some states have no income tax (FL, TX, etc.)

6. **YTD Suggested Tax Set-Aside**
   - Sum of: SE Tax + Fed Tax + State Tax
   - This is the total amount to save for taxes

### Expense Metrics
7. **YTD Total Deductible Expenses** - Sum of all business expenses
8. **YTD Deductible Mileage Amount** - Mileage × IRS rate ($0.67/mile)

### Cash Flow Metrics
9. **Open Invoices (unpaid gigs)** - Sum of gigs where paid = false
10. **YTD Net Take-Home (after tax set-aside)** - Net Income - Suggested Tax Set-Aside
11. **YTD Business Cash Out (est.)** - Net Income - Expenses - Tax Set-Aside

## Implementation Approach

### Phase 1: Basic Calculations (M5)
- Calculate all metrics from existing data
- Display in dashboard cards
- Add date range filter (YTD, Last 30 days, Custom range)

### Phase 2: Tax Settings (M5)
- Add user settings for:
  - Home state (for state tax rate)
  - Estimated federal tax bracket
  - Custom tax rates if needed
- Store in user preferences table

### Phase 3: Advanced Features (M5+)
- Tax bracket calculator (progressive rates)
- Quarterly tax estimates (Q1, Q2, Q3, Q4)
- Tax payment reminders
- PDF export of tax summary

## Tax Calculation Formulas

### Self-Employment Tax (15.3%)
```
SE Tax = Net Income × 0.153
```
Note: Technically it's 92.35% of net income, but we'll simplify

### Federal Income Tax (Simplified)
```
Single Filer 2024 Brackets:
- 10% on income up to $11,600
- 12% on income $11,601 to $47,150
- 22% on income $47,151 to $100,525
- 24% on income $100,526 to $191,950
```

We'll either:
1. Implement full bracket calculation
2. Let user set their estimated rate (simpler)

### State Income Tax
```
State Tax = Net Income × State Rate

Common rates:
- OH: 2.75% - 3.75% (progressive)
- MD: 2% - 5.75% (progressive)
- CA: 1% - 13.3% (progressive)
- FL, TX, WA: 0% (no state income tax)
```

### Suggested Tax Set-Aside
```
Total Set-Aside = SE Tax + Federal Tax + State Tax
```

## Data Requirements

### Already Have:
- ✅ Gigs with amounts (gross, net, tips, per diem, other income)
- ✅ Gigs with paid status
- ✅ Expenses (coming in M3)
- ✅ Mileage (coming in M4)

### Need to Add:
- User settings table for tax preferences
- Date range filter component
- Tax calculation utilities

## Dashboard Layout

```
┌─────────────────────────────────────────┐
│  GigLedger Dashboard                    │
│  [YTD ▼] [Last 30 Days] [Custom Range] │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐           │
│  │ Gross    │  │ Net      │           │
│  │ $14,561  │  │ $7,786   │           │
│  └──────────┘  └──────────┘           │
│                                         │
│  Tax Estimates                          │
│  ┌──────────────────────────────────┐  │
│  │ SE Tax:        $1,100.16         │  │
│  │ Federal Tax:   $934.35           │  │
│  │ State Tax:     $0.00             │  │
│  │ ─────────────────────────────    │  │
│  │ Set Aside:     $2,034.51  ⚠️     │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Expenses & Deductions                  │
│  ┌──────────────────────────────────┐  │
│  │ Expenses:      $6,555.14         │  │
│  │ Mileage:       $220.43           │  │
│  └──────────────────────────────────┘  │
│                                         │
│  Cash Flow                              │
│  ┌──────────────────────────────────┐  │
│  │ Unpaid Gigs:   $999.00           │  │
│  │ Take-Home:     $5,751.72         │  │
│  │ Cash Out:      $6,775.57         │  │
│  └──────────────────────────────────┘  │
│                                         │
│  [📄 Export PDF Report]                │
└─────────────────────────────────────────┘
```

## Next Steps

1. **Complete M3** - Expenses CRUD (needed for deductions)
2. **Complete M4** - Mileage tracking (needed for mileage deduction)
3. **Build M5** - Dashboard with all these metrics
4. **Add Settings** - Tax rate configuration
5. **PDF Export** - Summary report for CPA

## Questions to Consider

1. **Tax Bracket Calculation**: Full progressive or user-set rate?
   - Recommendation: Start with user-set rate, add progressive later

2. **State Tax**: Auto-detect from gig state or user home state?
   - Recommendation: Use user home state (simpler)

3. **Quarterly Estimates**: Show quarterly breakdown?
   - Recommendation: Add in M5+ enhancement

4. **Tax Payment Tracking**: Track actual tax payments made?
   - Recommendation: Add in M5+ enhancement

## Timeline

- **M3** (Expenses): ~1-2 hours
- **M4** (Mileage): ~1 hour  
- **M5** (Dashboard + Tax Metrics): ~2-3 hours
- **Total**: ~4-6 hours of development

Ready to proceed when you are!
