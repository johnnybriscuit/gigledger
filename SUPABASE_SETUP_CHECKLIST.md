# Supabase Setup Checklist

## ✅ Credentials (DONE)
- [x] Supabase URL: `https://jvostkeswhfwntbrfzl.supabase.co`
- [x] Anon Key: Added to `.env.local`

## Required Setup Steps

### 1. Database Schema (CRITICAL)
**Where**: Supabase Dashboard → SQL Editor

**What to do**:
1. Go to: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/sql
2. Click "New Query"
3. Copy the entire contents of `supabase/schema.sql` from this project
4. Paste into the SQL editor
5. Click "Run" (or press Cmd/Ctrl + Enter)

**Expected result**: 
- ✅ Tables created: `payers`, `gigs`, `expenses`, `mileage`
- ✅ RLS policies enabled
- ✅ Indexes created
- ✅ Triggers set up

**How to verify**:
- Go to: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/editor
- You should see 4 tables listed in the left sidebar

---

### 2. Storage Bucket (REQUIRED for receipts)
**Where**: Supabase Dashboard → Storage

**What to do**:
1. Go to: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/storage/buckets
2. Click "Create a new bucket"
3. Settings:
   - **Name**: `receipts` (exactly this, lowercase)
   - **Public**: ❌ OFF (keep it private)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/*,application/pdf`
4. Click "Create bucket"

**How to verify**:
- You should see "receipts" bucket in the storage list
- Click on it - it should be empty initially

---

### 3. Authentication Settings (REQUIRED for magic links)
**Where**: Supabase Dashboard → Authentication → URL Configuration

**What to do**:
1. Go to: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/auth/url-configuration
2. Find "Redirect URLs" section
3. Add these URLs (one per line):
   ```
   gigledger://auth-callback
   http://localhost:8090
   http://localhost:8090/auth-callback
   exp://localhost:19000/--/auth-callback
   exp://*.exp.direct/--/auth-callback
   ```
4. Click "Save"

**How to verify**:
- All 5 URLs should appear in the "Redirect URLs" list

---

### 4. Email Templates (OPTIONAL but recommended)
**Where**: Supabase Dashboard → Authentication → Email Templates

**What to do**:
1. Go to: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/auth/templates
2. Click "Magic Link" template
3. Customize the email if desired (or leave default)
4. Make sure it's enabled

---

## Quick Verification Commands

### Check if credentials work:
```bash
# Test connection
curl https://jvostkeswhfwntbrfzl.supabase.co/rest/v1/ \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b3N0a2Vzd3VoZndudGJyZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjg4NDksImV4cCI6MjA3NjIwNDg0OX0.tzh6vU2bfxMk-rqUTtX9JaYwzp_DAaVaU_5G-VPEchg"
```

Expected: Should return a JSON response (not an error)

---

## Testing the App

Once the above steps are complete:

### 1. Restart the app
```bash
# Stop current server (Ctrl+C if running)
npm run start:web
```

### 2. Test authentication
1. Open http://localhost:8090
2. Enter your email address
3. Click "Send Magic Link"
4. Check your email inbox
5. Click the magic link
6. Should redirect back to app and show Dashboard

### 3. Check for errors
- Open browser console (F12)
- Look for any red errors
- Common issues:
  - ❌ "Invalid API key" → Check anon key is correct
  - ❌ "relation does not exist" → Run the SQL schema
  - ❌ "Redirect URL not whitelisted" → Add URLs to auth settings

---

## Troubleshooting

### Can't find SQL Editor?
- Direct link: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/sql/new

### Can't find Storage?
- Direct link: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/storage/buckets

### Can't find Auth Settings?
- Direct link: https://supabase.com/dashboard/project/jvostkeswhfwntbrfzl/auth/url-configuration

### SQL errors when running schema?
- Make sure you're copying the ENTIRE `supabase/schema.sql` file
- Run it all at once (don't run line by line)
- If you get "already exists" errors, that's OK - it means it's already set up

---

## What to Tell Me

After completing the checklist, let me know:
1. ✅ "SQL schema ran successfully" (or any errors you got)
2. ✅ "Storage bucket created"
3. ✅ "Redirect URLs added"
4. ✅ "App loads and shows auth screen"

Then we can test the authentication flow!
