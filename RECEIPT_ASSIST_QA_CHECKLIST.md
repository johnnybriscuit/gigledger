# Receipt Assist QA Checklist

## Pre-Deployment Checklist

### Database Migration
- [ ] Migration file created: `20260129_add_receipt_assist_to_expenses.sql`
- [ ] Run migration: `supabase db push`
- [ ] Verify columns added to expenses table
- [ ] Check indexes created (receipt_sha256, extraction_status)

### Edge Function Deployment
- [ ] Function deployed: `supabase functions deploy process-receipt`
- [ ] Environment variables set in Supabase dashboard:
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `RECEIPT_OCR_PROVIDER` (set to 'disabled' initially)
- [ ] Function accessible via `supabase.functions.invoke('process-receipt')`

### Build Verification
- [ ] TypeScript compiles without errors (ignore Deno edge function warnings)
- [ ] `npx expo export --platform web` succeeds
- [ ] No runtime errors in browser console

## Functional Testing

### Scenario 1: No OCR Provider Configured (Default)
**Setup**: `RECEIPT_OCR_PROVIDER=disabled` or not set

- [ ] Create expense without receipt
  - [ ] Form works normally
  - [ ] Expense saves successfully
  - [ ] No scanning UI appears

- [ ] Create expense with receipt upload
  - [ ] Receipt file uploads successfully
  - [ ] Shows "Receipt scanning not enabled" message
  - [ ] Message is user-friendly, not technical error
  - [ ] Can still save expense manually
  - [ ] Expense created with receipt_url populated

- [ ] Edit existing expense
  - [ ] Can view/edit expense normally
  - [ ] Receipt link works if present

### Scenario 2: OCR Provider Configured (Requires API Key)
**Setup**: Set `RECEIPT_OCR_PROVIDER=mindee` and `MINDEE_API_KEY=your_key`

- [ ] Upload receipt and create expense
  - [ ] Shows "🔍 Scanning receipt..." immediately after upload
  - [ ] Scanning completes within 5-10 seconds
  - [ ] Success panel appears with "✅ Receipt Scanned"
  - [ ] Extracted data displayed (vendor, date, total)
  - [ ] Category suggestion shown with confidence badge
  - [ ] Confidence label accurate (High/Medium/Low)

- [ ] Apply suggestions with empty fields
  - [ ] Click "Apply Suggestions" button
  - [ ] Vendor field populated if empty
  - [ ] Date field populated if empty
  - [ ] Amount field populated if empty
  - [ ] Category changed to suggestion if was "Other"
  - [ ] Description and notes remain untouched

- [ ] Apply suggestions with filled fields
  - [ ] Pre-fill vendor field before applying
  - [ ] Click "Apply Suggestions"
  - [ ] Vendor field NOT overwritten
  - [ ] Only empty fields get populated
  - [ ] User data preserved

- [ ] Category suggestion accuracy
  - [ ] Upload Uber/Lyft receipt → Suggests "Travel"
  - [ ] Upload hotel receipt → Suggests "Lodging"
  - [ ] Upload restaurant receipt → Suggests "Meals & Entertainment"
  - [ ] Upload Guitar Center receipt → Suggests "Equipment/Gear"
  - [ ] Upload Adobe/Spotify receipt → Suggests "Software/Subscriptions"
  - [ ] Unknown vendor → Suggests "Other" with low confidence

### Scenario 3: Duplicate Detection
- [ ] Upload same receipt twice
  - [ ] First upload: Scans normally
  - [ ] Second upload: Shows "⚠️ This receipt may be a duplicate"
  - [ ] Warning displayed but doesn't block saving
  - [ ] User can proceed if intentional

### Scenario 4: Error Handling
- [ ] Upload invalid file (corrupted image)
  - [ ] Shows clear error message
  - [ ] Error is user-friendly
  - [ ] Can remove file and try again
  - [ ] Can save expense without receipt

- [ ] Network timeout during scan
  - [ ] Shows error after timeout
  - [ ] "Try Again" button appears (if editing)
  - [ ] Can continue manually

- [ ] OCR provider returns no data
  - [ ] Shows "Couldn't scan receipt" message
  - [ ] Provides reason if available
  - [ ] Can continue manually

### Scenario 5: Rescan Functionality
- [ ] Edit existing expense with receipt
  - [ ] "Rescan" button visible if previous scan exists
  - [ ] Click "Rescan"
  - [ ] Shows scanning UI again
  - [ ] New results replace old results
  - [ ] Can apply new suggestions

## Security Testing

### Authentication & Authorization
- [ ] Cannot call process-receipt without auth token
  - [ ] Returns 401/403 error
  - [ ] Error message doesn't leak sensitive info

- [ ] Cannot process another user's expense
  - [ ] Try to process expense with different user's ID
  - [ ] Returns 404 or 403
  - [ ] No data leaked

- [ ] RLS policies enforced
  - [ ] User A cannot see User B's extracted data
  - [ ] User A cannot update User B's expense with scan results

### Data Privacy
- [ ] Receipt files stored in user-scoped folder
  - [ ] Path format: `{user_id}/{expense_id}_receipt.{ext}`
  - [ ] Cannot access other users' receipts

- [ ] Service role key never exposed
  - [ ] Check browser network tab
  - [ ] Check client-side code
  - [ ] Key only used in edge function

## Performance Testing

- [ ] Receipt upload completes in <2 seconds
- [ ] OCR processing completes in <10 seconds
- [ ] UI remains responsive during scanning
- [ ] No memory leaks after multiple uploads
- [ ] Works with 5MB files (max size)

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

## Mobile Responsiveness (Web)

- [ ] Mobile viewport (< 768px)
  - [ ] Receipt upload button accessible
  - [ ] Scanning panel fits screen
  - [ ] Suggestion cards readable
  - [ ] Apply button accessible

## Edge Cases

- [ ] Upload receipt before filling any fields
  - [ ] Scan completes
  - [ ] Apply suggestions fills all fields

- [ ] Upload receipt after filling all fields
  - [ ] Scan completes
  - [ ] Apply suggestions doesn't override

- [ ] Remove receipt file before saving
  - [ ] Scan results cleared
  - [ ] No orphaned data

- [ ] Close modal during scanning
  - [ ] Scan continues in background
  - [ ] Results available if modal reopened

- [ ] Duplicate expense (Repeat button)
  - [ ] Receipt NOT copied
  - [ ] Scan state reset
  - [ ] Can upload new receipt

## Regression Testing

- [ ] Existing expenses without receipts still work
- [ ] Existing expenses with receipts still accessible
- [ ] Export functionality includes new fields (if applicable)
- [ ] Dashboard calculations unaffected
- [ ] Monthly limits still enforced
- [ ] Recurring expenses unaffected

## Acceptance Criteria ✓

- [x] Creating expense WITHOUT receipt works normally
- [x] Uploading receipt triggers scan with proper UI states
- [x] "Apply suggestions" populates empty fields only
- [x] "Rescan" functionality works for editing
- [x] Provider not configured: shows friendly message, doesn't break
- [x] Security: cannot process another user's expense
- [x] Build passes: `npx expo export --platform web`

## Post-Deployment Monitoring

- [ ] Check Supabase logs for edge function errors
- [ ] Monitor receipt_extraction_status distribution
- [ ] Track category_confidence averages
- [ ] Watch for duplicate_suspected frequency
- [ ] Monitor OCR API usage/costs (if enabled)

## Rollback Plan

If critical issues found:
1. Set `RECEIPT_OCR_PROVIDER=disabled` in Supabase dashboard
2. Users can still create expenses manually
3. Fix issues and redeploy
4. Re-enable OCR provider

Migration is additive (only adds columns), safe to keep in place.
