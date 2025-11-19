/**
 * Manual Subscription Sync Endpoint
 * Fetches user's subscription from Stripe and updates the database
 * Use this if webhook failed to update the plan
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin access
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
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

    console.log('=== Sync Subscription Debug ===');
    console.log('User ID:', user.id);
    console.log('User Email:', user.email);

    // Find Stripe customer by user ID in metadata
    console.log('Searching Stripe for customer with metadata supabase_user_id:', user.id);
    const customers = await stripe.customers.search({
      query: `metadata['supabase_user_id']:'${user.id}'`,
      limit: 1,
    });

    console.log('Stripe customers found:', customers.data.length);

    if (customers.data.length === 0) {
      console.log('No Stripe customer found for user:', user.id);
      console.log('Trying to search by email:', user.email);
      
      // Try searching by email as fallback
      const customersByEmail = await stripe.customers.list({
        email: user.email,
        limit: 1,
      });
      
      console.log('Customers found by email:', customersByEmail.data.length);
      
      if (customersByEmail.data.length === 0) {
        return res.status(404).json({ 
          error: 'No Stripe customer found',
          message: 'You may need to create a subscription first',
          userId: user.id,
          userEmail: user.email,
        });
      }
      
      // Use customer found by email
      const customer = customersByEmail.data[0];
      console.log('Found Stripe customer by email:', customer.id);
      
      // Continue with this customer
      const subscriptions = await stripe.subscriptions.list({
        customer: customer.id,
        status: 'active',
        limit: 1,
      });
      
      console.log('Active subscriptions found:', subscriptions.data.length);
      
      if (subscriptions.data.length === 0) {
        console.log('No active subscriptions found');
        await supabase
          .from('profiles')
          .update({ plan: 'free' })
          .eq('id', user.id);

        return res.status(200).json({
          success: true,
          plan: 'free',
          message: 'No active subscription found. Plan set to free.'
        });
      }
      
      // Process subscription with this customer
      const subscription = subscriptions.data[0];
      const priceId = subscription.items.data[0]?.price.id;
      
      console.log('Processing subscription:', subscription.id);
      console.log('Price ID:', priceId);
      
      // Determine plan
      let plan: 'free' | 'pro_monthly' | 'pro_yearly' = 'free';
      let tier: 'free' | 'monthly' | 'yearly' = 'free';

      if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
        plan = 'pro_monthly';
        tier = 'monthly';
      } else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
        plan = 'pro_yearly';
        tier = 'yearly';
      }

      console.log('Determined plan:', plan);

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ plan })
        .eq('id', user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        throw profileError;
      }

      console.log('Profile updated successfully');

      // Update subscriptions table
      const sub = subscription as any;
      
      const subscriptionData = {
        user_id: user.id,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        stripe_price_id: priceId,
        tier,
        status: subscription.status as any,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
      };

      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' });

      if (subError) {
        console.error('Error upserting subscription:', subError);
        throw subError;
      }

      console.log('Subscription synced successfully');

      return res.status(200).json({
        success: true,
        plan,
        tier,
        subscription: {
          id: subscription.id,
          status: subscription.status,
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        },
        message: 'Subscription synced successfully!'
      });
    }

    const customer = customers.data[0];
    console.log('Found Stripe customer by metadata:', customer.id);

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      console.log('No active subscriptions found');
      // Reset to free plan
      await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('id', user.id);

      return res.status(200).json({
        success: true,
        plan: 'free',
        message: 'No active subscription found. Plan set to free.'
      });
    }

    const subscription = subscriptions.data[0];
    const priceId = subscription.items.data[0]?.price.id;

    console.log('Found active subscription:', subscription.id);
    console.log('Price ID:', priceId);

    // Determine plan based on price ID
    let plan: 'free' | 'pro_monthly' | 'pro_yearly' = 'free';
    let tier: 'free' | 'monthly' | 'yearly' = 'free';

    if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
      plan = 'pro_monthly';
      tier = 'monthly';
    } else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
      plan = 'pro_yearly';
      tier = 'yearly';
    }

    console.log('Determined plan:', plan);

    // Update profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      throw profileError;
    }

    console.log('Profile updated successfully');

    // Update/insert subscriptions table
    // Cast to any to access period properties
    const sub = subscription as any;
    
    const subscriptionData = {
      user_id: user.id,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier,
      status: subscription.status as any,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    };

    const { error: subError } = await supabase
      .from('subscriptions')
      .upsert(subscriptionData, { onConflict: 'user_id' });

    if (subError) {
      console.error('Error upserting subscription:', subError);
      throw subError;
    }

    console.log('Subscription synced successfully');

    return res.status(200).json({
      success: true,
      plan,
      tier,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      },
      message: 'Subscription synced successfully!'
    });

  } catch (error: any) {
    console.error('Error syncing subscription:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      error: error.message,
      details: 'Failed to sync subscription',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
