import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.21.0'
import {
  corsHeaders,
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
    const { priceId, userId: requestedUserId } = await req.json()

    resolveAuthorizedRequestUserId(user.id, requestedUserId)

    if (!priceId || typeof priceId !== 'string') {
      return jsonResponse({ error: 'Missing required field: priceId' }, 400)
    }

    if (!user.email) {
      return jsonResponse({ error: 'Authenticated user email is unavailable' }, 400)
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${Deno.env.get('SITE_URL') || 'https://bozzygigs.com'}/subscription?success=true`,
      cancel_url: `${Deno.env.get('SITE_URL') || 'https://bozzygigs.com'}/subscription?canceled=true`,
      metadata: {
        userId: user.id,
      },
    })

    return jsonResponse({ url: session.url })
  } catch (error) {
    return errorResponse(error, 'Error creating checkout session:')
  }
})
