# Receipt Assist - Deployment Guide

## Overview
This guide covers deploying the Receipt Assist feature with Google Document AI integration.

---

## Prerequisites

1. **Supabase CLI** installed and authenticated
   ```bash
   brew install supabase/tap/supabase
   supabase login
   ```

2. **Google Cloud Project** with Document AI API enabled
   - Create processor: Receipt Parser or Invoice Parser
   - Create service account with Document AI permissions
   - Download service account JSON key

3. **Supabase Project** linked
   ```bash
   supabase link --project-ref <your-project-ref>
   ```

---

## Step 1: Database Migration

The migration has already been applied if you ran it in the previous iteration. Verify:

```bash
# Check if migration exists
supabase db diff

# If needed, push migration
supabase db push
```

**Migration file**: `supabase/migrations/20260129_add_receipt_assist_to_expenses.sql`

**Verify in Supabase Dashboard**:
- Go to Table Editor → expenses
- Confirm new columns exist:
  - `receipt_extraction_status`
  - `receipt_extracted_at`
  - `receipt_extraction_error`
  - `receipt_extracted_json`
  - `receipt_vendor`
  - `receipt_total`
  - `receipt_currency`
  - `receipt_date`
  - `category_suggestion`
  - `category_confidence`
  - `receipt_sha256`
  - `receipt_storage_path`
  - `receipt_mime`

---

## Step 2: Deploy Edge Function

### Link Project (If Not Already Linked)

```bash
supabase link --project-ref jvostkeswuhfwntbrfzl
```

### Deploy via CLI (Recommended)

```bash
# Deploy the process-receipt function
supabase functions deploy process-receipt --project-ref jvostkeswuhfwntbrfzl

# Verify deployment
supabase functions list
```

**Expected output**:
```
┌─────────────────┬────────┬─────────────────────┐
│ NAME            │ STATUS │ UPDATED AT          │
├─────────────────┼────────┼─────────────────────┤
│ process-receipt │ ACTIVE │ 2026-01-29 16:40:00 │
└─────────────────┴────────┴─────────────────────┘
```

**Important**: The function will ONLY appear in the Supabase Dashboard Edge Functions list AFTER it's been deployed. If you don't see it yet, that's expected - deploy it first.

### Manual Deploy via Dashboard (Alternative)

If CLI deployment fails:

1. **Go to Supabase Dashboard** → Edge Functions
2. **Click "Create a new function"**
3. **Name**: `process-receipt`
4. **Copy contents** from `supabase/functions/process-receipt/index.ts`
5. **Paste into editor** and click "Deploy"

---

## Step 3: Configure Secrets

### Required Secrets

```bash
# Supabase credentials (should already exist)
supabase secrets set SUPABASE_URL="https://your-project.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Receipt OCR Provider
supabase secrets set RECEIPT_OCR_PROVIDER="documentai"

# Google Document AI credentials
supabase secrets set GOOGLE_CLOUD_PROJECT_ID="your-gcp-project-id"
supabase secrets set GOOGLE_DOCUMENTAI_LOCATION="us"
supabase secrets set GOOGLE_DOCUMENTAI_PROCESSOR_ID="your-processor-id"
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}'
```

### Get Google Credentials

1. **Google Cloud Console** → IAM & Admin → Service Accounts
2. **Create Service Account** with role: "Document AI API User"
3. **Create Key** → JSON format
4. **Copy entire JSON content** for `GOOGLE_SERVICE_ACCOUNT_JSON`

### Get Processor ID

1. **Google Cloud Console** → Document AI → Processors
2. **Create Processor** → Receipt Parser
3. **Copy Processor ID** from processor details page
   - Format: `projects/PROJECT_ID/locations/LOCATION/processors/PROCESSOR_ID`
   - Use only the last part: `PROCESSOR_ID`

### Verify Secrets via Dashboard

1. **Supabase Dashboard** → Edge Functions → process-receipt
2. **Click "Secrets"** tab
3. **Verify all secrets** are set (values hidden for security)

### Test with Disabled Provider (Safe Start)

To deploy without Document AI initially:

```bash
supabase secrets set RECEIPT_OCR_PROVIDER="disabled"
```

This allows the feature to deploy safely. Users will see "Receipt scanning not enabled" message.

---

## Step 4: Test Edge Function

### Test via Supabase Dashboard

1. **Go to Edge Functions** → process-receipt
2. **Click "Invoke"** tab
3. **Test payload**:
   ```json
   {
     "expenseId": "existing-expense-id-with-receipt"
   }
   ```
4. **Add Authorization header**: `Bearer <your-user-jwt>`
5. **Click "Invoke"**

**Expected response** (if disabled):
```json
{
  "success": false,
  "error": "Receipt scanning not enabled",
  "message": "Receipt scanning is not configured. You can still add expenses manually.",
  "duplicate_suspected": false
}
```

**Expected response** (if Document AI configured):
```json
{
  "success": true,
  "extracted": {
    "vendor": "Starbucks",
    "date": "2026-01-29",
    "total": 12.50,
    "currency": "USD"
  },
  "suggestion": {
    "category": "Meals & Entertainment",
    "confidence": 0.65
  },
  "duplicate_suspected": false,
  "provider": "documentai"
}
```

### Test via Client App

1. **Deploy web app** (see Step 5)
2. **Create expense** with receipt upload
3. **Verify scanning UI** appears
4. **Check extracted data** displays correctly
5. **Click "Apply Suggestions"** and verify DB update

---

## Step 5: Deploy Web Application

### Build and Deploy

```bash
# Build for web
npx expo export --platform web

# Deploy to Vercel (if using Vercel)
vercel deploy --prod

# Or deploy to your hosting provider
```

### Verify Build

```bash
# Check for build errors
npx expo export --platform web 2>&1 | grep -i error

# Expected: No errors (TypeScript warnings in edge function are OK)
```

---

## Step 6: Verification Checklist

### Database
- [ ] Migration applied successfully
- [ ] New columns visible in expenses table
- [ ] Indexes created (receipt_sha256, receipt_extraction_status)

### Edge Function
- [ ] Function deployed and shows ACTIVE status
- [ ] Function callable via dashboard test
- [ ] All secrets configured
- [ ] Returns expected response structure

### Web App
- [ ] Build completes without errors
- [ ] App loads in browser
- [ ] No console errors on page load
- [ ] Receipt upload button visible in Add Expense modal

### End-to-End Test
- [ ] Create expense without receipt → Works normally
- [ ] Upload receipt → Shows scanning UI
- [ ] Scan completes → Shows extracted data
- [ ] Apply suggestions → Updates expense in DB
- [ ] Done button → Closes modal
- [ ] View expense → Data persisted correctly

---

## Troubleshooting

### Function Not Found Error

**Symptom**: `FunctionsRelayError: Edge Function not found`

**Solution**:
```bash
# Redeploy function
supabase functions deploy process-receipt

# Verify deployment
supabase functions list
```

### Authentication Error

**Symptom**: `Unauthorized` or `Missing authorization header`

**Solution**:
- Ensure user is logged in
- Check JWT token is valid
- Verify `SUPABASE_SERVICE_ROLE_KEY` secret is set correctly

### Document AI API Error

**Symptom**: `Document AI API error: 403 Forbidden`

**Solution**:
1. Verify Document AI API is enabled in GCP
2. Check service account has "Document AI API User" role
3. Verify `GOOGLE_SERVICE_ACCOUNT_JSON` is valid JSON
4. Confirm processor ID is correct

### Receipt Not Downloading

**Symptom**: `Failed to download receipt file`

**Solution**:
- Check `receipt_storage_path` is set correctly
- Verify RLS policies on `receipts` bucket
- Ensure service role key has storage access

### Stuck in Pending Status

**Symptom**: `receipt_extraction_status` remains 'pending'

**Solution**:
- Check edge function logs in Supabase Dashboard
- Manually update status to 'failed' if needed:
  ```sql
  UPDATE expenses 
  SET receipt_extraction_status = 'failed',
      receipt_extraction_error = 'Manual reset'
  WHERE receipt_extraction_status = 'pending';
  ```

### Modal Closes Immediately

**Symptom**: Can't see scan results, modal closes after upload

**Solution**:
- This was fixed in the latest commit
- Ensure you're running the updated code
- Modal now stays open until user clicks "Done"

---

## Rollback Plan

If critical issues occur:

### Disable OCR Provider
```bash
supabase secrets set RECEIPT_OCR_PROVIDER="disabled"
```

Users can still create expenses manually. Feature degrades gracefully.

### Rollback Edge Function
```bash
# List function versions
supabase functions list --version

# Deploy previous version
supabase functions deploy process-receipt --version <previous-version>
```

### Rollback Migration (Nuclear Option)

**⚠️ Only if absolutely necessary - will lose extraction data**

```sql
-- Remove new columns
ALTER TABLE expenses
  DROP COLUMN IF EXISTS receipt_extraction_status,
  DROP COLUMN IF EXISTS receipt_extracted_at,
  DROP COLUMN IF EXISTS receipt_extraction_error,
  DROP COLUMN IF EXISTS receipt_extracted_json,
  DROP COLUMN IF EXISTS receipt_vendor,
  DROP COLUMN IF EXISTS receipt_total,
  DROP COLUMN IF EXISTS receipt_currency,
  DROP COLUMN IF EXISTS receipt_date,
  DROP COLUMN IF EXISTS category_suggestion,
  DROP COLUMN IF EXISTS category_confidence,
  DROP COLUMN IF EXISTS receipt_sha256,
  DROP COLUMN IF EXISTS receipt_storage_path,
  DROP COLUMN IF EXISTS receipt_mime;
```

---

## Monitoring

### Check Function Logs

```bash
# View recent logs
supabase functions logs process-receipt

# Follow logs in real-time
supabase functions logs process-receipt --follow
```

### Monitor in Dashboard

1. **Supabase Dashboard** → Edge Functions → process-receipt
2. **Click "Logs"** tab
3. **Filter by error** to see failures

### Database Queries

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

-- Check recent failures
SELECT id, description, receipt_extraction_error, created_at
FROM expenses
WHERE receipt_extraction_status = 'failed'
ORDER BY created_at DESC
LIMIT 10;
```

---

## Cost Estimation

### Google Document AI Pricing (as of 2026)

- **Receipt Parser**: $1.50 per 1,000 pages
- **First 1,000 pages/month**: Free

**Example**:
- 100 receipts/month = $0 (within free tier)
- 5,000 receipts/month = $6.00
- 10,000 receipts/month = $13.50

### Supabase Edge Functions

- **Included**: 500K invocations/month (Pro plan)
- **Overage**: $2 per 1M invocations

**Example**:
- 5,000 receipts/month = 5,000 invocations = Free

---

## Next Steps

1. ✅ Deploy database migration
2. ✅ Deploy edge function
3. ✅ Configure secrets (start with disabled)
4. ✅ Test with disabled provider
5. ⏳ Enable Document AI (add GCP credentials)
6. ⏳ Test with real receipts
7. ⏳ Monitor for 24 hours
8. ⏳ Announce feature to users

---

## Support

**Issues?** Check:
- Supabase Dashboard → Edge Functions → Logs
- Browser console for client errors
- Database queries for stuck records

**Need help?** Review:
- `RECEIPT_ASSIST_QA_CHECKLIST.md` for testing scenarios
- `RECEIPT_ASSIST_SUMMARY.md` for architecture overview
