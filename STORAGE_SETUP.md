# Supabase Storage Setup for Receipts

## Create Storage Bucket

You need to create a storage bucket for receipt uploads.

**Go to**: https://supabase.com/dashboard/project/jvostkeswuhfwntbrfzl/storage/buckets

### Steps:

1. Click **"New bucket"**
2. **Name**: `receipts` (exactly this)
3. **Public**: Toggle **OFF** (keep private)
4. Click **"Create bucket"**

## Set Up Storage Policies

After creating the bucket, you need to add RLS policies so users can only access their own receipts.

**Go to**: https://supabase.com/dashboard/project/jvostkeswuhfwntbrfzl/storage/policies

### Add These Policies for the `receipts` bucket:

#### 1. Allow users to upload their own receipts
```sql
CREATE POLICY "Users can upload their own receipts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 2. Allow users to view their own receipts
```sql
CREATE POLICY "Users can view their own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### 3. Allow users to delete their own receipts
```sql
CREATE POLICY "Users can delete their own receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## File Structure

Receipts will be stored with this path structure:
```
receipts/
  {user_id}/
    {expense_id}_receipt.{ext}
```

For example:
```
receipts/
  abc123-def456-ghi789/
    expense-001_receipt.jpg
    expense-002_receipt.pdf
```

## Supported File Types

- **Images**: JPG, JPEG, PNG, WEBP, HEIC
- **Documents**: PDF

## File Size Limit

- Maximum: 5MB per file (configurable in Supabase)

## Testing

After setup, you can test by:
1. Going to Expenses tab
2. Adding an expense
3. Uploading a receipt image or PDF
4. Viewing the receipt thumbnail
5. Clicking to view full receipt

## Notes

- Receipts are stored privately (not publicly accessible)
- Signed URLs are generated for viewing (expire after 1 hour)
- Files are organized by user ID for security
- Old receipts are kept even if expense is deleted (can add cleanup later)
