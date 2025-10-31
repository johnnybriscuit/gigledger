# 📥 CSV Import Guide - Bulk Upload Your Data

## Overview

The CSV Import feature lets you bulk upload your existing gig data from spreadsheets (like Google Sheets, Excel, etc.) into GigLedger!

## 🚀 How to Use

### 1. **Prepare Your Payers First**
Before importing gigs, make sure all payers are already created in the app. The import will match payer names from your CSV to existing payers.

### 2. **Download the Template**
1. Go to the **Gigs** tab
2. Click **"📥 Import"** button
3. Click **"📥 Download Template CSV"**
4. This gives you a properly formatted CSV file

### 3. **Fill in Your Data**
Open the template in Excel, Google Sheets, or any spreadsheet app and fill in your data.

### 4. **Export as CSV**
- **Google Sheets**: File → Download → Comma Separated Values (.csv)
- **Excel**: File → Save As → CSV (Comma delimited)

### 5. **Import**
1. Click **"📥 Import"** button
2. Click **"📤 Upload CSV File"**
3. Select your CSV file
4. Review the results!

## 📋 CSV Format for Gigs

### Required Columns (in order):
```
Date, Payer, Title, Location, City, State, Gross, Tips, Fees, Per Diem, Other Income, Payment Method, Paid, Taxes Withheld, Notes
```

### Example Row:
```csv
2024-01-15,Blue Note Jazz Club,Friday Night Show,123 Main St,Cincinnati,OH,500,50,25,0,0,Direct Deposit,Yes,No,Great crowd
```

### Column Details:

| Column | Format | Required | Example |
|--------|--------|----------|---------|
| **Date** | YYYY-MM-DD | ✅ Yes | 2024-01-15 |
| **Payer** | Exact name | ✅ Yes | Blue Note Jazz Club |
| **Title** | Text | ✅ Yes | Friday Night Show |
| **Location** | Text | No | 123 Main St |
| **City** | Text | No | Cincinnati |
| **State** | 2-letter code | No | OH |
| **Gross** | Number | ✅ Yes | 500 |
| **Tips** | Number | No | 50 |
| **Fees** | Number | No | 25 |
| **Per Diem** | Number | No | 0 |
| **Other Income** | Number | No | 0 |
| **Payment Method** | Text | No | Direct Deposit |
| **Paid** | Yes/No | No | Yes |
| **Taxes Withheld** | Yes/No | No | No |
| **Notes** | Text | No | Great crowd |

## ⚠️ Important Notes

### Payer Names Must Match
- Payer names in your CSV must **exactly match** existing payers in the app
- Case-insensitive matching is supported
- If a payer doesn't exist, that row will be skipped with an error

### Date Format
- Use **YYYY-MM-DD** format (e.g., 2024-01-15)
- Other formats may not import correctly

### Numbers
- **Don't include $ symbols** - just the number
- Commas in numbers are OK (e.g., 1,500)
- Decimals are OK (e.g., 45.50)

### Yes/No Fields
- For "Paid" and "Taxes Withheld" columns
- Use: **Yes**, **No**, **True**, **False**
- Case-insensitive

### Empty Fields
- Leave cells empty for optional fields
- Don't use "N/A" or "-" - just leave blank

## 🎯 Converting from Google Sheets

If you have data in Google Sheets:

### Step 1: Organize Your Data
Make sure your sheet has these columns in this order:
1. Date
2. Payer
3. Title
4. Location
5. City
6. State
7. Gross
8. Tips
9. Fees
10. Per Diem
11. Other Income
12. Payment Method
13. Paid
14. Taxes Withheld
15. Notes

### Step 2: Clean Up
- Remove any header rows except the first one
- Make sure payer names match what's in GigLedger
- Format dates as YYYY-MM-DD
- Remove $ symbols from amounts

### Step 3: Export
1. File → Download → Comma Separated Values (.csv)
2. Save the file

### Step 4: Import
1. Open GigLedger
2. Go to Gigs tab
3. Click "📥 Import"
4. Upload your CSV file

## 🔍 Troubleshooting

### "Payer not found" errors
- **Problem**: The payer name in your CSV doesn't match any payer in the app
- **Solution**: Either create the payer first, or fix the name in your CSV to match exactly

### "Invalid date" errors
- **Problem**: Date is not in YYYY-MM-DD format
- **Solution**: Reformat dates in your spreadsheet before exporting

### Some rows imported, some didn't
- **Check the error messages** - they'll tell you exactly which rows failed and why
- Fix those rows in your CSV and re-import (duplicates won't be created)

### Numbers not importing correctly
- Remove $ symbols and any text
- Make sure decimal points use `.` not `,`

## 💡 Pro Tips

1. **Start Small**: Test with 2-3 rows first to make sure your format is correct
2. **Create Payers First**: Import will be much smoother if all payers exist
3. **Use the Template**: Download and use the provided template to avoid format issues
4. **Keep a Backup**: Save your original spreadsheet before importing
5. **Review After Import**: Check a few entries to make sure everything imported correctly

## 📊 What Gets Calculated Automatically

The app will automatically calculate:
- **Net Amount** = Gross + Tips + Per Diem + Other Income - Fees
- This matches your Google Sheet's calculation!

## 🎉 Success!

After a successful import, you'll see:
- ✅ Number of gigs imported
- ⚠️ Any errors or skipped rows
- All imported gigs will appear in your Gigs list

The import is **additive** - it won't delete or modify existing gigs, only add new ones.

## 🚀 Future Enhancements

Coming soon:
- Import for Expenses
- Import for Mileage
- Export to CSV
- Update existing gigs via CSV

---

**Need Help?** Make sure your CSV matches the template format exactly, and all payers exist in the app before importing!
