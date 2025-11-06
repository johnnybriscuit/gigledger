# Stripe Setup Checklist - Quick Start

**Pricing: $4.99/month | $49.99/year**

## ✅ Already Done (Code is Ready!)

- [x] Database migration created
- [x] API endpoints built (webhook, checkout, portal)
- [x] React hooks and components created
- [x] Pricing set to $4.99/month and $49.99/year
- [x] All code committed and pushed to GitHub

## 🔲 To Do When You Come Back

### 1. Create Stripe Account (5 min)
- [ ] Go to https://stripe.com
- [ ] Sign up for account
- [ ] Use **Test Mode** first (toggle in top right)

### 2. Create Products in Stripe (5 min)
- [ ] Go to **Products** → **Add Product**
- [ ] Create Monthly Product:
  - Name: `GigLedger Monthly`
  - Price: `$4.99 USD` recurring monthly
  - **Copy the Price ID** → save it somewhere
- [ ] Create Yearly Product:
  - Name: `GigLedger Yearly`
  - Price: `$49.99 USD` recurring yearly
  - **Copy the Price ID** → save it somewhere

### 3. Get API Keys (2 min)
- [ ] Go to **Developers** → **API Keys**
- [ ] Copy **Secret key** (starts with `sk_test_...`)
- [ ] Keep this tab open

### 4. Set Up Webhook (5 min)
- [ ] Go to **Developers** → **Webhooks**
- [ ] Click **Add endpoint**
- [ ] Endpoint URL: `https://gigledger-ten.vercel.app/api/stripe-webhook`
- [ ] Select these events:
  - [x] `customer.subscription.created`
  - [x] `customer.subscription.updated`
  - [x] `customer.subscription.deleted`
  - [x] `invoice.payment_succeeded`
  - [x] `invoice.payment_failed`
- [ ] Click **Add endpoint**
- [ ] **Copy the Signing Secret** (starts with `whsec_...`)

### 5. Run Database Migration (2 min)
- [ ] Go to Supabase Dashboard
- [ ] Click **SQL Editor**
- [ ] Copy contents of `supabase/migrations/20241106_add_subscriptions.sql`
- [ ] Paste and click **Run**
- [ ] Should see "Success. No rows returned"

### 6. Add Environment Variables to Vercel (5 min)
- [ ] Go to Vercel Dashboard → Your Project → **Settings** → **Environment Variables**
- [ ] Add these variables (for **Production, Preview, Development**):

```
STRIPE_SECRET_KEY = sk_test_... (from step 3)
STRIPE_WEBHOOK_SECRET = whsec_... (from step 4)
STRIPE_MONTHLY_PRICE_ID = price_... (from step 2 - monthly)
STRIPE_YEARLY_PRICE_ID = price_... (from step 2 - yearly)
SUPABASE_SERVICE_ROLE_KEY = (from Supabase Settings → API)
```

- [ ] Click **Save**

### 7. Redeploy (1 min)
- [ ] In Vercel, go to **Deployments**
- [ ] Click ⋯ on latest deployment → **Redeploy**
- [ ] Wait for deployment to complete

### 8. Test It! (5 min)
- [ ] Go to your live site
- [ ] Navigate to subscription page (you'll need to add it to navigation)
- [ ] Click "Subscribe to Monthly Plan"
- [ ] Use test card: `4242 4242 4242 4242`
- [ ] Any future date, any CVC
- [ ] Complete checkout
- [ ] Check Stripe Dashboard → should see subscription
- [ ] Check Supabase → `subscriptions` table should have entry

## 📝 Quick Reference

**Test Card Numbers:**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Requires authentication: `4000 0025 0000 3155`

**Where to Find Things:**

| What | Where |
|------|-------|
| Stripe Dashboard | https://dashboard.stripe.com |
| Supabase Dashboard | https://supabase.com/dashboard |
| Vercel Dashboard | https://vercel.com/dashboard |
| Migration File | `supabase/migrations/20241106_add_subscriptions.sql` |
| Setup Guide | `SUBSCRIPTION_SETUP.md` |

## 🚨 Common Issues

**Webhook not working?**
- Make sure URL is correct: `https://YOUR-DOMAIN.vercel.app/api/stripe-webhook`
- Check Vercel function logs
- Verify webhook secret is correct

**Subscription not showing in database?**
- Check webhook is receiving events (Stripe Dashboard → Webhooks → click endpoint)
- Check Vercel function logs for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set

**Can't complete checkout?**
- Make sure you're using test mode in Stripe
- Use test card `4242 4242 4242 4242`
- Check browser console for errors

## ⏱️ Total Time: ~30 minutes

Most of it is just copying and pasting values. The code is already done!

## 🎯 After Testing

When ready to go live:
1. Switch Stripe to **Live Mode**
2. Create new products with same pricing
3. Create new webhook for production
4. Update Vercel env vars with live keys
5. Test with real card (small amount)
6. Launch! 🚀

---

**Everything is saved and ready to go!** Just follow this checklist when you come back.
