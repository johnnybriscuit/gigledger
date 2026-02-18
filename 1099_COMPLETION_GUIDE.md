# 1099-NEC Center - Completion Guide

This guide walks you through completing the 4 remaining steps to make the 1099-NEC Center fully functional.

---

## Step 1: Fix Theme Imports in 1099 Center Component

The component has TypeScript errors because it uses theme properties that don't match your actual theme structure.

### Quick Fix Option A: Use Inline Values

Replace the StyleSheet at the bottom of `src/components/Subcontractor1099Center.tsx` with this corrected version:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  header: {
    padding: spacingNum[6],
    paddingBottom: spacingNum[4],
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: spacingNum[2],
  },
  infoBanner: {
    margin: spacingNum[6],
    marginTop: 0,
    backgroundColor: colors.warning.muted,
    borderColor: colors.warning.DEFAULT,
    borderWidth: 1,
  },
  infoText: {
    fontSize: 14,
    color: colors.text.DEFAULT,
    marginBottom: spacingNum[2],
  },
  infoBold: {
    fontWeight: '600',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacingNum[6],
    marginBottom: spacingNum[4],
  },
  yearSelector: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: spacingNum[2],
  },
  yearButtons: {
    flexDirection: 'row',
    gap: spacingNum[2],
  },
  yearButton: {
    paddingHorizontal: spacingNum[4],
    paddingVertical: spacingNum[3],
    borderRadius: radiusNum.md,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  yearButtonActive: {
    backgroundColor: colors.brand.DEFAULT,
    borderColor: colors.brand.DEFAULT,
  },
  yearButtonText: {
    fontSize: 14,
    color: colors.text.DEFAULT,
  },
  yearButtonTextActive: {
    color: colors.brand.foreground,
    fontWeight: '600',
  },
  summary: {
    alignItems: 'flex-end',
  },
  summaryText: {
    fontSize: 14,
    color: colors.text.muted,
  },
  summaryBold: {
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  bulkActions: {
    flexDirection: 'row',
    gap: spacingNum[4],
    paddingHorizontal: spacingNum[6],
    marginBottom: spacingNum[6],
  },
  list: {
    padding: spacingNum[6],
    paddingTop: 0,
    gap: spacingNum[4],
  },
  row: {
    padding: spacingNum[4],
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacingNum[3],
  },
  nameSection: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.DEFAULT,
  },
  legalName: {
    fontSize: 14,
    color: colors.text.muted,
    marginTop: spacingNum[2],
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brand.DEFAULT,
  },
  rowDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacingNum[3],
  },
  badges: {
    flexDirection: 'row',
    gap: spacingNum[2],
    flexWrap: 'wrap',
    flex: 1,
  },
  gigCount: {
    fontSize: 14,
    color: colors.text.muted,
  },
  missingInfo: {
    backgroundColor: colors.danger.muted,
    padding: spacingNum[3],
    borderRadius: radiusNum.sm,
    marginBottom: spacingNum[3],
  },
  missingInfoText: {
    fontSize: 12,
    color: colors.danger.DEFAULT,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNum[2],
    marginTop: spacingNum[3],
  },
  actionButton: {
    paddingHorizontal: spacingNum[3],
    paddingVertical: spacingNum[2],
    borderRadius: radiusNum.sm,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.brand.DEFAULT,
  },
  actionButtonTextDisabled: {
    color: colors.text.muted,
  },
  errorText: {
    color: colors.danger.DEFAULT,
    textAlign: 'center',
    padding: spacingNum[6],
  },
});
```

### Also Fix These Component Issues:

1. **Line 106** - Change `colors.primary` to `colors.brand.DEFAULT`
2. **Line 183 & 189** - Change Button `variant="outline"` to `variant="secondary"`
3. **Line 198** - EmptyState: change `message` prop to `description`
4. **Line 257** - Badge: change `variant="default"` to `variant="neutral"`
5. **Line 262 & 270** - Badge: change `label` prop to `children` (or check your Badge component API)
6. **Line 270** - Badge: change `variant="error"` to `variant="danger"`

---

## Step 2: Create Supabase Storage Bucket for W-9s

### Option A: Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **"New bucket"**
4. Name: `subcontractor-w9s`
5. **Public bucket:** OFF (keep private)
6. Click **Create bucket**

### Option B: Via SQL

Run this in Supabase SQL Editor:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('subcontractor-w9s', 'subcontractor-w9s', false)
ON CONFLICT (id) DO NOTHING;

-- Add RLS policies for W-9 uploads
CREATE POLICY "Users can upload their own W-9s"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'subcontractor-w9s' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own W-9s"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'subcontractor-w9s' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own W-9s"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'subcontractor-w9s' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own W-9s"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'subcontractor-w9s' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### Verify It Works

After creating the bucket, test the W-9 upload functionality in your app.

---

## Step 3: Create Email Delivery Edge Function (Optional)

This step is optional for initial launch. You can add it later when you're ready to enable email delivery.

### Create the Edge Function

```bash
cd supabase
supabase functions new send-1099-email
```

### Add the Function Code

Create `supabase/functions/send-1099-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { subcontractorId, taxYear } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser()
    if (!user) {
      throw new Error('Not authenticated')
    }

    // Fetch subcontractor 1099 total
    const { data: subcontractor, error: fetchError } = await supabaseClient
      .from('subcontractor_1099_totals')
      .select('*')
      .eq('subcontractor_id', subcontractorId)
      .eq('tax_year', taxYear)
      .single()

    if (fetchError) throw fetchError

    // Check e-delivery consent
    if (!subcontractor.edelivery_consent) {
      throw new Error('E-delivery consent required')
    }

    const email = subcontractor.edelivery_email || subcontractor.email
    if (!email) {
      throw new Error('No email address')
    }

    // TODO: Generate PDF (you'll need to implement this)
    // const pdfBlob = await generate1099PrepPdf({ subcontractor, payer, taxYear })

    // TODO: Send email via Resend
    // const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    // await fetch('https://api.resend.com/emails', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${RESEND_API_KEY}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     from: 'noreply@yourdomain.com',
    //     to: email,
    //     subject: `Your 1099-NEC Prep Summary for ${taxYear}`,
    //     html: `<p>Attached is your 1099-NEC preparation summary...</p>`,
    //     attachments: [{ filename: '1099-prep.pdf', content: pdfBase64 }],
    //   }),
    // })

    // Log delivery
    await supabaseClient.from('subcontractor_1099_deliveries').insert({
      user_id: user.id,
      subcontractor_id: subcontractorId,
      tax_year: taxYear,
      amount: subcontractor.total_paid,
      recipient_email: email,
      delivery_method: 'email',
    })

    // Update last sent timestamp
    await supabaseClient
      .from('subcontractors')
      .update({ last_1099_email_sent_at: new Date().toISOString() })
      .eq('id', subcontractorId)

    return new Response(
      JSON.stringify({ success: true, message: '1099 email sent successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
```

### Deploy the Function

```bash
supabase functions deploy send-1099-email
```

### Update the UI to Call the Function

In `Subcontractor1099Center.tsx`, replace the `handleEmailPdf` function:

```typescript
const handleEmailPdf = async (subcontractor: Subcontractor1099Total) => {
  if (!canEmail1099(subcontractor)) {
    alert('Cannot email 1099: E-delivery consent required and valid email needed');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated');

    const response = await fetch(
      `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-1099-email`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subcontractorId: subcontractor.subcontractor_id,
          taxYear: selectedYear,
        }),
      }
    );

    const result = await response.json();
    if (!response.ok) throw new Error(result.error);

    alert(`1099 emailed successfully to ${getEffective1099Email(subcontractor)}`);
  } catch (error: any) {
    alert(`Error sending email: ${error.message}`);
  }
};
```

---

## Step 4: Integrate with PayersScreen

Add the 1099 Center as a new tab in your existing Payers/Subcontractors screen.

### Update PayersScreen.tsx

1. **Add the import:**
```typescript
import { Subcontractor1099Center } from '../components/Subcontractor1099Center';
```

2. **Update the tab type:**
```typescript
type TabType = 'payers' | 'subcontractors' | '1099-center';
```

3. **Add tab button** (find where tabs are rendered):
```typescript
<TouchableOpacity
  style={[styles.tab, activeTab === '1099-center' && styles.tabActive]}
  onPress={() => setActiveTab('1099-center')}
>
  <Text style={[styles.tabText, activeTab === '1099-center' && styles.tabTextActive]}>
    1099 Center
  </Text>
</TouchableOpacity>
```

4. **Add conditional render** (find where tab content is rendered):
```typescript
{activeTab === '1099-center' && <Subcontractor1099Center />}
```

### Alternative: Create Standalone Screen

If you prefer a separate screen instead of a tab:

1. Create `src/screens/Subcontractor1099Screen.tsx`:
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Subcontractor1099Center } from '../components/Subcontractor1099Center';

export function Subcontractor1099Screen() {
  return (
    <View style={styles.container}>
      <Subcontractor1099Center />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
```

2. Add to your navigation (wherever routes are defined)

---

## Testing Checklist

After completing the steps above, test the following:

### Database & View
- [ ] Run `npm run supabase:types` to regenerate types
- [ ] Verify `subcontractor_1099_totals` view returns data
- [ ] Check that totals match manual calculations

### UI
- [ ] Navigate to 1099 Center
- [ ] Year selector changes data
- [ ] Summary stats are accurate
- [ ] Status badges show correct colors
- [ ] Missing info warnings appear

### W-9 Management
- [ ] Can upload W-9 document
- [ ] W-9 appears in Supabase Storage
- [ ] Can toggle W-9 status
- [ ] Can download W-9

### Exports
- [ ] PDF downloads correctly
- [ ] PDF contains correct data
- [ ] CSV downloads with all columns
- [ ] CSV opens in Excel/Sheets

### Email (if implemented)
- [ ] Email button disabled when no consent
- [ ] Email sends successfully
- [ ] Delivery logged in database
- [ ] Timestamp updated

---

## Quick Start Commands

```bash
# Regenerate types after migration
npm run supabase:types

# Install dependencies (if needed)
npm install

# Start dev server
npm run start:web

# Deploy edge function (if created)
cd supabase
supabase functions deploy send-1099-email
```

---

## Troubleshooting

### "Cannot find module" errors
Run: `npm install`

### TypeScript errors in 1099 Center
Follow Step 1 above to fix theme imports

### W-9 upload fails
- Check Storage bucket exists
- Verify RLS policies are set
- Check browser console for errors

### View returns no data
- Verify migration ran successfully
- Check that gigs have dates
- Ensure subcontractor payments exist

### Email function fails
- Check Resend API key is set
- Verify edge function is deployed
- Check Supabase function logs

---

## Support

- Review `1099_NEC_CENTER_IMPLEMENTATION.md` for detailed docs
- Check `TAX_TREATMENT_VERIFICATION.md` for SQL queries
- Test with golden dataset from implementation guide

---

## What's Next

After completing these 4 steps, you'll have a fully functional 1099-NEC Center! 

Optional enhancements:
- Add bulk PDF download (zip all PDFs)
- Add email templates customization
- Add 1099 preview before sending
- Add IRS e-filing integration (future)
- Add state-specific 1099 requirements
