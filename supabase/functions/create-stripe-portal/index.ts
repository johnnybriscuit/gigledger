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
    const supabase = createServiceClient()

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('user_id', userId)
      .single()

    if (error || !subscription?.stripe_customer_id) {
      console.error('No subscription found for user:', userId)
      return jsonResponse({
          error: 'No active subscription found. Please subscribe first.',
          code: 'NO_SUBSCRIPTION'
        }, 404)
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripe_customer_id,
      return_url: `${Deno.env.get('SITE_URL') || 'https://bozzygigs.com'}/subscription`,
    })

    return jsonResponse({ url: session.url })
  } catch (error) {
    return errorResponse(error, 'Error creating portal session:')
  }
})
