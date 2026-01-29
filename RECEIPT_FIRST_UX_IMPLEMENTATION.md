# Receipt-First UX Implementation Plan

## Overview
Implementing receipt-first flow where users upload and scan receipts BEFORE creating the expense, allowing auto-fill of form fields.

## Architecture Changes

### Edge Function (✅ COMPLETE)
- **Dual Mode Support**:
  - Mode 1: `{ expenseId }` - existing flow for editing expenses
  - Mode 2: `{ receipt_storage_path, mimeType }` - new flow for pre-creation scanning
- **No DB Updates in Mode 2**: Only returns extraction results, no expense table updates
- **User-Scoped Duplicate Detection**: Works in both modes using JWT user_id

### Client Changes (IN PROGRESS)

#### 1. Temp Receipt Upload Helper
**File**: `src/hooks/useExpenses.ts`
- Add `uploadTempReceipt(file: File)` function
- Upload to `receipts/tmp/<uuid>.<ext>`
- Return: `{ tmpPath, mimeType }`

#### 2. Receipt Cleanup Helper  
**File**: `src/hooks/useExpenses.ts`
- Add `deleteTempReceipt(tmpPath: string)` function
- Clean up tmp receipts on cancel/close

#### 3. Receipt Move Helper
**File**: `src/hooks/useExpenses.ts`
- Add `moveTempReceiptToFinal(tmpPath, expenseId, userId)` function
- Move from `tmp/<uuid>` to `<userId>/<expenseId>_receipt.<ext>`
- Return final path

#### 4. AddExpenseModal Refactor
**File**: `src/components/AddExpenseModal.tsx`

**State Changes**:
```typescript
// Add new state
const [tmpReceiptPath, setTmpReceiptPath] = useState<string | null>(null);
const [receiptMimeType, setReceiptMimeType] = useState<string | null>(null);
const [scanSha256, setScanSha256] = useState<string | null>(null);
```

**UI Reordering**:
1. **Top Section**: Receipt Upload (NEW POSITION)
   - Title: "Upload receipt to auto-fill (optional)"
   - Subtext: "We'll extract vendor/date/total and suggest a category"
   - File picker button
2. **Scanning Panel**: Shows immediately after upload
3. **Extraction Results**: Display extracted data
4. **Form Fields**: Auto-populated from scan results
5. **Bottom**: Save/Cancel buttons

**Flow Changes**:

**New Expense Flow**:
```
1. User clicks "Upload Receipt"
2. File selected → uploadTempReceipt()
3. Immediately call processReceiptBeforeCreation(tmpPath, mimeType)
4. Show "Scanning..." UI
5. On success:
   - Auto-fill: vendor, date, amount, category
   - Generate description: "Receipt: <Vendor> - <Date>"
   - Store sha256 for final save
6. User reviews/edits fields
7. User clicks "Save"
   - Run limit checks
   - Create expense with user-edited fields
   - moveTempReceiptToFinal(tmpPath, expenseId, userId)
   - Update expense with receipt metadata (sha256, path, mime, extraction data)
   - deleteTempReceipt(tmpPath)
8. On Cancel:
   - deleteTempReceipt(tmpPath)
   - Close modal
```

**Edit Expense Flow** (unchanged):
```
1. Modal opens with existing expense data
2. User can upload receipt
3. Immediately scan with expenseId mode
4. Apply suggestions
5. Save updates
```

## Implementation Steps

### Step 1: Add Temp Receipt Helpers ✅
- [x] Update edge function for dual mode
- [x] Add processReceiptBeforeCreation helper
- [ ] Add uploadTempReceipt helper
- [ ] Add deleteTempReceipt helper  
- [ ] Add moveTempReceiptToFinal helper

### Step 2: Refactor AddExpenseModal
- [ ] Move receipt upload to top
- [ ] Update UI copy and layout
- [ ] Implement temp upload on file select
- [ ] Auto-trigger scan after upload
- [ ] Auto-populate form fields from results
- [ ] Generate default description
- [ ] Update handleSubmit for new flow
- [ ] Add cleanup on cancel/close

### Step 3: Testing
- [ ] Test new expense with receipt upload
- [ ] Test new expense without receipt
- [ ] Test edit expense with receipt upload
- [ ] Test cancel/close cleanup
- [ ] Test duplicate detection
- [ ] Test error handling

### Step 4: Deployment
- [ ] Push to feature branch
- [ ] Verify Preview deployment
- [ ] Test in Preview
- [ ] Merge to main

## Key Considerations

### Temp Receipt Cleanup
- Clean up on modal close
- Clean up on cancel
- Clean up on successful save (after move)
- Consider background cleanup job for orphaned tmp files

### Error Handling
- Upload failure: Show error, allow retry
- Scan failure: Show error, allow manual entry
- Move failure: Log error, expense still created

### UX Polish
- Clear loading states
- Friendly error messages
- Smooth transitions
- Mobile-responsive

## Files to Modify

1. ✅ `supabase/functions/process-receipt/index.ts` - Dual mode support
2. ✅ `src/lib/receipts/processReceipt.ts` - Add processReceiptBeforeCreation
3. ⏳ `src/hooks/useExpenses.ts` - Add temp receipt helpers
4. ⏳ `src/components/AddExpenseModal.tsx` - Refactor for receipt-first UX

## Testing Checklist

### New Expense Flow
- [ ] Upload receipt → auto-fills vendor/date/amount/category
- [ ] Generated description includes vendor and date
- [ ] Can edit auto-filled fields before saving
- [ ] Save creates expense with correct data
- [ ] Receipt moved from tmp to final path
- [ ] Tmp receipt cleaned up after save

### Edit Expense Flow
- [ ] Existing flow still works
- [ ] Can upload receipt to existing expense
- [ ] Scan and apply suggestions work

### Error Cases
- [ ] OCR disabled: Shows friendly message, allows manual entry
- [ ] Upload failure: Shows error, allows retry
- [ ] Scan failure: Shows error, allows manual entry
- [ ] Cancel: Cleans up tmp receipt

### Edge Cases
- [ ] Duplicate detection works in both modes
- [ ] Large files (near 5MB) work
- [ ] PDFs and images both work
- [ ] International amounts parse correctly
