# M3: Expenses CRUD - Ready to Test!

## ✅ What's Been Built

### 1. Expenses Management
- **ExpensesScreen** - List all expenses with totals
- **AddExpenseModal** - Create/edit expenses with file upload
- **useExpenses hook** - TanStack Query for CRUD operations
- **Receipt uploads** - Supabase Storage integration

### 2. Features
- ✅ Add/Edit/Delete expenses
- ✅ 10 expense categories (Travel, Meals, Lodging, Supplies, Marketing, Education, Software, Fees, Equipment, Other)
- ✅ Receipt upload (images & PDFs, up to 5MB)
- ✅ Vendor tracking
- ✅ Notes field
- ✅ Total expenses calculation
- ✅ Date sorting (newest first)
- ✅ Category badges
- ✅ Receipt indicator (📎)

### 3. New Tab
- ✅ "Expenses" tab added to dashboard
- ✅ Shows total count and amount

## 🔧 Setup Required

Before you can upload receipts, you need to create the Supabase Storage bucket:

### Step 1: Create Storage Bucket

**Go to**: https://supabase.com/dashboard/project/jvostkeswuhfwntbrfzl/storage/buckets

1. Click **"New bucket"**
2. **Name**: `receipts`
3. **Public**: Toggle **OFF**
4. Click **"Create bucket"**

### Step 2: Add Storage Policies

**Go to**: https://supabase.com/dashboard/project/jvostkeswuhfwntbrfzl/storage/policies

Click on the `receipts` bucket, then add these 3 policies:

#### Policy 1: Upload
```sql
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 2: View
```sql
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### Policy 3: Delete
```sql
CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## 🧪 Testing

After setting up storage:

1. **Go to Expenses tab**
2. **Click "+ Add Expense"**
3. **Fill in**:
   - Date: Today
   - Category: Travel
   - Description: "Gas for gig"
   - Amount: 45.50
   - Vendor: "Shell"
4. **Click "Upload Receipt"** and select an image
5. **Click "Add Expense"**
6. **Verify**:
   - Expense appears in list
   - Total updates
   - Receipt indicator (📎) shows

## 📁 Files Created

### Hooks
- `src/hooks/useExpenses.ts` - CRUD + file upload functions

### Screens
- `src/screens/ExpensesScreen.tsx` - Expenses list view

### Components
- `src/components/AddExpenseModal.tsx` - Add/edit form with file upload

### Validation
- `src/lib/validations.ts` - Added expenseSchema

### Updated
- `src/screens/DashboardScreen.tsx` - Added Expenses tab

## 📊 Dashboard Integration

The dashboard now shows:
- Total expenses amount
- Expenses tab for full CRUD

In M5, we'll use this data for:
- Tax deduction calculations
- Net income after expenses
- Business cash flow

## 🎯 What's Next

**M4: Mileage Tracking** (~1 hour)
- Add mileage entries
- Calculate deductible amount ($0.67/mile)
- Track trips with start/end locations
- CSV export for tax records

Then **M5: Tax Dashboard** with all the metrics!

## 💡 Notes

- Receipts are stored privately in Supabase Storage
- Files are organized by user ID for security
- Signed URLs generated for viewing (1 hour expiry)
- Supported formats: JPG, PNG, PDF, WEBP, HEIC
- 5MB file size limit

Ready to test! Let me know if you encounter any issues.
