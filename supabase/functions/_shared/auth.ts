import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'
import { resolveAuthorizedBillingUserId } from '../../../src/lib/billingSecurity.ts'
import { getCorsHeaders } from './cors.ts'

export class FunctionHttpError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function jsonResponse(payload: unknown, status: number = 200, req?: Request) {
  const corsHeaders = req ? getCorsHeaders(req) : {
    'Access-Control-Allow-Origin': 'https://bozzygigs.com',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
  
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

export function createServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

export async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw new FunctionHttpError('Unauthorized', 401)
  }

  const authClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    }
  )

  const {
    data: { user },
    error,
  } = await authClient.auth.getUser()

  if (error || !user) {
    throw new FunctionHttpError('Unauthorized', 401)
  }

  return user
}

export function resolveAuthorizedRequestUserId(
  authenticatedUserId: string,
  requestedUserId?: unknown
) {
  return resolveAuthorizedBillingUserId(authenticatedUserId, requestedUserId)
}

export function errorResponse(error: unknown, fallbackMessage: string = 'Internal server error') {
  if (error instanceof FunctionHttpError) {
    return jsonResponse({ error: error.message }, error.status)
  }

  console.error(fallbackMessage, error)
  return jsonResponse({ error: fallbackMessage }, 500)
}
