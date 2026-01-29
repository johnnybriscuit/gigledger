# Receipt Assist - Production QA Checklist

## Pre-Deployment Verification

### ✅ Code Changes Complete
- [x] Document AI provider with service account JWT auth
- [x] Standard base64 encoding for Document AI (not base64url)
- [x] Base64url encoding for JWT segments only
- [x] Fixed `parseAmount()` to handle both US (1,200.50) and European (1.200,50) formats
- [x] Receipt path handling: prefers `receipt_storage_path`, validates it's not an HTTP URL
- [x] Defense-in-depth: all DB updates include `.eq('user_id', user.id)`
- [x] Modal no longer auto-closes after receipt upload
- [x] Apply Suggestions persists to database immediately
- [x] Date tracking prevents overwriting user-modified dates

### ✅ Edge Function Deployed
```bash
# Already deployed to project jvostkeswuhfwntbrfzl
supabase functions deploy process-receipt --project-ref jvostkeswuhfwntbrfzl
```

**Status**: ✅ Deployed successfully

---

## Secrets Configuration

### Start with Disabled Provider (Safe)

```bash
supabase secrets set RECEIPT_OCR_PROVIDER="disabled" --project-ref jvostkeswuhfwntbrfzl
```

**Test**: Upload receipt → Should show "Receipt scanning not enabled" message

### Enable Document AI (When Ready)

```bash
# Set all Document AI secrets
supabase secrets set RECEIPT_OCR_PROVIDER="documentai" --project-ref jvostkeswuhfwntbrfzl
supabase secrets set GOOGLE_CLOUD_PROJECT_ID="your-project-id" --project-ref jvostkeswuhfwntbrfzl
supabase secrets set GOOGLE_DOCUMENTAI_LOCATION="us" --project-ref jvostkeswuhfwntbrfzl
supabase secrets set GOOGLE_DOCUMENTAI_PROCESSOR_ID="processor-id" --project-ref jvostkeswuhfwntbrfzl
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' --project-ref jvostkeswuhfwntbrfzl
```

---

## Build Verification

### Web Build Test

```bash
npx expo export --platform web
```

**Expected**: Build completes without errors (TypeScript warnings in edge function are OK - they resolve at Deno runtime)

---

## Functional Testing

### Test 1: Disabled Provider (Default)
**Setup**: `RECEIPT_OCR_PROVIDER=disabled`

- [ ] Create expense without receipt
  - [ ] Works normally
  - [ ] No scanning UI appears
  
- [ ] Create expense with receipt (image)
  - [ ] Receipt uploads successfully
  - [ ] Modal stays open
  - [ ] Shows "Receipt scanning not enabled" message
  - [ ] Message is friendly, not technical
  - [ ] Can click "Done" to close modal
  - [ ] Expense saved with receipt_url populated

### Test 2: Document AI Enabled (Images)
**Setup**: `RECEIPT_OCR_PROVIDER=documentai` + GCP credentials

- [ ] Upload JPG receipt
  - [ ] Modal stays open after upload
  - [ ] Shows "🔍 Scanning receipt..." immediately
  - [ ] Scanning completes within 5-15 seconds
  - [ ] Success panel appears: "✅ Receipt Scanned"
  - [ ] Extracted data displayed (vendor, date, total)
  - [ ] Category suggestion shown with confidence badge
  - [ ] "Done" button visible (not "Add")

- [ ] Upload PNG receipt
  - [ ] Same flow as JPG
  - [ ] Extraction works correctly

- [ ] Apply Suggestions (empty fields)
  - [ ] Click "Apply Suggestions"
  - [ ] Vendor field populated
  - [ ] Date field populated (if not manually changed)
  - [ ] Amount field populated
  - [ ] Category changed to suggestion (if was "Other")
  - [ ] Changes visible in UI immediately
  - [ ] Click "Done" → Modal closes
  - [ ] Refresh page → Changes persisted in DB

- [ ] Apply Suggestions (filled fields)
  - [ ] Pre-fill vendor before scanning
  - [ ] Upload receipt and scan
  - [ ] Click "Apply Suggestions"
  - [ ] Vendor NOT overwritten
  - [ ] Only empty fields populated
  - [ ] User data preserved

- [ ] Date handling
  - [ ] Default date (today) → Can be replaced by extracted date
  - [ ] Manually change date → NOT replaced by extracted date
  - [ ] Date picker interaction marks date as "touched"

### Test 3: Document AI Enabled (PDFs)
**Setup**: `RECEIPT_OCR_PROVIDER=documentai` + GCP credentials

- [ ] Upload PDF receipt
  - [ ] PDF uploads successfully (5MB limit)
  - [ ] Scanning works for PDF
  - [ ] Extracted data appears correctly
  - [ ] Apply Suggestions works same as images

### Test 4: Amount Parsing (International Formats)
**Test receipts with different number formats**:

- [ ] US format: $1,200.50 → Parses as 1200.50
- [ ] European format: €1.200,50 → Parses as 1200.50
- [ ] Simple: $50 → Parses as 50
- [ ] No separators: 1500 → Parses as 1500

### Test 5: Duplicate Detection

- [ ] Upload same receipt twice
  - [ ] First upload: Scans normally
  - [ ] Second upload: Shows "⚠️ This receipt may be a duplicate"
  - [ ] Warning doesn't block saving
  - [ ] User can proceed if intentional

### Test 6: Error Handling

- [ ] Upload corrupted image
  - [ ] Shows clear error message
  - [ ] Error is user-friendly
  - [ ] Can remove file and try again
  - [ ] Can save expense without receipt

- [ ] Network timeout during scan
  - [ ] Shows error after timeout
  - [ ] "Try Again" button appears (if editing)
  - [ ] Can continue manually

### Test 7: Security

- [ ] User A cannot process User B's expense
  - [ ] Attempt to call function with another user's expense ID
  - [ ] Returns 404 or 403
  - [ ] No data leaked

- [ ] RLS policies enforced
  - [ ] User A cannot see User B's extracted data
  - [ ] User A cannot update User B's expense

### Test 8: Rescan Functionality

- [ ] Edit existing expense with receipt
  - [ ] "Rescan" button visible if previous scan exists
  - [ ] Click "Rescan"
  - [ ] Shows scanning UI again
  - [ ] New results replace old results
  - [ ] Can apply new suggestions

---

## Performance Testing

- [ ] Receipt upload completes in <2 seconds
- [ ] Document AI processing completes in <15 seconds
- [ ] UI remains responsive during scanning
- [ ] No memory leaks after multiple uploads
- [ ] Works with 5MB files (max size)

---

## Cross-Browser Testing (Web)

- [ ] Chrome/Edge (latest)
  - [ ] File upload works
  - [ ] Scanning UI displays correctly
  - [ ] Suggestions apply correctly

- [ ] Firefox (latest)
  - [ ] File upload works
  - [ ] Scanning UI displays correctly
  - [ ] Suggestions apply correctly

- [ ] Safari (latest)
  - [ ] File upload works
  - [ ] Scanning UI displays correctly
  - [ ] Suggestions apply correctly

---

## Mobile Responsiveness (Web)

- [ ] Mobile viewport (< 768px)
  - [ ] Receipt upload button accessible
  - [ ] Scanning panel fits screen
  - [ ] Suggestion cards readable
  - [ ] Apply/Done buttons accessible

---

## Database Verification

After testing, run these queries:

```sql
-- Check extraction status distribution
SELECT receipt_extraction_status, COUNT(*) 
FROM expenses 
WHERE receipt_extraction_status IS NOT NULL
GROUP BY receipt_extraction_status;

-- Check average confidence scores
SELECT AVG(category_confidence) as avg_confidence,
       category_suggestion,
       COUNT(*) as count
FROM expenses
WHERE category_confidence IS NOT NULL
GROUP BY category_suggestion
ORDER BY count DESC;

-- Find duplicate receipts
SELECT receipt_sha256, COUNT(*) as count
FROM expenses
WHERE receipt_sha256 IS NOT NULL
GROUP BY receipt_sha256
HAVING COUNT(*) > 1;

-- Check for stuck pending status (should be 0)
SELECT COUNT(*) 
FROM expenses 
WHERE receipt_extraction_status = 'pending';
```

---

## Rollback Plan

If critical issues found:

### Quick Disable
```bash
supabase secrets set RECEIPT_OCR_PROVIDER="disabled" --project-ref jvostkeswuhfwntbrfzl
```

Users can still create expenses manually. Feature degrades gracefully.

### Full Rollback
```bash
# Revert to previous commit
git revert HEAD
git push origin feature/receipt-assist

# Redeploy function
supabase functions deploy process-receipt --project-ref jvostkeswuhfwntbrfzl
```

---

## Sign-Off Checklist

Before merging to main:

- [ ] All functional tests pass
- [ ] Build passes: `npx expo export --platform web`
- [ ] Edge function deployed and callable
- [ ] Secrets configured (start with disabled)
- [ ] No stuck 'pending' expenses in DB
- [ ] No console errors in browser
- [ ] Documentation complete
- [ ] Team reviewed and approved

---

## Post-Deployment Monitoring

**First 24 Hours**:
- Monitor edge function logs for errors
- Check `receipt_extraction_status` distribution
- Watch for duplicate_suspected frequency
- Track category_confidence averages
- Monitor Document AI API usage/costs

**Dashboard**: https://supabase.com/dashboard/project/jvostkeswuhfwntbrfzl/functions/process-receipt

---

## Notes

**TypeScript Warnings (Expected)**:
- `Cannot find name 'Deno'` - Resolves at Deno runtime ✅
- Module import errors - Deno handles these ✅
- `Uint8Array` type mismatches - Deno crypto API differs ✅

These warnings are safe to ignore - they don't affect deployment or runtime.
