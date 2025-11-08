/**
 * Create Stripe Customer Portal Session
 * Allows users to manage their subscription, update payment method, etc.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set');
}

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not set');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Create portal request received');
    const { userId } = req.body;

    if (!userId) {
      console.error('Missing userId in request');
      return res.status(400).json({ error: 'Missing userId' });
    }

    console.log('Looking up subscription for user:', userId);

    // Get customer ID from subscriptions table
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching subscription:', error);
      return res.status(404).json({ error: 'Database error', details: error.message });
    }

    if (!subscription?.stripe_customer_id) {
      console.error('No customer ID found for user');
      return res.status(404).json({ error: 'No subscription found' });
    }

    console.log('Creating portal session for customer:', subscription.stripe_customer_id);

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL || req.headers.origin}/subscription`,
    });

    console.log('Portal session created:', session.id);
    res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Error creating portal session:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
}
