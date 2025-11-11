/**
 * Stripe Webhook Handler
 * Processes Stripe events and updates subscription status in Supabase
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Use service role key for admin access
);

// Disable body parsing, need raw body for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;

  try {
    const rawBody = await getRawBody(req);
    console.log('Webhook received, signature:', sig?.substring(0, 20) + '...');
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    console.log('Webhook verified, event type:', event.type);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded':
      case 'invoice.paid':
      case 'invoice.finalized': {
        const invoice = event.data.object as any;
        console.log('Invoice event:', event.type, 'Status:', invoice.status);
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await handleSubscriptionUpdate(subscription);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          await handlePaymentFailed(invoice.subscription as string);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: error.message });
  }
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log('Processing subscription update:', subscription.id);
  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;
  console.log('Price ID:', priceId);
  console.log('Expected monthly:', process.env.STRIPE_MONTHLY_PRICE_ID);
  console.log('Expected yearly:', process.env.STRIPE_YEARLY_PRICE_ID);

  // Determine tier based on price ID
  let tier: 'free' | 'monthly' | 'yearly' = 'free';
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
    tier = 'monthly';
  } else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
    tier = 'yearly';
  }
  console.log('Determined tier:', tier);

  // Get user_id from customer metadata
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;
  console.log('User ID from metadata:', userId);

  if (!userId) {
    throw new Error('No user_id found in customer metadata');
  }

  // Determine plan for profiles table
  let plan: 'free' | 'pro_monthly' | 'pro_yearly' = 'free';
  if (priceId === process.env.STRIPE_MONTHLY_PRICE_ID) {
    plan = 'pro_monthly';
  } else if (priceId === process.env.STRIPE_YEARLY_PRICE_ID) {
    plan = 'pro_yearly';
  }

  // Update user's plan in profiles table
  console.log('Updating user plan to:', plan);
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ plan })
    .eq('id', userId);

  if (profileError) {
    console.error('Error updating user plan:', profileError);
    // Don't throw - we still want to update subscription even if plan update fails
  } else {
    console.log('User plan successfully updated to:', plan);
  }

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    tier,
    status: subscription.status as any,
    current_period_start: new Date((subscription as any).current_period_start * 1000).toISOString(),
    current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
    trial_end: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
  };

  console.log('Upserting subscription data:', subscriptionData);
  const { error } = await supabase
    .from('subscriptions')
    .upsert(subscriptionData, { onConflict: 'user_id' });

  if (error) {
    console.error('Error upserting subscription:', error);
    throw error;
  }
  console.log('Subscription successfully upserted for user:', userId);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  console.log('Processing subscription cancellation:', subscription.id);
  
  // Get user_id from customer metadata
  const customerId = subscription.customer as string;
  const customer = await stripe.customers.retrieve(customerId);
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;
  
  if (userId) {
    // Reset user's plan to free
    console.log('Resetting user plan to free for user:', userId);
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ plan: 'free' })
      .eq('id', userId);

    if (profileError) {
      console.error('Error resetting user plan:', profileError);
      // Don't throw - we still want to update subscription status
    } else {
      console.log('User plan successfully reset to free');
    }
  }

  // Update subscription status
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);

  if (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
  
  console.log('Subscription successfully canceled');
}

async function handlePaymentFailed(subscriptionId: string) {
  const { error } = await supabase
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', subscriptionId);

  if (error) {
    console.error('Error updating payment failed status:', error);
    throw error;
  }
}
