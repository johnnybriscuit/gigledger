# GigLedger Export System Documentation

## Overview

GigLedger's export system generates tax-ready reports in multiple formats for CPAs, tax professionals, and TurboTax Desktop users. All exports follow IRS Schedule C format with exact line codes and proper categorization.

---

## Table of Contents

1. [Export Formats](#export-formats)
2. [CSV Export Details](#csv-export-details)
3. [IRS Schedule C Mapping](#irs-schedule-c-mapping)
4. [TXF Format (TurboTax Desktop)](#txf-format)
5. [PDF Summary](#pdf-summary)
6. [Validation System](#validation-system)
7. [Usage Guide](#usage-guide)
8. [Known Limitations](#known-limitations)
9. [Disclaimers](#disclaimers)

---

## Export Formats

### 1. CSV Exports (Recommended for CPAs)
Five separate CSV files with IRS-compliant headers:
- **Gigs.csv** - All gig income with payer details
- **Expenses.csv** - Categorized expenses with IRS line codes
- **Mileage.csv** - Business mileage with standard rate deductions
- **Payers.csv** - Contact information for 1099 reconciliation
- **ScheduleCSummary.csv** - Complete Schedule C summary

### 2. TXF Format (TurboTax Desktop Only)
- Tax Exchange Format for TurboTax Desktop import
- **NOT compatible with TurboTax Online**
- Simplified Schedule C income and expenses
- Desktop application only (Windows/Mac)

### 3. PDF Summary
- Professional Schedule C summary document
- Print-ready or save as PDF via browser
- CPA-friendly layout with IRS line codes
- Includes tax estimates and disclaimers

### 4. JSON Backup
- Complete data backup in JSON format
- Always available (no validation required)
- Good for record keeping and data portability

---

## CSV Export Details

### Gigs.csv

**Headers (in exact order):**
```
gig_id, date, title, payer_name, payer_ein_or_ssn, city, state, country,
gross_amount, tips, per_diem, fees, other_income, payment_method,
invoice_url, paid, withholding_federal, withholding_state, notes
```

**Example Row:**
```csv
abc123,2025-01-15,Wedding Gig,John Smith,12-3456789,Nashville,TN,US,1000.00,200.00,50.00,100.00,0.00,Check,,true,0.00,0.00,
```

**Field Descriptions:**
- `gig_id` - Unique identifier
- `date` - Date in YYYY-MM-DD format
- `title` - Gig description
- `payer_name` - Who paid you
- `payer_ein_or_ssn` - Payer's EIN or SSN (for 1099 reconciliation)
- `gross_amount` - Base payment amount
- `tips` - Cash tips received
- `per_diem` - Per diem allowance
- `fees` - Platform or processing fees
- `other_income` - Other income from this gig
- `withholding_federal` - Federal tax withheld
- `withholding_state` - State tax withheld

---

### Expenses.csv

**Headers (in exact order):**
```
expense_id, date, merchant, description, amount, gl_category,
irs_schedule_c_line, meals_percent_allowed, linked_gig_id,
receipt_url, notes
```

**Example Row:**
```csv
xyz789,2025-01-10,Guitar Center,Guitar strings,50.00,Supplies,22,1.0,,,
```

**Field Descriptions:**
- `expense_id` - Unique identifier
- `irs_schedule_c_line` - **REQUIRED** IRS line code (see mapping below)
- `gl_category` - GigLedger internal category
- `meals_percent_allowed` - Deduction percentage (0.5 = 50% for meals)
- `linked_gig_id` - Associated gig (if applicable)

**Important:** Every expense MUST have an `irs_schedule_c_line` code. Exports will be blocked if any expense is missing this field.

---

### Mileage.csv

**Headers (in exact order):**
```
trip_id, date, origin, destination, business_miles, purpose,
vehicle, standard_rate, calculated_deduction
```

**Example Row:**
```csv
mileage1,2025-01-15,Home,Wedding Venue,50,Travel to gig,Honda Accord,0.67,33.50
```

**Field Descriptions:**
- `business_miles` - Miles driven for business
- `standard_rate` - IRS standard mileage rate (2025: $0.67/mile)
- `calculated_deduction` - Miles × Rate
- `purpose` - Business purpose (required by IRS)

---

### Payers.csv

**Headers (in exact order):**
```
payer_id, payer_name, contact_name, email, phone, address,
city, state, postal, country, ein_or_ssn, notes
```

**Example Row:**
```csv
payer1,ABC Corp,Jane Doe,jane@abc.com,615-555-1234,123 Main St,Nashville,TN,37201,US,12-3456789,
```

---

### ScheduleCSummary.csv

**Headers (36 fields total):**
```
tax_year, filing_status, state_of_residence, standard_or_itemized,
gross_receipts, returns_and_allowances, other_income, total_income,
advertising, car_truck, commissions, contract_labor, depreciation,
employee_benefit, insurance_other, interest_mortgage, interest_other,
legal_professional, office_expense, rent_vehicles, rent_other,
repairs_maintenance, supplies, taxes_licenses, travel, meals_allowed,
utilities, wages, other_expenses_total, total_expenses, net_profit,
se_tax_basis, est_se_tax, est_federal_income_tax, est_state_income_tax,
est_total_tax, set_aside_suggested
```

**Example Row:**
```csv
2025,single,TN,standard,10000.00,0.00,0.00,10000.00,200.00,500.00,100.00,0.00,0.00,0.00,150.00,0.00,0.00,300.00,100.00,0.00,800.00,50.00,250.00,100.00,400.00,150.00,200.00,0.00,100.00,3400.00,6600.00,6095.10,1013.08,792.00,330.00,2135.08,2135.08
```

---

## IRS Schedule C Mapping

### GigLedger Category → IRS Line Code

| GigLedger Category | IRS Line | Schedule C Description |
|-------------------|----------|------------------------|
| Equipment | 22 | Supplies |
| Supplies | 22 | Supplies |
| Marketing | 8 | Advertising |
| Travel | 24a | Travel |
| Lodging | 24a | Travel |
| **Meals** | **24b** | **Meals (50% limitation)** |
| Software | 18 | Office Expense |
| Education | 27a | Other Expenses |
| Fees | 10 | Commissions and Fees |
| Rent | 20b | Rent or Lease - Other |
| Other | 27a | Other Expenses |

### Complete IRS Schedule C Line Codes

**Part I: Income**
- Line 1: Gross receipts or sales
- Line 2: Returns and allowances
- Line 6: Other income
- Line 7: Gross income

**Part II: Expenses**
- Line 8: Advertising
- Line 9: Car and truck expenses
- Line 10: Commissions and fees
- Line 11: Contract labor
- Line 12: Depletion
- Line 13: Depreciation
- Line 14: Employee benefit programs
- Line 15: Insurance (other than health)
- Line 16a: Interest - Mortgage
- Line 16b: Interest - Other
- Line 17: Legal and professional services
- Line 18: Office expense
- Line 19: Pension and profit-sharing plans
- Line 20a: Rent or lease - Vehicles, machinery, equipment
- Line 20b: Rent or lease - Other business property
- Line 21: Repairs and maintenance
- Line 22: Supplies
- Line 23: Taxes and licenses
- Line 24a: Travel
- Line 24b: Deductible meals (50% limitation)
- Line 25: Utilities
- Line 26: Wages
- Line 27a: Other expenses

**Part III: Cost of Goods Sold**
- Not applicable for most musicians

**Part IV: Information on Your Vehicle**
- Use standard mileage rate (recommended)
- 2025 rate: $0.67 per mile

**Part V: Other Expenses**
- Line 48: Total other expenses

---

## TXF Format

### What is TXF?

TXF (Tax Exchange Format) is a plain text format used by **TurboTax Desktop** to import tax data.

### Important Limitations

⚠️ **TurboTax Online does NOT support TXF imports**
- TXF only works with TurboTax Desktop (Windows/Mac application)
- TurboTax Online users should use CSV exports instead
- Give CSVs to your CPA or manually enter data

### TXF Import Instructions

1. Open **TurboTax Desktop** (not Online)
2. Go to **File → Import → From TXF Files**
3. Select the downloaded `.txf` file
4. Review all imported data carefully
5. TurboTax will place amounts on appropriate Schedule C lines

### What's Included in TXF

- Schedule C gross receipts
- Schedule C other income
- All expense categories with IRS line codes
- Totals for each category

### What's NOT Included

- Form 4562 (depreciation details)
- Vehicle expense details (Part IV)
- Home office deduction (Form 8829)
- Detailed expense breakdowns

**Always review imported data for accuracy!**

---

## PDF Summary

### Features

- Professional Schedule C layout
- IRS line codes clearly marked
- Color-coded sections
- Tax estimates (informational only)
- Legal disclaimers
- Print-ready format

### How to Use

1. Click "Download PDF" in Exports screen
2. New window opens with formatted document
3. Click "Print / Save as PDF" button
4. Choose "Save as PDF" in print dialog
5. Save to your computer

### What's Included

- **Header:** Tax year, taxpayer info, filing status
- **Part I:** Income summary
- **Part II:** Expense breakdown by category
- **Net Profit:** Total profit or loss
- **Tax Estimates:** SE tax, federal, state (informational)
- **Disclaimer:** Legal notice

### Sharing with CPA

Send your CPA:
1. All 5 CSV files
2. PDF summary
3. Any receipts or supporting documents

The PDF provides a quick overview while CSVs contain detailed data.

---

## Validation System

### Pre-Export Validation

GigLedger validates all data before allowing export to ensure accuracy and completeness.

### Blocking Errors (Prevent Export)

❌ **Expenses:**
- Missing `irs_schedule_c_line` field
- Negative amounts
- Invalid dates (not YYYY-MM-DD format)

❌ **Gigs:**
- Negative `gross_amount`
- Invalid dates

❌ **Mileage:**
- Negative `business_miles`
- Invalid dates

**Fix all blocking errors before exporting!**

### Warnings (Allow Export with Review)

⚠️ **Expenses:**
- Meals without `meals_percent_allowed` (defaults to 50%)

⚠️ **Gigs:**
- Missing `payer_name` (needed for 1099 reconciliation)
- Missing `payer_ein_or_ssn` on paid gigs (needed for 1099)

⚠️ **Mileage:**
- Missing `purpose` (IRS requires business purpose)
- Missing `origin` or `destination` (documentation requirement)

**You can export with warnings, but review them first!**

### Validation Status Card

The Exports screen shows validation status:
- ✅ **Green:** All checks passed, ready to export
- ⚠️ **Yellow:** Warnings found, review before exporting
- ❌ **Red:** Blocking errors, must fix before exporting

Click "View Details" to see all issues.

---

## Usage Guide

### Step 1: Navigate to Exports

1. Open GigLedger
2. Go to **Exports** tab
3. Select tax year

### Step 2: Review Validation

1. Check validation status card
2. If errors exist, click "View Details"
3. Fix any blocking errors
4. Review warnings

### Step 3: Choose Export Format

**For CPAs (Recommended):**
- Click "Download CSVs"
- 5 files will download
- Send all files to your CPA

**For TurboTax Desktop:**
- Click "Download TXF"
- Import into TurboTax Desktop
- Review all imported data

**For Quick Review:**
- Click "Download PDF"
- Print or save as PDF
- Share with CPA for overview

**For Backup:**
- Click "Download JSON Backup"
- Save for your records
- Can be re-imported later

### Step 4: Review Data

**Before sending to CPA:**
- Open CSV files in Excel/Google Sheets
- Verify all amounts are correct
- Check that all expenses have IRS line codes
- Confirm payer information is complete

### Step 5: File Taxes

**With a CPA:**
- Send all CSV files + PDF
- CPA will prepare your Schedule C
- Review and sign your return

**With TurboTax Desktop:**
- Import TXF file
- Review all imported data
- Complete remaining tax forms
- File electronically

**DIY:**
- Use CSV data to fill out Schedule C
- Use PDF as reference
- Consult IRS instructions
- Consider professional help for complex situations

---

## Known Limitations

### General

- **Not Tax Advice:** GigLedger provides estimates and data organization, not tax advice
- **Simplified Calculations:** Tax estimates use simplified formulas
- **State Taxes:** State tax estimates use flat 5% rate (not all states)
- **No Depreciation:** Detailed depreciation calculations not included
- **No Home Office:** Form 8829 (home office) not included

### CSV Exports

- **Manual Import:** Most tax software requires manual data entry from CSVs
- **CPA Review:** Always have a CPA review your data
- **No Automatic Filing:** CSVs don't file your taxes automatically

### TXF Format

- **Desktop Only:** TurboTax Online does NOT support TXF
- **Limited Detail:** Simplified Schedule C only
- **No Supporting Forms:** Form 4562, 8829, etc. not included
- **Manual Review Required:** Always review imported data

### PDF Summary

- **Not Official Form:** PDF is a summary, not an official IRS form
- **Estimates Only:** Tax estimates are for planning, not filing
- **No E-Filing:** Cannot be e-filed directly

### Validation

- **Basic Checks Only:** Validates format and required fields
- **No Tax Logic:** Doesn't validate tax law compliance
- **CPA Review Needed:** Professional review still required

---

## Disclaimers

### Legal Disclaimer

**IMPORTANT: READ CAREFULLY**

GigLedger's export system is provided for informational and planning purposes only. It is NOT:
- Tax preparation software
- A substitute for professional tax advice
- Guaranteed to be accurate or complete
- Approved or endorsed by the IRS

### Tax Advice Disclaimer

GigLedger does NOT provide tax, legal, or accounting advice. All exports, calculations, and estimates are:
- Simplified for planning purposes
- Not a substitute for professional preparation
- Subject to errors and omissions
- Not reviewed by tax professionals

**Always consult with a qualified tax professional (CPA or EA) for:**
- Tax preparation and filing
- Tax planning and strategy
- Compliance with tax laws
- Audit support

### Accuracy Disclaimer

While we strive for accuracy, GigLedger:
- Cannot guarantee error-free calculations
- May not reflect current tax law changes
- Does not account for all tax situations
- Provides estimates, not final tax amounts

**You are responsible for:**
- Verifying all exported data
- Ensuring accuracy of your tax return
- Compliance with all tax laws
- Keeping proper records and receipts

### Liability Disclaimer

GigLedger and its creators are NOT responsible for:
- Errors in exported data
- Tax penalties or interest
- Audit issues or disputes
- Financial losses from using exports
- Decisions made based on estimates

### Use at Your Own Risk

By using GigLedger's export system, you acknowledge:
- You understand these limitations
- You will verify all data before filing
- You will consult a tax professional
- You accept all risks and responsibilities

---

## Support

### Questions?

- **Email:** support@gigledger.com
- **Documentation:** docs.gigledger.com
- **Community:** community.gigledger.com

### Found a Bug?

- Report on GitHub: github.com/gigledger/gigledger/issues
- Email: bugs@gigledger.com

### Need Tax Help?

- Find a CPA: aicpa.org/findacpa
- Find an EA: naea.org/find-an-ea
- IRS Help: irs.gov

---

## Version History

- **v1.0** (2025-01-12): Initial release
  - CSV exports with IRS line codes
  - TXF format for TurboTax Desktop
  - PDF summary generation
  - Pre-export validation
  - Schedule C calculations

---

**Last Updated:** January 12, 2025  
**Version:** 1.0  
**Author:** GigLedger Team
