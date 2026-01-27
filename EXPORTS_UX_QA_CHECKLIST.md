# Exports Page UX Update - QA Checklist

## Overview
This checklist verifies the Exports page restructure optimized for self-filers while supporting CPA sharing.

## Test Environment
- [ ] Desktop browser (Chrome/Safari/Firefox)
- [ ] Mobile browser (iOS Safari/Android Chrome)
- [ ] Test with sample data for tax year 2024 and 2025

---

## A. Layout & Responsiveness

### Desktop (≥768px)
- [ ] Export cards display in 2-column grid
- [ ] Cards are evenly sized and aligned
- [ ] No excessive scrolling (page fits reasonably on screen)
- [ ] All sections are clearly separated with headings

### Mobile (<768px)
- [ ] Export cards display in 1-column stack
- [ ] Cards are full-width and touch-friendly
- [ ] Text is readable without zooming
- [ ] Buttons/cards have adequate tap targets (min 44px)

---

## B. Export Sections & Organization

### 1. Tax Software Section
- [ ] Section heading: "Tax Software"
- [ ] Subtitle: "Import or manually enter into tax software"
- [ ] **TurboTax Online Manual Entry Pack** appears FIRST
  - [ ] Has "Recommended" badge (green)
  - [ ] Subtitle: "Best for TurboTax Online self-filing. Includes Schedule C summary + detail CSVs + PDF + import guide."
  - [ ] Has "How to import" link
  - [ ] Downloads ZIP file with correct naming: `TurboTax_Online_Manual_Entry_Pack_2024.zip`
- [ ] **TurboTax Desktop (TXF)** appears second
  - [ ] Subtitle: "Import into TurboTax Desktop (NOT Online)."
  - [ ] Has "How to import" link
  - [ ] Downloads TXF file
- [ ] **H&R Block Desktop (TXF)** appears third
  - [ ] Subtitle: "Import into H&R Block Desktop."
  - [ ] Has "How to import" link
  - [ ] Downloads TXF file
- [ ] **TaxAct Tax Prep Pack (ZIP)** appears fourth
  - [ ] Subtitle: "For TaxAct manual entry and CPA sharing."
  - [ ] Has "How to import" link
  - [ ] Downloads ZIP file

### 2. CPA Sharing Section
- [ ] Section heading: "Share with a CPA"
- [ ] Subtitle: "Professional-ready formats for tax preparers"
- [ ] **CSV Bundle** card present
  - [ ] Subtitle: "CPA-ready CSV bundle." (NOT "IRS-compliant CSV files")
  - [ ] Downloads multiple CSV files
- [ ] **Excel (.xlsx)** card present
  - [ ] Subtitle: "One .xlsx file with separate sheets."
  - [ ] Downloads Excel file
- [ ] **PDF Summary** card present
  - [ ] Subtitle: "Tax-ready summary for your CPA."
  - [ ] Opens PDF in new window/tab

### 3. Backup Section
- [ ] Section heading: "Backup"
- [ ] Subtitle: "Archive your data"
- [ ] **JSON Backup** card present
  - [ ] Subtitle: "Complete data backup in JSON format."
  - [ ] Downloads JSON file

### 4. Legacy Section (Collapsed by Default)
- [ ] Section heading: "Legacy / Troubleshooting"
- [ ] Default state: **COLLAPSED** (hidden)
- [ ] Toggle arrow shows "▶" when collapsed, "▼" when expanded
- [ ] When expanded:
  - [ ] Shows description: "These are older export formats kept for compatibility. Most users should use the options above."
  - [ ] Shows **TXF (Legacy)** card
  - [ ] Subtitle mentions using newer option above

---

## C. "How to Import" Modal Functionality

### TurboTax Online
- [ ] Modal opens when clicking "How to import" on TurboTax Online card
- [ ] Title: "TurboTax Online Manual Entry"
- [ ] Warning box states: "TurboTax Online does NOT support TXF file import."
- [ ] Shows 6 numbered steps for manual entry
- [ ] Disclaimer at bottom: "Organized for tax prep. Not tax advice. Verify totals and consult a tax professional if needed."
- [ ] "Got It" button closes modal

### TurboTax Desktop
- [ ] Modal opens when clicking "How to import" on TurboTax Desktop card
- [ ] Title: "TurboTax Desktop TXF Import"
- [ ] Warning: "This file is for TurboTax Desktop ONLY. It will not work with TurboTax Online."
- [ ] Shows import steps (File > Import > From TXF Files)
- [ ] Disclaimer present

### H&R Block Desktop
- [ ] Modal opens when clicking "How to import" on H&R Block card
- [ ] Title: "H&R Block Desktop TXF Import"
- [ ] Warning: "This file is for H&R Block Desktop software only."
- [ ] Shows import steps
- [ ] Disclaimer present

### TaxAct
- [ ] Modal opens when clicking "How to import" on TaxAct card
- [ ] Title: "TaxAct Manual Entry"
- [ ] Warning: "TaxAct requires manual entry. Use the summary CSV as your guide."
- [ ] Shows manual entry steps
- [ ] Disclaimer present

---

## D. Copy & Risk Reduction

### Header
- [ ] Page title: "Export Center"
- [ ] Subtitle: "Download tax-ready exports for self-filing or CPA sharing" (NOT "for your CPA" only)

### Finish Line Section
- [ ] Message says: "You now have everything you need to share with a CPA or complete manual entry in tax software."
- [ ] Includes: "Please review and verify totals before filing."
- [ ] States: "These exports organize your data for tax preparation but are not tax advice."
- [ ] Does NOT say: "Once you've downloaded your exports, you're ready for tax filing."

### No Misleading Claims
- [ ] No mention of "TurboTax Online TXF import" anywhere
- [ ] No claim that TurboTax Online supports file import
- [ ] CSV section says "CPA-ready" not "IRS-compliant"

---

## E. Export Generation & Canonical Package

### All Tax Software Exports Use TaxExportPackage
- [ ] TurboTax Online Manual Entry Pack uses `taxPackage.data`
- [ ] TurboTax Desktop TXF uses `taxPackage.data` via `generateTXFv042`
- [ ] H&R Block Desktop TXF uses `taxPackage.data` via `generateTXFv042`
- [ ] TaxAct Pack uses `taxPackage.data` via `generateTaxActPackZip`

### Legacy Exports (for comparison)
- [ ] CSV Bundle still uses legacy `useAllExportData` (acceptable for now)
- [ ] Excel still uses legacy data (acceptable for now)
- [ ] PDF still uses legacy data (acceptable for now)
- [ ] JSON still uses legacy data (acceptable for now)

### TurboTax Online Pack Contents
- [ ] ZIP contains: `ScheduleC_Summary_2024.csv`
- [ ] ZIP contains: `Income_Detail_2024.csv`
- [ ] ZIP contains: `Expense_Detail_2024.csv`
- [ ] ZIP contains: `Mileage_2024.csv`
- [ ] ZIP contains: `PDF_Summary_2024.pdf`
- [ ] ZIP contains: `README_TurboTax_Online_2024.txt`
- [ ] README clearly states TurboTax Online does NOT support TXF import
- [ ] README includes manual entry instructions

---

## F. Error Handling & Edge Cases

### Loading States
- [ ] Tax software cards show loading spinner when `taxPackage.isLoading`
- [ ] Cards are disabled during loading
- [ ] No crashes if package not yet loaded

### Error States
- [ ] If `taxPackage.data` is null, cards are disabled
- [ ] Currency error (non-USD) shows appropriate alert
- [ ] Network errors show user-friendly messages

### Empty Data
- [ ] If no gigs/expenses/mileage, exports still generate (with zeros)
- [ ] No crashes with empty data sets

---

## G. Functional Testing

### Download Verification
- [ ] Each export actually downloads a file
- [ ] File names are correct and include tax year
- [ ] ZIP files can be extracted without errors
- [ ] CSV files open in Excel/Numbers
- [ ] PDF opens correctly
- [ ] TXF files are plain text and readable

### Data Consistency
- [ ] Schedule C totals match across all exports (TurboTax Online Pack, TaxAct Pack, PDF)
- [ ] Income totals are consistent
- [ ] Expense totals are consistent
- [ ] Mileage deductions are consistent
- [ ] Net profit matches across all formats

### Tax Year Filter
- [ ] Changing tax year updates all exports
- [ ] Data filtered correctly by year
- [ ] File names reflect selected year

---

## H. Accessibility

- [ ] All interactive elements are keyboard accessible
- [ ] Tab order is logical
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader can navigate sections

---

## I. Performance

- [ ] Page loads in <3 seconds with typical data
- [ ] No layout shift during loading
- [ ] Export generation completes in <5 seconds
- [ ] No memory leaks after multiple exports

---

## J. Cross-Browser Testing

### Desktop
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari (latest)
- [ ] Android Chrome (latest)

---

## Critical Issues (Must Fix Before Release)
- [ ] TurboTax Online pack is marked as "Recommended"
- [ ] No false claims about TurboTax Online TXF import
- [ ] Legacy TXF is hidden by default
- [ ] All "How to import" modals work correctly
- [ ] Responsive grid works on mobile
- [ ] All exports generate without errors

## Nice-to-Have (Can address later)
- [ ] Migrate CSV/Excel/PDF to use canonical TaxExportPackage
- [ ] Add export history/tracking
- [ ] Add "Download All" button
- [ ] Add email export option

---

## Sign-Off

**Tested by:** ___________________  
**Date:** ___________________  
**Environment:** ___________________  
**Result:** ☐ Pass ☐ Fail ☐ Pass with minor issues  

**Notes:**
