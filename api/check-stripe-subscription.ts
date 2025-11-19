/**
 * Diagnostic endpoint to check Stripe subscription status
 * Returns what Stripe has for the authenticated user
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Checking subscription for user:', user.id);

    // Check profiles table
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single();

    console.log('Profile plan:', profile?.plan);

    // Check subscriptions table
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('Subscription record:', subscription);

    // Search Stripe for customer
    const customers = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
      limit: 1,
    });

    console.log('Stripe customers found:', customers.data.length);

    let stripeData = null;
    if (customers.data.length > 0) {
      const customer = customers.data[0];
      console.log('Stripe customer ID:', customer.id);

      // Get subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        limit: 10,
      });

      console.log('Stripe subscriptions found:', subscriptions.data.length);

      stripeData = {
        customerId: customer.id,
        customerEmail: customer.email,
        subscriptions: subscriptions.data.map(sub => ({
          id: sub.id,
          status: sub.status,
          priceId: sub.items.data[0]?.price.id,
          currentPeriodEnd: new Date((sub as any).current_period_end * 1000).toISOString(),
        })),
      };
    }

    return res.status(200).json({
      userId: user.id,
      userEmail: user.email,
      profilePlan: profile?.plan || null,
      subscriptionRecord: subscription || null,
      stripe: stripeData,
      expectedMonthlyPriceId: process.env.STRIPE_MONTHLY_PRICE_ID,
      expectedYearlyPriceId: process.env.STRIPE_YEARLY_PRICE_ID,
    });

  } catch (error: any) {
    console.error('Error checking subscription:', error);
    return res.status(500).json({ 
      error: error.message,
      details: 'Failed to check subscription'
    });
  }
}
