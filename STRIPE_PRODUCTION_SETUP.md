# Stripe Production Setup Guide

## Overview
This guide walks you through switching from Stripe test mode to live production mode for GigLedger.

---

## What You Need from Stripe Dashboard

Go to https://dashboard.stripe.com and switch to **Live Mode** (toggle in top right).

### 1. API Keys
Navigate to **Developers → API Keys**:
- **Publishable key**: `pk_live_...` (not currently used in backend, but good to have)
- **Secret key**: `sk_live_...` ⚠️ **Keep this secret!**

### 2. Webhook Signing Secret
Navigate to **Developers → Webhooks**:
- Click on your production webhook endpoint
- Reveal the **Signing secret**: `whsec_...`
- If you don't have a webhook yet, create one pointing to:
  - URL: `https://gigledger-ten.vercel.app/api/stripe-webhook`
  - Events to listen for:
    - `checkout.session.completed`
    - `customer.subscription.created`
    - `customer.subscription.updated`
    - `customer.subscription.deleted`
    - `invoice.payment_succeeded`
    - `invoice.payment_failed`

### 3. Price IDs
Navigate to **Products**:
- Find your **Monthly subscription** product
  - Copy the Price ID: `price_...`
- Find your **Yearly subscription** product
  - Copy the Price ID: `price_...`

---

## How to Add Keys to Vercel (Recommended)

### Step 1: Go to Vercel Dashboard
1. Visit https://vercel.com
2. Select your `gigledger` project
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Each Variable
Add these 4 variables one by one:

#### Variable 1: Secret Key
- **Name**: `STRIPE_SECRET_KEY`
- **Value**: `sk_live_...` (paste your live secret key)
- **Environment**: ✅ Production only (uncheck Preview and Development)
- Click **Save**

#### Variable 2: Webhook Secret
- **Name**: `STRIPE_WEBHOOK_SECRET`
- **Value**: `whsec_...` (paste your webhook signing secret)
- **Environment**: ✅ Production only
- Click **Save**

#### Variable 3: Monthly Price ID
- **Name**: `EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID`
- **Value**: `price_...` (paste your live monthly price ID)
- **Environment**: ✅ Production only
- Click **Save**

#### Variable 4: Yearly Price ID
- **Name**: `EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID`
- **Value**: `price_...` (paste your live yearly price ID)
- **Environment**: ✅ Production only
- Click **Save**

### Step 3: Redeploy
After adding all variables:
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment
3. Click **Redeploy**
4. Check "Use existing Build Cache"
5. Click **Redeploy**

---

## Local Development Setup (Optional)

If you want to test with live keys locally:

### Step 1: Update .env.local
Create or edit `.env.local` (this file is gitignored):

```bash
# Stripe Production Keys (for local testing)
STRIPE_SECRET_KEY=sk_live_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_your_monthly_id
EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_your_yearly_id
```

### Step 2: Never Commit This File
The `.env.local` file is already in `.gitignore`. **Never commit it to git!**

---

## Verification Checklist

After deploying with production keys:

### ✅ Test Subscription Flow
1. Go to https://gigledger-ten.vercel.app/subscription
2. Click "Subscribe" on Monthly or Yearly plan
3. Complete checkout with a **real credit card** (you'll be charged!)
4. Verify you're redirected back to the app
5. Check that your subscription status shows as "Pro"

### ✅ Test Webhook
1. Complete a subscription (above)
2. Check Vercel logs: **Deployments → [Latest] → Functions**
3. Look for `stripe-webhook` function calls
4. Verify no errors in the logs

### ✅ Test Subscription Management
1. Go to **Account → Subscription**
2. Click "Manage Subscription"
3. Verify Stripe Customer Portal opens
4. Try canceling/updating subscription
5. Verify changes reflect in the app

### ✅ Stripe Dashboard Verification
1. Go to https://dashboard.stripe.com (Live Mode)
2. Check **Payments** - should see your test payment
3. Check **Customers** - should see your customer record
4. Check **Subscriptions** - should see active subscription

---

## Code Changes Made

The following files were updated to remove hardcoded test keys:

1. **`.env.example`** - Added Stripe environment variable documentation
2. **`app.json`** - Removed hardcoded test price IDs
3. **`src/screens/SubscriptionScreen.tsx`** - Removed fallback test price IDs, now requires env vars

---

## Troubleshooting

### "Stripe Price IDs not configured" Error
**Cause**: Environment variables not set in Vercel
**Fix**: Follow "How to Add Keys to Vercel" section above

### Webhook Not Firing
**Cause**: Webhook endpoint not configured in Stripe
**Fix**: 
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://gigledger-ten.vercel.app/api/stripe-webhook`
3. Add required events (see "Webhook Signing Secret" section)
4. Copy the signing secret to Vercel env vars

### Subscription Not Updating in App
**Cause**: Webhook secret mismatch
**Fix**: 
1. Get the correct webhook signing secret from Stripe
2. Update `STRIPE_WEBHOOK_SECRET` in Vercel
3. Redeploy

### "Invalid API Key" Error
**Cause**: Using test key instead of live key, or key not set
**Fix**: 
1. Verify you copied the `sk_live_...` key (not `sk_test_...`)
2. Verify it's set in Vercel environment variables
3. Redeploy after adding the key

---

## Security Best Practices

✅ **DO:**
- Store secret keys in Vercel environment variables
- Use "Production only" environment setting
- Rotate keys if they're ever exposed
- Use webhook signing secrets to verify webhook authenticity

❌ **DON'T:**
- Commit secret keys to git
- Share secret keys in chat/email/Slack
- Use test keys in production
- Hardcode keys in source code

---

## Support

If you encounter issues:
1. Check Vercel function logs for errors
2. Check Stripe Dashboard → Developers → Logs
3. Verify all 4 environment variables are set correctly
4. Ensure webhook endpoint is configured in Stripe

---

## Next Steps After Setup

Once production Stripe is working:
1. ✅ Test with a real subscription
2. ✅ Cancel the test subscription (to avoid charges)
3. ✅ Monitor Stripe Dashboard for the first few real customers
4. ✅ Set up Stripe email receipts (Settings → Emails)
5. ✅ Configure Stripe tax settings if needed (Settings → Tax)
