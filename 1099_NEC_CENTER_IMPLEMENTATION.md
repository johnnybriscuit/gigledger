# 1099-NEC Center Implementation Guide

## Overview

This document outlines the implementation of the 1099-NEC Center for subcontractor tax preparation in BozzyGigs. The feature helps users track year-to-date payments to subcontractors, manage W-9 collection, and prepare 1099-NEC summaries.

**Status:** Core infrastructure implemented. UI components and email delivery in progress.

---

## What's Been Implemented

### 1. Database Schema ✅

**Migration:** `supabase/migrations/20260218_add_1099_fields_to_subcontractors.sql`

**New Fields on `subcontractors` table:**
- `legal_name` - Legal name for tax forms (if different from display name)
- `address_line1`, `address_line2`, `city`, `state`, `postal_code`, `country` - Full address for 1099
- `w9_status` - Enum: 'missing' | 'received'
- `w9_document_url` - Supabase Storage path to uploaded W-9
- `edelivery_consent` - Boolean for electronic delivery consent
- `edelivery_email` - Email for 1099 delivery (defaults to main email)
- `tin_encrypted` - Placeholder for future encrypted TIN storage (unused)
- `last_1099_email_sent_at` - Timestamp of last 1099 email sent

**New View:** `subcontractor_1099_totals`
- Aggregates `gig_subcontractor_payments` by subcontractor and tax year
- Calculates `total_paid`, `gig_count`, `requires_1099` (>= $600)
- Includes all subcontractor info needed for 1099 preparation
- Efficient source of truth for 1099 calculations

**New Table:** `subcontractor_1099_deliveries`
- Tracks email deliveries of 1099 summaries
- Records: subcontractor_id, tax_year, amount, recipient_email, sent_at
- Optional audit trail for compliance

### 2. TypeScript Types ✅

**Updated:** `src/types/database.types.ts`
- Extended `subcontractors` Row/Insert/Update types with all new fields
- Maintains type safety for all 1099-related operations

### 3. React Query Hooks ✅

**Created:** `src/hooks/use1099Totals.ts`

**Exports:**
```typescript
// Fetch all subcontractor 1099 totals for a tax year
use1099Totals(taxYear: number)

// Fetch 1099 total for specific subcontractor
use1099TotalForSubcontractor(subcontractorId: string, taxYear: number)

// Helper functions
getMissingInfoWarnings(subcontractor) // Returns array of missing info
getEffective1099Email(subcontractor) // Returns effective email for delivery
canEmail1099(subcontractor) // Checks if email delivery is allowed
```

**Interface:**
```typescript
interface Subcontractor1099Total {
  user_id: string;
  subcontractor_id: string;
  name: string;
  legal_name: string | null;
  email: string | null;
  edelivery_email: string | null;
  address_line1: string | null;
  // ... all address fields
  tax_id_type: string | null;
  tax_id_last4: string | null;
  w9_status: string;
  w9_document_url: string | null;
  edelivery_consent: boolean;
  last_1099_email_sent_at: string | null;
  tax_year: number;
  gig_count: number;
  total_paid: number;
  requires_1099: boolean; // true if >= $600
}
```

### 4. PDF Generation ✅

**Created:** `src/lib/1099/generate1099PrepPdf.ts`

**Functions:**
```typescript
// Generate 1099 prep summary PDF (HTML-based)
generate1099PrepPdf(options: Generate1099PdfOptions): Promise<Blob>

// Download PDF (opens print dialog)
download1099PrepPdf(options: Generate1099PdfOptions): Promise<void>
```

**PDF Contents:**
- Header: "1099-NEC Preparation Summary" with tax year
- Disclaimer: "This is NOT an official IRS form"
- Payer Information (business name, address, EIN)
- Recipient Information (subcontractor name, address, TIN last 4)
- Box 1: Nonemployee Compensation (total paid)
- Payment Summary (gig count, threshold status)
- Instructions for recipient

---

## Remaining Implementation Tasks

### 5. CSV Export for CPA ⏳

**File:** `src/lib/1099/generate1099Csv.ts`

**Requirements:**
```typescript
function generate1099Csv(subcontractors: Subcontractor1099Total[]): string {
  // CSV columns:
  // - subcontractor_id
  // - name
  // - legal_name
  // - email
  // - address fields (line1, line2, city, state, postal_code)
  // - tax_id_last4
  // - total_paid
  // - gig_count
  // - w9_status
  // - edelivery_consent
  // - requires_1099
}
```

### 6. 1099 Center UI Component ⏳

**File:** `src/components/Subcontractor1099Center.tsx`

**UI Requirements:**
- Year selector (dropdown, default current year)
- Table/list of subcontractors with columns:
  - Name (display + legal if different)
  - Total Paid
  - Status pill: ">= $600" (green) or "Below threshold" (gray)
  - W-9 Status pill: "Received" (green) or "Missing" (yellow)
  - Missing Info warnings (icon + tooltip)
  - Actions dropdown:
    - Mark W-9 received/missing (toggle)
    - Upload W-9
    - Download 1099 Prep PDF
    - Email PDF (only if edelivery_consent=true)
- Bulk actions:
  - Download CSV (all subcontractors)
  - Download PDFs (all >= $600)
- Info note: "1099-NEC is commonly issued for $600+ paid to contractors in a calendar year. Filing with IRS not included in Bozzy yet."

**Component Structure:**
```tsx
<Subcontractor1099Center>
  <YearSelector value={year} onChange={setYear} />
  <InfoBanner />
  <BulkActions />
  <SubcontractorTable>
    {subcontractors.map(sub => (
      <SubcontractorRow
        key={sub.subcontractor_id}
        subcontractor={sub}
        onToggleW9Status={...}
        onUploadW9={...}
        onDownloadPdf={...}
        onEmailPdf={...}
      />
    ))}
  </SubcontractorTable>
</Subcontractor1099Center>
```

### 7. W-9 Upload Functionality ⏳

**File:** `src/hooks/useW9Upload.ts`

**Requirements:**
```typescript
function useW9Upload() {
  const uploadW9 = async (
    subcontractorId: string,
    file: File
  ): Promise<string> => {
    // 1. Upload to Supabase Storage: subcontractor-w9s/{userId}/{subcontractorId}/{filename}
    // 2. Update subcontractor.w9_document_url
    // 3. Update subcontractor.w9_status = 'received'
    // 4. Return storage URL
  };
  
  const deleteW9 = async (subcontractorId: string): Promise<void> => {
    // 1. Delete from Supabase Storage
    // 2. Update subcontractor.w9_document_url = null
    // 3. Update subcontractor.w9_status = 'missing'
  };
  
  return { uploadW9, deleteW9 };
}
```

### 8. Email Delivery Edge Function ⏳

**File:** `supabase/functions/send-1099-email/index.ts`

**Requirements:**
```typescript
// Edge function endpoint: POST /functions/v1/send-1099-email
// Body: { subcontractorId, taxYear }

async function send1099Email(req: Request): Promise<Response> {
  // 1. Verify user authentication
  // 2. Fetch subcontractor 1099 total
  // 3. Check edelivery_consent = true
  // 4. Check email exists
  // 5. Generate PDF
  // 6. Send email via Resend with PDF attachment
  // 7. Log delivery in subcontractor_1099_deliveries
  // 8. Update subcontractor.last_1099_email_sent_at
  // 9. Return success/error
}
```

**Email Template:**
```
Subject: Your 1099-NEC Prep Summary for {taxYear} from {BusinessName}

Dear {SubcontractorName},

Attached is your 1099-NEC preparation summary for tax year {taxYear}.

Total Nonemployee Compensation: ${amount}

This is a preparation summary for your records. Your payer will file the 
official Form 1099-NEC with the IRS.

Please keep this for your tax records and consult a tax professional if 
you have questions.

Best regards,
{BusinessName}

---
Generated by Bozzy - Self-Employed Income & Tax Tracking
https://bozzygigs.com
```

### 9. Integration with Subcontractors Screen ⏳

**File:** `src/screens/SubcontractorsScreen.tsx` (or wherever subcontractors are managed)

**Requirements:**
- Add "1099 Center" tab/section
- Render `<Subcontractor1099Center />` component
- Maintain existing subcontractor management functionality

---

## Database Queries

### Get 1099 Totals for Year
```sql
SELECT * FROM subcontractor_1099_totals
WHERE user_id = auth.uid()
  AND tax_year = 2024
ORDER BY total_paid DESC;
```

### Get Subcontractors Requiring 1099
```sql
SELECT * FROM subcontractor_1099_totals
WHERE user_id = auth.uid()
  AND tax_year = 2024
  AND requires_1099 = true
ORDER BY total_paid DESC;
```

### Get Missing W-9s
```sql
SELECT * FROM subcontractor_1099_totals
WHERE user_id = auth.uid()
  AND tax_year = 2024
  AND requires_1099 = true
  AND w9_status = 'missing'
ORDER BY total_paid DESC;
```

---

## Testing Guide

### Setup Test Data

1. **Create Test Subcontractors:**
```sql
-- Subcontractor 1: Above threshold, W-9 received
INSERT INTO subcontractors (user_id, name, normalized_name, legal_name, email, 
  address_line1, city, state, postal_code, tax_id_type, tax_id_last4, 
  w9_status, edelivery_consent, edelivery_email)
VALUES (
  auth.uid(),
  'John Drummer',
  'john drummer',
  'John Michael Drummer',
  'john@example.com',
  '123 Main St',
  'Nashville',
  'TN',
  '37201',
  'ssn',
  '1234',
  'received',
  true,
  'john@example.com'
);

-- Subcontractor 2: Above threshold, W-9 missing
INSERT INTO subcontractors (user_id, name, normalized_name, email, w9_status)
VALUES (
  auth.uid(),
  'Jane Bassist',
  'jane bassist',
  'jane@example.com',
  'missing'
);

-- Subcontractor 3: Below threshold
INSERT INTO subcontractors (user_id, name, normalized_name, email, w9_status)
VALUES (
  auth.uid(),
  'Bob Guitarist',
  'bob guitarist',
  'bob@example.com',
  'missing'
);
```

2. **Create Test Gigs and Payments:**
```sql
-- Create gigs for 2024
INSERT INTO gigs (user_id, payer_id, date, title, gross_amount, paid)
VALUES 
  (auth.uid(), (SELECT id FROM payers LIMIT 1), '2024-03-15', 'Spring Concert', 1000, true),
  (auth.uid(), (SELECT id FROM payers LIMIT 1), '2024-06-20', 'Summer Festival', 800, true),
  (auth.uid(), (SELECT id FROM payers LIMIT 1), '2024-09-10', 'Fall Show', 500, true);

-- Add payments to subcontractors
-- John Drummer: $700 (above threshold)
INSERT INTO gig_subcontractor_payments (user_id, gig_id, subcontractor_id, amount)
VALUES 
  (auth.uid(), (SELECT id FROM gigs WHERE title = 'Spring Concert'), 
   (SELECT id FROM subcontractors WHERE name = 'John Drummer'), 300),
  (auth.uid(), (SELECT id FROM gigs WHERE title = 'Summer Festival'), 
   (SELECT id FROM subcontractors WHERE name = 'John Drummer'), 400);

-- Jane Bassist: $650 (above threshold)
INSERT INTO gig_subcontractor_payments (user_id, gig_id, subcontractor_id, amount)
VALUES 
  (auth.uid(), (SELECT id FROM gigs WHERE title = 'Spring Concert'), 
   (SELECT id FROM subcontractors WHERE name = 'Jane Bassist'), 250),
  (auth.uid(), (SELECT id FROM gigs WHERE title = 'Summer Festival'), 
   (SELECT id FROM subcontractors WHERE name = 'Jane Bassist'), 200),
  (auth.uid(), (SELECT id FROM gigs WHERE title = 'Fall Show'), 
   (SELECT id FROM subcontractors WHERE name = 'Jane Bassist'), 200);

-- Bob Guitarist: $400 (below threshold)
INSERT INTO gig_subcontractor_payments (user_id, gig_id, subcontractor_id, amount)
VALUES 
  (auth.uid(), (SELECT id FROM gigs WHERE title = 'Spring Concert'), 
   (SELECT id FROM subcontractors WHERE name = 'Bob Guitarist'), 200),
  (auth.uid(), (SELECT id FROM gigs WHERE title = 'Summer Festival'), 
   (SELECT id FROM subcontractors WHERE name = 'Bob Guitarist'), 200);
```

### QA Checklist

#### Database & View
- [ ] Run migration successfully
- [ ] Verify `subcontractor_1099_totals` view returns correct data
- [ ] Verify totals match manual calculations
- [ ] Verify `requires_1099` flag is correct (>= $600)
- [ ] Verify RLS policies work (users only see their own data)

#### UI - 1099 Center
- [ ] Year selector shows current year by default
- [ ] Table displays all subcontractors with payments in selected year
- [ ] Total paid amounts are correct
- [ ] Status pills show correct colors and text
- [ ] W-9 status pills show correct status
- [ ] Missing info warnings appear for incomplete records
- [ ] Actions dropdown appears for each row

#### W-9 Management
- [ ] Can toggle W-9 status (missing ↔ received)
- [ ] Can upload W-9 document (PDF/image)
- [ ] Uploaded W-9 appears in storage
- [ ] w9_document_url is saved correctly
- [ ] Can download uploaded W-9
- [ ] Can delete W-9 (resets status to 'missing')

#### PDF Generation
- [ ] Can download 1099 prep PDF for individual subcontractor
- [ ] PDF contains correct payer information
- [ ] PDF contains correct subcontractor information
- [ ] PDF shows correct total paid amount
- [ ] PDF includes disclaimer text
- [ ] PDF opens print dialog

#### CSV Export
- [ ] Can download CSV of all subcontractors
- [ ] CSV contains all required columns
- [ ] CSV data matches UI display
- [ ] CSV opens correctly in Excel/Google Sheets

#### Email Delivery
- [ ] Email button is disabled if edelivery_consent = false
- [ ] Email button is disabled if no email address
- [ ] Email sends successfully when conditions met
- [ ] Email contains PDF attachment
- [ ] Email content is professional and clear
- [ ] Delivery is logged in subcontractor_1099_deliveries
- [ ] last_1099_email_sent_at is updated

#### Edge Cases
- [ ] Handles subcontractors with no payments (doesn't appear in list)
- [ ] Handles subcontractors with payments in different years
- [ ] Handles missing address fields gracefully
- [ ] Handles missing TIN gracefully
- [ ] Handles very large payment amounts (formatting)
- [ ] Handles many subcontractors (pagination/performance)

---

## Security & Privacy Considerations

### TIN Storage
- **Current:** Only last 4 digits stored in plain text
- **Future:** `tin_encrypted` field available for full TIN storage with encryption
- **Recommendation:** Do NOT store full TIN unless absolutely necessary and properly encrypted

### W-9 Documents
- **Storage:** Supabase Storage with RLS policies
- **Path:** `subcontractor-w9s/{userId}/{subcontractorId}/{filename}`
- **Access:** Only the user who uploaded can access
- **Retention:** User's responsibility to delete when no longer needed

### Email Delivery
- **Consent Required:** edelivery_consent must be true
- **Audit Trail:** All deliveries logged in subcontractor_1099_deliveries
- **Content:** No sensitive TIN information in email body
- **Attachment:** PDF contains only last 4 of TIN

---

## Known Limitations

1. **No IRS E-Filing:** This feature prepares 1099s but does NOT file with IRS
2. **No Copy A Generation:** Does not generate official IRS Copy A
3. **No State Filing:** Does not handle state-specific 1099 requirements
4. **Manual W-9 Collection:** User must manually collect and upload W-9s
5. **No TIN Validation:** Does not validate TIN format or check with IRS
6. **No Correction Forms:** Does not support 1099-C (correction) forms

---

## Future Enhancements

1. **IRS E-Filing Integration:** Partner with tax filing service for direct IRS submission
2. **Automated W-9 Requests:** Send W-9 request emails to subcontractors
3. **TIN Validation:** Integrate with IRS TIN Matching service
4. **State Filing:** Support state-specific 1099 requirements
5. **Bulk Operations:** Bulk email all 1099s, bulk download PDFs
6. **1099-MISC Support:** Extend to other 1099 types (MISC, K, etc.)
7. **Multi-Year View:** Compare subcontractor payments across years
8. **Threshold Alerts:** Notify when subcontractor approaches $600 threshold

---

## Support & Documentation

### For Users
- Add help article: "How to Prepare 1099-NECs for Subcontractors"
- Add help article: "Understanding the $600 1099 Threshold"
- Add help article: "How to Collect W-9s from Subcontractors"

### For Developers
- API documentation for 1099 endpoints
- Database schema documentation
- Testing guide (this document)

---

## Deployment Checklist

Before deploying to production:
- [ ] Run database migration
- [ ] Regenerate TypeScript types: `npm run supabase:types`
- [ ] Run tests: `npm test`
- [ ] Test in staging environment
- [ ] Verify RLS policies work correctly
- [ ] Test email delivery with real Resend account
- [ ] Update user documentation
- [ ] Announce feature to users

---

## Files Created/Modified

### Created:
- `supabase/migrations/20260218_add_1099_fields_to_subcontractors.sql`
- `src/hooks/use1099Totals.ts`
- `src/lib/1099/generate1099PrepPdf.ts`
- `1099_NEC_CENTER_IMPLEMENTATION.md` (this file)

### Modified:
- `src/types/database.types.ts` (added 1099 fields to subcontractors)

### To Be Created:
- `src/lib/1099/generate1099Csv.ts`
- `src/components/Subcontractor1099Center.tsx`
- `src/hooks/useW9Upload.ts`
- `supabase/functions/send-1099-email/index.ts`

---

## Questions & Decisions

### Q: Should we store full TIN?
**A:** No, not by default. Only store last 4 digits. The `tin_encrypted` field is available for future use if needed, but requires proper encryption implementation.

### Q: How to handle corrections?
**A:** Not in scope for initial release. Users can manually adjust and re-send.

### Q: What about 1099-MISC?
**A:** Focus on 1099-NEC for now (most common for subcontractors). Can extend later.

### Q: Should we validate addresses?
**A:** Basic validation (required fields) yes. USPS validation not in scope.

### Q: How to handle multiple payers?
**A:** This is for tracking what the USER paid to subcontractors. The user is the payer.

---

## Contact

For questions about this implementation:
- Review this document
- Check existing subcontractor/payout code
- Test with golden dataset above
- Consult IRS 1099-NEC instructions: https://www.irs.gov/forms-pubs/about-form-1099-nec
