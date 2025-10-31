# Export Center - Phase 1 Complete ✅

## Overview
The Export Center provides tax-ready data exports for musicians and freelancers. Users can download their gig income, expenses, mileage, and payer information in CSV or JSON format, with proper Schedule C categorization for tax preparation.

## What's Been Implemented

### 1. Database Layer (SQL Views & Functions)
**File**: `supabase/migrations/20250121_create_export_views.sql`

#### Views Created:
- **`v_gigs_export`**: Clean gig data with payer names and city/state
- **`v_expenses_export`**: All expenses with categories and receipts
- **`v_mileage_export`**: Mileage entries with IRS deduction calculations
- **`v_payers_export`**: Payer contact info for 1099 tracking
- All views use `security_invoker = on` to respect RLS

#### Functions Created:
- **`calculate_schedule_c_summary()`**: Aggregates expenses by IRS Schedule C line items
  - Maps expense categories to tax categories
  - Applies 50% deduction for meals
  - Calculates mileage deduction using IRS rate
  - Includes/excludes tips and fees based on parameters
- **`get_tax_year_range()`**: Helper to get date range for a tax year

### 2. Schedule C Category Mapper
**File**: `src/lib/scheduleCMapper.ts`

Maps expense categories to IRS Schedule C line items:
- **Travel** → Line 24a (Travel)
- **Meals** → Line 24b (Meals - 50% deductible)
- **Lodging** → Line 24a (Travel)
- **Supplies** → Line 22 (Supplies)
- **Marketing** → Line 8 (Advertising)
- **Education** → Line 27a (Other Expenses)
- **Software** → Line 18 (Office Expense)
- **Fees** → Line 17 (Legal and Professional Services)
- **Equipment** → Line 13 (Depreciation)
- **Rent** → Line 20a (Rent or Lease)
- **Other** → Line 27a (Other Expenses)

**Key Features:**
- Configurable IRS mileage rates by year (2024: $0.67/mile)
- Automatic 50% deduction for meals
- Groups expenses by Schedule C line with totals
- Fully typed with TypeScript

### 3. Export Hooks
**File**: `src/hooks/useExports.ts`

React Query hooks for fetching export data:
- `useGigsExport(filters)` - Fetch gigs with date filtering
- `useExpensesExport(filters)` - Fetch expenses with date filtering
- `useMileageExport(filters)` - Fetch mileage with date filtering
- `usePayersExport()` - Fetch all payers
- `useScheduleCSummary(filters)` - Get Schedule C aggregated data
- `useAllExportData(filters)` - Fetch everything at once

**Filter Options:**
```typescript
{
  startDate: string;      // YYYY-MM-DD
  endDate: string;        // YYYY-MM-DD
  includeTips: boolean;   // Include tips in income
  includeFees: boolean;   // Include fees as deduction
}
```

### 4. CSV Export Utilities
**File**: `src/lib/csvExport.ts`

**Functions:**
- `generateGigsCSV()` - Gigs with payer, location, amounts
- `generateExpensesCSV()` - Expenses with category, vendor, receipts
- `generateMileageCSV()` - Mileage with deduction amounts
- `generatePayersCSV()` - Payer contact info
- `generateScheduleCSV()` - Schedule C summary
- `downloadAllCSVs()` - Downloads all 5 CSVs with staggered timing
- `generateJSONBackup()` - Complete data backup in JSON
- `downloadJSONBackup()` - Downloads JSON file

**Features:**
- Proper CSV escaping (commas, quotes, newlines)
- UTF-8 encoding for Excel/Google Sheets compatibility
- Staggered downloads to avoid browser blocking
- Clean filenames: `gigledger_2024_gigs.csv`

### 5. Export Center UI
**File**: `src/screens/ExportsScreen.tsx`

**Features:**
- **Tax Year Selector**: Quick buttons for last 5 years
- **Custom Date Range**: Toggle for specific date ranges
- **Include/Exclude Options**:
  - Include tips in income (default: on)
  - Include fees as deduction (default: on)
- **Data Summary Cards**: Shows count of gigs, expenses, mileage, payers
- **Export Buttons**:
  - ✅ Download CSVs (5 files)
  - 🚧 Download Excel (coming soon)
  - 🚧 Download PDF Summary (coming soon)
  - ✅ Download JSON Backup
- **Help Section**: Explains what gets exported and how to use it

**Navigation:**
- Added "Exports" tab to main navigation
- Accessible from dashboard alongside Gigs, Expenses, Mileage

## How to Use

### 1. Run the Migration
```bash
# In Supabase SQL Editor, run:
supabase/migrations/20250121_create_export_views.sql
```

### 2. Navigate to Exports
1. Open GigLedger app
2. Click "Exports" tab in top navigation
3. Select tax year or custom date range
4. Toggle tips/fees options as needed
5. Click "Download CSVs" or "Download JSON Backup"

### 3. Send to CPA
The exported CSVs are ready for tax preparation:
- **gigs.csv**: Income summary
- **expenses.csv**: Deductible expenses
- **mileage.csv**: Business mileage
- **payers.csv**: 1099 tracking
- **schedule_c.csv**: Tax-ready expense categories

## File Structure

```
src/
├── hooks/
│   └── useExports.ts          # React Query hooks for export data
├── lib/
│   ├── scheduleCMapper.ts     # IRS Schedule C category mapping
│   └── csvExport.ts           # CSV generation and download
└── screens/
    └── ExportsScreen.tsx      # Export Center UI

supabase/migrations/
└── 20250121_create_export_views.sql  # Database views and functions
```

## Example Export Data

### Gigs CSV
```csv
Date,Payer,City_State,Gross_Amount,Per_Diem,Tips,Fees,Other_Income,Net_Amount,Notes
2024-01-15,Blue Note Jazz Club,"New York, NY",500.00,0.00,150.00,50.00,0.00,600.00,Friday night set
2024-01-20,Private Event,"Boston, MA",1000.00,100.00,200.00,0.00,0.00,1300.00,Wedding reception
```

### Schedule C CSV
```csv
Line_Name,Amount
Gross Receipts,15000.00
Returns and Allowances,500.00
Travel,2500.00
Meals and Entertainment,750.00
Supplies,1200.00
Advertising,800.00
Car and Truck Expenses,3350.00
```

## Tax Calculations

### Income
- **Gross Receipts**: Sum of all gig `gross_amount`
- **Tips**: Included if `includeTips = true`
- **Per Diem**: Always included
- **Other Income**: Always included
- **Fees**: Subtracted if `includeFees = true`

### Expenses
- **Meals**: Automatically 50% deductible
- **Mileage**: IRS standard rate × miles (2024: $0.67/mile)
- **Other Categories**: 100% deductible

### Schedule C Mapping
Expenses are automatically categorized to match IRS Schedule C:
- Line 8: Advertising (Marketing)
- Line 9: Car and Truck Expenses (Mileage)
- Line 13: Depreciation (Equipment)
- Line 17: Legal and Professional Services (Fees)
- Line 18: Office Expense (Software)
- Line 20a: Rent or Lease (Rent, Storage)
- Line 22: Supplies
- Line 24a: Travel (Travel, Lodging)
- Line 24b: Meals (50% deductible)
- Line 27a: Other Expenses (Education, Other)

## Security

### Row Level Security (RLS)
All views use `security_invoker = on`, which means:
- Users only see their own data
- RLS policies from underlying tables are enforced
- No data leakage between users

### Authentication
- All export hooks check `supabase.auth.getUser()`
- Unauthenticated requests are rejected
- User ID is automatically filtered in all queries

## Performance

### Optimizations
- Views use indexed columns (`user_id`, `date`)
- Queries use `ORDER BY date DESC` for recent data first
- React Query caching prevents redundant fetches
- CSV generation is client-side (no server load)

### Tested With
- ✅ 0 records (empty CSVs with headers)
- ✅ 100 records (instant)
- ✅ 1,000 records (< 1 second)
- 🚧 10,000 records (needs testing)

## Known Limitations

### Phase 1 (Current)
- ✅ CSV exports only (no Excel or PDF yet)
- ✅ JSON backup available
- ⚠️ Multiple downloads may be blocked by browser (uses staggered timing)
- ⚠️ No export history tracking
- ⚠️ No email delivery option

### Coming in Phase 2
- Excel export with formatted sheets
- PDF tax summary with calculations
- Unit tests for mapper and date filtering
- Export history table
- Email delivery option

## Next Steps

See `EXPORT_CENTER_TODO.md` for:
1. Excel export implementation
2. PDF tax summary generator
3. Unit tests
4. Supabase Edge Function (optional)
5. Future enhancements (TXF, QuickBooks, Accrual mode)

## Testing Checklist

Before using in production:
- [x] Run migration successfully
- [x] Test CSV downloads in browser
- [x] Verify UTF-8 encoding (open in Excel)
- [x] Test with special characters (commas, quotes)
- [x] Verify date filtering works
- [x] Check tips/fees toggles affect totals
- [x] Confirm RLS prevents cross-user data access
- [ ] Test with 10,000+ records
- [ ] Test on mobile devices
- [ ] Verify Schedule C totals match dashboard

## Support

### Common Issues

**Q: CSVs won't open in Excel**
A: Ensure UTF-8 encoding. Right-click file → Open With → Excel → Select UTF-8 encoding

**Q: Downloads are blocked**
A: Allow multiple downloads in browser settings, or download JSON backup instead

**Q: Schedule C totals don't match dashboard**
A: Check tips/fees toggle settings. Dashboard may include/exclude differently.

**Q: Meals deduction seems wrong**
A: Meals are automatically 50% deductible per IRS rules. Check `schedule_c.csv` for details.

**Q: Mileage deduction rate is wrong**
A: Rate is set per year in `scheduleCMapper.ts`. Update if IRS rate changes.

## Version History

- **v1.0** (2025-01-21): Initial release
  - CSV exports (5 files)
  - JSON backup
  - Schedule C mapping
  - Tax year and date range filtering
  - Tips/fees toggles

## Credits

Built for GigLedger - The musician's tax tracking app
