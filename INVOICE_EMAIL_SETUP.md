# Invoice Email Setup Guide

This guide explains how to deploy the Supabase Edge Function for sending invoice emails via Resend.

## Prerequisites

- Supabase CLI installed: `npm install -g supabase`
- Resend API key (already configured in `.env`)
- Supabase project linked

## Step 1: Link Your Supabase Project

```bash
cd /Users/johnburkhardt/dev/gigledger
supabase link --project-ref jvostkeswuhfwntbrfzl
```

When prompted, enter your Supabase database password.

## Step 2: Set Environment Variables in Supabase

Go to your Supabase Dashboard → Project Settings → Edge Functions → Add secret:

```
RESEND_API_KEY=re_YKyT6Jw5_5yVq8PZFr6jDRWHuPKUcGQYt
RESEND_DOMAIN=resend.dev
NEXT_PUBLIC_APP_URL=https://gigledger-ten.vercel.app
```

## Step 3: Deploy the Edge Function

```bash
supabase functions deploy send-invoice-email
```

This will deploy the function to: `https://jvostkeswuhfwntbrfzl.supabase.co/functions/v1/send-invoice-email`

## Step 4: Test the Function

After deployment, test by:

1. Create an invoice in your app
2. Click "Email" button
3. Enter recipient email
4. Click "Send Invoice"

The function will:
- ✅ Fetch invoice and settings from database
- ✅ Generate professional HTML email
- ✅ Send via Resend API
- ✅ Update invoice status to "sent"
- ✅ Include public invoice link

## Troubleshooting

### Function not found (404)
- Verify function is deployed: `supabase functions list`
- Check project is linked: `supabase status`

### Email not sending
- Check Resend API key is set in Supabase secrets
- Verify domain is verified in Resend dashboard
- Check function logs: `supabase functions logs send-invoice-email`

### Authentication errors
- Ensure user is authenticated when calling function
- Check Authorization header includes valid session token

## Email Template Features

The generated email includes:
- Company branding (name, email, phone)
- Custom message from sender
- Invoice details (number, dates, client info)
- Line items table with quantities and rates
- Subtotal, tax, discount calculations
- Total amount due
- "View Invoice Online" button linking to public view
- Notes section (if provided)
- Professional footer

## Security

- Edge Function uses Supabase Service Role Key for database access
- Client requests require valid user authentication token
- RLS policies ensure users can only send their own invoices
- Email replies go directly to business email (not GigLedger)

## Cost Considerations

- Supabase Edge Functions: Free tier includes 500K invocations/month
- Resend: Free tier includes 100 emails/day, 3,000/month
- Both should be sufficient for most freelancers/small businesses

## Next Steps

Once deployed, the email feature will work automatically when users click "Send Invoice" in the app!
