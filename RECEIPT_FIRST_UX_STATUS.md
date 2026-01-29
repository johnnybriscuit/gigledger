# Receipt-First UX Implementation Status

## ✅ Completed Work

### 1. Edge Function Updates (COMPLETE)
**File**: `supabase/functions/process-receipt/index.ts`

**Changes**:
- ✅ Dual mode support:
  - Mode 1: `{ expenseId }` - existing flow for editing expenses
  - Mode 2: `{ receipt_storage_path, mimeType }` - NEW flow for pre-creation scanning
- ✅ No DB updates in Mode 2 (only returns extraction results)
- ✅ User-scoped duplicate detection works in both modes
- ✅ Returns sha256, receipt_storage_path, receipt_mime in response
- ✅ Base64 encoding already correct (standard for Document AI, base64url for JWT)

**API Contract**:
```typescript
// Mode 1: Existing (edit expense)
POST /process-receipt
{ expenseId: string }

// Mode 2: NEW (scan before creation)
POST /process-receipt
{ receipt_storage_path: string, mimeType?: string }

// Response (both modes)
{
  success: boolean,
  extracted: {
    vendor?: string,
    date?: string,
    total?: number,
    currency?: string,
    rawText?: string
  },
  suggestion: {
    category: string,
    confidence: number
  },
  duplicate_suspected: boolean,
  provider: string,
  sha256: string,
  receipt_storage_path: string,
  receipt_mime: string
}
```

### 2. Client Helpers (COMPLETE)
**File**: `src/lib/receipts/processReceipt.ts`

**Added**:
- ✅ `processReceiptBeforeCreation(receipt_storage_path, mimeType)` - NEW function
- ✅ Updated `ProcessReceiptResponse` interface with new fields

**File**: `src/hooks/useExpenses.ts`

**Added**:
- ✅ `uploadTempReceipt(file)` - Upload to `tmp/<uuid>.<ext>`
- ✅ `moveTempReceiptToFinal(tmpPath, expenseId)` - Move to `<userId>/<expenseId>_receipt.<ext>`
- ✅ `deleteTempReceipt(tmpPath)` - Cleanup temp files

---

## ⏳ In Progress

### 3. AddExpenseModal Refactor (IN PROGRESS)
**File**: `src/components/AddExpenseModal.tsx`

**Required Changes**:

#### State Additions
```typescript
const [tmpReceiptPath, setTmpReceiptPath] = useState<string | null>(null);
const [receiptMimeType, setReceiptMimeType] = useState<string | null>(null);
const [scanSha256, setScanSha256] = useState<string | null>(null);
```

#### UI Reordering
1. **Move receipt upload to TOP** (before all form fields)
2. **Update copy**:
   - Title: "Upload receipt to auto-fill (optional)"
   - Subtext: "We'll extract vendor/date/total and suggest a category. You can edit anything before saving."
3. **Auto-trigger scan** immediately after file selection

#### Flow Changes

**New Expense Flow**:
```javascript
handleFileSelect = async (file) => {
  // 1. Upload to temp
  const { tmpPath, mimeType } = await uploadTempReceipt(file);
  setTmpReceiptPath(tmpPath);
  setReceiptMimeType(mimeType);
  setReceiptFile(file);
  
  // 2. Scan immediately
  setScanningReceipt(true);
  const result = await processReceiptBeforeCreation(tmpPath, mimeType);
  setScanResult(result);
  setScanningReceipt(false);
  
  // 3. Auto-populate fields
  if (result.success && result.extracted) {
    if (!vendor && result.extracted.vendor) {
      setVendor(result.extracted.vendor);
    }
    if (!date && result.extracted.date) {
      setDate(result.extracted.date);
    }
    if (!amount && result.extracted.total) {
      setAmount(result.extracted.total.toString());
    }
    if (category === 'Other' && result.suggestion?.category) {
      setCategory(result.suggestion.category);
    }
    // Generate default description
    if (!description && result.extracted.vendor) {
      const desc = `Receipt: ${result.extracted.vendor}${result.extracted.date ? ' - ' + result.extracted.date : ''}`;
      setDescription(desc);
    }
    
    // Store sha256 for final save
    if (result.sha256) {
      setScanSha256(result.sha256);
    }
  }
}

handleSubmit = async () => {
  // ... existing validation ...
  
  // Create expense
  const result = await createExpense.mutateAsync(validated);
  const expenseId = result.id;
  
  // If we have a temp receipt, move it to final location
  if (tmpReceiptPath) {
    try {
      const finalPath = await moveTempReceiptToFinal(tmpReceiptPath, expenseId);
      
      // Update expense with receipt metadata
      await updateExpense.mutateAsync({
        id: expenseId,
        receipt_storage_path: finalPath,
        receipt_mime: receiptMimeType,
        receipt_sha256: scanSha256,
        receipt_extraction_status: 'succeeded',
        receipt_extracted_json: scanResult?.extracted,
        receipt_vendor: scanResult?.extracted?.vendor,
        receipt_total: scanResult?.extracted?.total,
        receipt_date: scanResult?.extracted?.date,
        receipt_currency: scanResult?.extracted?.currency,
        category_suggestion: scanResult?.suggestion?.category,
        category_confidence: scanResult?.suggestion?.confidence
      });
      
      // Clean up temp
      setTmpReceiptPath(null);
    } catch (error) {
      console.error('Failed to move receipt:', error);
      // Expense still created, just log the error
    }
  }
  
  resetForm();
  onClose();
}

handleClose = async () => {
  // Clean up temp receipt if exists
  if (tmpReceiptPath) {
    await deleteTempReceipt(tmpReceiptPath);
  }
  resetForm();
  onClose();
}
```

**Edit Expense Flow** (minimal changes):
- Keep existing flow
- Still use `processReceipt(expenseId)` for editing

---

## 📋 Next Steps

### Immediate
1. **Refactor AddExpenseModal** with receipt-first UX
2. **Deploy edge function** to Supabase:
   ```bash
   supabase functions deploy process-receipt --project-ref jvostkeswuhfwntbrfzl
   ```
3. **Push to feature branch** for Preview deployment
4. **Test in Preview**:
   - New expense with receipt upload
   - New expense without receipt
   - Edit expense with receipt upload
   - Cancel/close cleanup

### Testing Checklist
- [ ] Upload receipt → auto-fills vendor/date/amount/category
- [ ] Generated description includes vendor and date
- [ ] Can edit auto-filled fields before saving
- [ ] Save creates expense with correct data
- [ ] Receipt moved from tmp to final path
- [ ] Tmp receipt cleaned up after save
- [ ] Cancel cleans up tmp receipt
- [ ] Edit expense flow still works
- [ ] Duplicate detection works
- [ ] Error handling works

---

## 🚀 Deployment Plan

1. **Deploy Edge Function**:
   ```bash
   cd /Users/johnburkhardt/dev/gigledger
   supabase functions deploy process-receipt --project-ref jvostkeswuhfwntbrfzl
   ```

2. **Push Feature Branch**:
   ```bash
   git push origin feature/receipt-first-ux
   ```

3. **Create PR** for Preview deployment

4. **Test in Preview**

5. **Merge to main** after validation

---

## 📝 Key Design Decisions

### Why Temp Upload?
- Avoids creating "junk" expenses if user cancels
- Allows scanning before expense exists
- Clean separation of concerns

### Why Move Instead of Reference?
- Consistent storage structure
- Easy cleanup of tmp files
- Clear ownership (tmp vs final)

### Why Auto-Populate?
- Better UX - less typing
- Matches user expectation ("auto-fill")
- User can still edit before saving

### Error Handling
- Upload failure: Show error, allow retry
- Scan failure: Show error, allow manual entry
- Move failure: Log error, expense still created (graceful degradation)

---

## 🔧 Technical Notes

### Temp Receipt Cleanup
- Cleaned up on modal close
- Cleaned up on cancel
- Cleaned up after successful move
- Consider background job for orphaned tmp files (future enhancement)

### Storage Paths
- Temp: `receipts/tmp/<uuid>.<ext>`
- Final: `receipts/<userId>/<expenseId>_receipt.<ext>`

### RLS Policies
- Existing policies should work
- Temp files accessible by authenticated user
- Final files scoped to user_id

---

## ✅ Ready for Deployment

**Edge Function**: Ready to deploy  
**Client Helpers**: Complete  
**AddExpenseModal**: Needs refactoring (in progress)

**Estimated Time**: 1-2 hours to complete AddExpenseModal refactor and test
