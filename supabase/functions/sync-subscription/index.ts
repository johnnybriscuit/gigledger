import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import {
  corsHeaders,
  createServiceClient,
  errorResponse,
  getAuthenticatedUser,
  jsonResponse,
  resolveAuthorizedRequestUserId,
} from '../_shared/auth.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY_PROD') || Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const user = await getAuthenticatedUser(req)
    const { userId: requestedUserId } = await req.json()
    const userId = resolveAuthorizedRequestUserId(user.id, requestedUserId)

    if (!user.email) {
      return jsonResponse({ error: 'Authenticated user email is unavailable' }, 400)
    }

    const supabase = createServiceClient()

    // Search for customer in Stripe by email
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    })

    if (customers.data.length === 0) {
      return jsonResponse({
          message: 'No Stripe customer found',
          plan: 'free'
        })
    }

    const customer = customers.data[0]

    // Get customer's subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'all',
      limit: 1,
    })

    if (subscriptions.data.length === 0) {
      return jsonResponse({
          message: 'No subscription found',
          plan: 'free'
        })
    }

    const stripeSubscription = subscriptions.data[0]
    const tier = stripeSubscription.items.data[0].price.recurring?.interval === 'year' ? 'yearly' : 'monthly'

    // Upsert subscription in database
    const { error: upsertError } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: userId,
        stripe_customer_id: customer.id,
        stripe_subscription_id: stripeSubscription.id,
        stripe_price_id: stripeSubscription.items.data[0].price.id,
        tier,
        status: stripeSubscription.status,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
        canceled_at: stripeSubscription.canceled_at ? new Date(stripeSubscription.canceled_at * 1000).toISOString() : null,
        trial_end: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000).toISOString() : null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })

    if (upsertError) {
      console.error('Error upserting subscription:', upsertError)
      return jsonResponse({ error: 'Failed to save subscription' }, 500)
    }

    return jsonResponse({
        message: 'Subscription synced successfully',
        plan: tier,
        status: stripeSubscription.status
      })
  } catch (error) {
    return errorResponse(error, 'Error syncing subscription:')
  }
})
