# Subscription & Paywall Setup Guide

This guide will help you set up Stripe subscriptions for GigLedger.

## Overview

The subscription system includes:
- **Monthly Plan**: $9.99/month
- **Yearly Plan**: $99.99/year (17% savings)
- Stripe Checkout for payments
- Stripe Customer Portal for subscription management
- Webhook integration for automatic subscription updates

## Step 1: Create Stripe Account

1. Go to [stripe.com](https://stripe.com) and create an account
2. Complete business verification
3. Note your **Test** and **Live** API keys

## Step 2: Create Subscription Products in Stripe

### In Stripe Dashboard:

1. Go to **Products** → **Add Product**

2. **Create Monthly Subscription:**
   - Name: `GigLedger Monthly`
   - Description: `Monthly subscription to GigLedger Premium`
   - Pricing: `$9.99 USD` recurring monthly
   - Copy the **Price ID** (starts with `price_...`)

3. **Create Yearly Subscription:**
   - Name: `GigLedger Yearly`
   - Description: `Yearly subscription to GigLedger Premium`
   - Pricing: `$99.99 USD` recurring yearly
   - Copy the **Price ID** (starts with `price_...`)

## Step 3: Set Up Webhook

### In Stripe Dashboard:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Endpoint URL: `https://your-domain.vercel.app/api/stripe-webhook`
4. Select events to listen to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the **Webhook Signing Secret** (starts with `whsec_...`)

## Step 4: Run Database Migration

Run the subscription migration in your Supabase SQL Editor:

```bash
# The migration file is at:
supabase/migrations/20241106_add_subscriptions.sql
```

Or copy the SQL from that file and run it in **Supabase Dashboard** → **SQL Editor**.

## Step 5: Configure Environment Variables

### In Vercel Dashboard:

Add these environment variables (**Settings** → **Environment Variables**):

```bash
# Stripe Keys (use test keys for development)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_MONTHLY_PRICE_ID=price_...
STRIPE_YEARLY_PRICE_ID=price_...

# Supabase (for webhook handler)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=https://your-domain.vercel.app
```

### In app.json (for React Native):

```json
{
  "expo": {
    "extra": {
      "googleMapsApiKey": "...",
      "stripeMonthlyPriceId": "price_...",
      "stripeYearlyPriceId": "price_..."
    }
  }
}
```

## Step 6: Install Dependencies

Already installed:
- ✅ `stripe`
- ✅ `@stripe/stripe-js`

## Step 7: Test the Integration

### Test Mode (Recommended First):

1. Use Stripe **test mode** keys
2. Use test card: `4242 4242 4242 4242`
3. Any future expiry date
4. Any CVC

### Testing Flow:

1. Navigate to `/subscription` screen
2. Select a plan (monthly or yearly)
3. Click "Subscribe"
4. Complete Stripe Checkout
5. Verify subscription appears in:
   - Stripe Dashboard
   - Supabase `subscriptions` table
   - App subscription screen

## Step 8: Implement Paywall Logic

### Example: Protect Premium Features

```typescript
import { useHasActiveSubscription } from '../hooks/useSubscription';

function PremiumFeature() {
  const hasSubscription = useHasActiveSubscription();

  if (!hasSubscription) {
    return (
      <View>
        <Text>This is a premium feature</Text>
        <Button title="Upgrade" onPress={() => navigation.navigate('Subscription')} />
      </View>
    );
  }

  return <YourPremiumFeature />;
}
```

### Example: Limit Free Tier

```typescript
import { useSubscription } from '../hooks/useSubscription';

function AddGigButton() {
  const { data: subscription } = useSubscription();
  const { data: gigs } = useGigs();

  const isFree = subscription?.tier === 'free';
  const gigCount = gigs?.length || 0;
  const FREE_TIER_LIMIT = 10;

  const handleAddGig = () => {
    if (isFree && gigCount >= FREE_TIER_LIMIT) {
      Alert.alert(
        'Upgrade Required',
        'Free tier is limited to 10 gigs. Upgrade to add unlimited gigs!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade', onPress: () => navigation.navigate('Subscription') }
        ]
      );
      return;
    }

    // Proceed with adding gig
    setModalVisible(true);
  };

  return <Button title="Add Gig" onPress={handleAddGig} />;
}
```

## Step 9: Go Live

### When Ready for Production:

1. **Switch to Live Mode** in Stripe Dashboard
2. Update environment variables with **live** keys:
   - `STRIPE_SECRET_KEY=sk_live_...`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (create new webhook for production)
   - Live Price IDs
3. Test with real payment method
4. Set up proper error monitoring (Sentry, LogRocket, etc.)

## Pricing Recommendations

Based on similar apps:

- **Free Tier**: 10-20 gigs, basic features
- **Monthly**: $9.99 - $14.99/month
- **Yearly**: $99 - $149/year (offer 15-20% discount)

## Features to Gate

Consider making these premium:

- ✅ Unlimited gigs (free tier: 10-20 gigs)
- ✅ Advanced tax calculations
- ✅ CSV/PDF exports
- ✅ Multiple payers
- ✅ Receipt uploads
- ✅ Historical data (free tier: current year only)
- ✅ Priority support

## Security Notes

- ✅ Never expose `STRIPE_SECRET_KEY` in client code
- ✅ Always verify webhook signatures
- ✅ Use Supabase RLS policies to protect subscription data
- ✅ Validate subscription status server-side for critical operations

## Monitoring

### Track These Metrics:

- Monthly Recurring Revenue (MRR)
- Churn rate
- Conversion rate (free → paid)
- Failed payments
- Customer Lifetime Value (LTV)

### Stripe Dashboard provides:

- Real-time revenue
- Subscription analytics
- Failed payment alerts
- Customer insights

## Support & Troubleshooting

### Common Issues:

**Webhook not receiving events:**
- Check webhook URL is correct
- Verify webhook is enabled
- Check Vercel function logs

**Subscription not updating:**
- Check Supabase RLS policies
- Verify webhook secret is correct
- Check Vercel environment variables

**Payment fails:**
- Test with Stripe test cards first
- Check for proper error handling
- Verify customer email is valid

## Next Steps

1. ✅ Run database migration
2. ✅ Set up Stripe products
3. ✅ Configure environment variables
4. ✅ Test in development
5. ✅ Implement paywall logic
6. ✅ Test with real payment (small amount)
7. ✅ Go live!

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [Stripe Customer Portal](https://stripe.com/docs/billing/subscriptions/customer-portal)
