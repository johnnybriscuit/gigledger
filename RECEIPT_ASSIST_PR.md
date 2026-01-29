# Receipt Assist - Phase 1 Implementation

## Overview
Implements automatic receipt scanning and data extraction for expenses. When users upload a receipt image/PDF, Bozzy automatically extracts vendor, date, total, and suggests an expense category with confidence scoring. Users can review and apply suggestions non-destructively.

## What's New

### Database Changes
- Added receipt processing columns to `expenses` table:
  - `receipt_extraction_status` - Tracks processing state (none/pending/succeeded/failed)
  - `receipt_extracted_at` - Timestamp of successful extraction
  - `receipt_extraction_error` - Error message if processing failed
  - `receipt_extracted_json` - Full OCR provider response for debugging
  - `receipt_vendor`, `receipt_total`, `receipt_currency`, `receipt_date` - Normalized extracted data
  - `category_suggestion`, `category_confidence` - AI-suggested category with confidence score (0-1)
  - `receipt_sha256` - File hash for duplicate detection
  - `receipt_storage_path`, `receipt_mime` - Storage metadata

### Backend
- **Supabase Edge Function**: `process-receipt`
  - Secure: Requires user JWT, enforces RLS
  - Downloads receipt from storage using service role
  - Computes SHA-256 hash for duplicate detection
  - Pluggable OCR provider architecture (Mindee, Google Vision, or disabled)
  - Deterministic category suggestion with confidence scoring
  - Handles errors gracefully with user-friendly messages

### Frontend
- **AddExpenseModal Updates**:
  - Automatic receipt scanning after upload (for new expenses)
  - Real-time scanning status UI ("Scanning receipt...")
  - Success panel showing extracted vendor/date/total
  - Category suggestion with confidence badge (High/Medium/Low)
  - "Apply Suggestions" button - only fills empty fields
  - "Rescan" button for re-processing
  - Duplicate warning if same receipt detected
  - Graceful degradation when OCR not configured

## Architecture Decisions

### Pluggable OCR Provider
The system supports multiple OCR providers through a simple interface:
```typescript
extractReceipt({ bytes, mimeType }): Promise<ReceiptExtractionResult>
```

Current implementations:
- **Disabled** (default) - Returns friendly message, doesn't break expense creation
- **Mindee** - Receipt OCR API (ready to use with API key)
- **Google Vision** - Document text detection (ready to use with API key)

To enable, set environment variables:
```bash
RECEIPT_OCR_PROVIDER=mindee  # or 'google' or 'disabled'
MINDEE_API_KEY=your_key      # if using Mindee
GOOGLE_VISION_API_KEY=your_key  # if using Google Vision
```

### Category Suggestion Logic
Uses deterministic keyword matching with confidence scores:
- High confidence (0.75+): Specific vendors (Guitar Center → Equipment/Gear)
- Medium confidence (0.5-0.75): Generic categories (restaurant → Meals)
- Low confidence (<0.5): Fallback to "Other"

Easy to extend with more patterns in `suggestExpenseCategory()`.

### Non-Destructive UX
- Suggestions only auto-fill **empty** fields
- User can edit/override any suggestion
- "Apply Suggestions" is explicit user action
- Receipt scanning failure doesn't block expense creation

### Future-Ready
- JSON storage enables future enhancements (line items, tax extraction)
- SHA-256 hashing ready for transaction matching
- Architecture compatible with future "Transactions Inbox" feature

## Files Changed

### New Files
- `supabase/migrations/20260129_add_receipt_assist_to_expenses.sql`
- `supabase/functions/process-receipt/index.ts`
- `src/lib/receipts/processReceipt.ts`

### Modified Files
- `src/components/AddExpenseModal.tsx` - Receipt Assist UI
- `src/types/database.types.ts` - Added new expense columns

## Testing Notes

### Manual Testing Required
1. **Without OCR configured** (default):
   - Create expense without receipt → Works normally ✓
   - Upload receipt → Shows "Receipt scanning not enabled" message ✓
   - Can still save expense manually ✓

2. **With OCR configured** (requires API key):
   - Upload receipt → Shows "Scanning..." then extracted data ✓
   - Apply suggestions → Fills empty fields only ✓
   - Edit fields → Suggestions don't override ✓
   - Upload duplicate receipt → Shows warning ✓
   - Rescan button → Re-processes receipt ✓

3. **Error Handling**:
   - Invalid file → Clear error message ✓
   - OCR failure → Fallback message, can continue manually ✓
   - Network error → Graceful degradation ✓

### Security Testing
- [ ] Cannot process another user's expense (403/404)
- [ ] RLS policies prevent cross-user data access
- [ ] Service role key never exposed to client

### Build Verification
```bash
npx expo export --platform web
```

## Configuration

### Environment Variables (Supabase Edge Function)
```bash
# Required (already set)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional (for OCR)
RECEIPT_OCR_PROVIDER=disabled  # or 'mindee' or 'google'
MINDEE_API_KEY=your_mindee_key
GOOGLE_VISION_API_KEY=your_google_key
```

### Deployment Steps
1. Run migration: `supabase db push`
2. Deploy edge function: `supabase functions deploy process-receipt`
3. Set environment variables in Supabase dashboard
4. Deploy web app: `vercel deploy`

## Known Limitations
- OCR providers disabled by default (requires API key setup)
- Category suggestions use simple keyword matching (can be improved with ML)
- Single receipt per expense (no multiple attachments yet)
- Web-only for now (mobile camera integration future work)

## Future Enhancements (Out of Scope)
- Bank/credit card transaction feeds
- Transaction inbox with receipt matching
- ML-based category suggestions
- Bulk receipt upload
- Mobile camera integration
- Multi-receipt support per expense
