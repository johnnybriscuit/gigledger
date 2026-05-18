import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `You are Bozzy's financial coach for self-employed musicians and gig workers. You give ONE specific, actionable, encouraging piece of financial advice based on the user's actual data.

Rules:
- Maximum 2 sentences
- Be specific — use their actual dollar amounts
- Warm and human tone, never clinical
- Focus on the most impactful action they could take right now
- Never give generic advice that ignores their data
- If their tax bucket is underfunded, prioritize that
- If they have no retirement savings, mention it gently
- If they are ahead on taxes, celebrate it
- Do not mention competitors or other apps`

const FALLBACK_TIP = "Set up a separate bank account named 'Tax Money' and transfer your tax allocation every time you get paid."

interface RequestBody {
  ytdIncome: number
  buckets: Array<{
    name: string
    bucketType: string
    percentage: number
    ytdBalance: number
    goalAmount?: number
  }>
  gigCount: number
  avgGigAmount: number
  nextQuarterlyDate: string
  daysUntilQuarterly: number
}

function buildUserPrompt(body: RequestBody): string {
  const {
    ytdIncome,
    buckets,
    gigCount,
    avgGigAmount,
    nextQuarterlyDate,
    daysUntilQuarterly,
  } = body

  const taxBucket = buckets.find(b => b.bucketType === 'federal_tax')
  const retirementBucket = buckets.find(b => b.bucketType === 'retirement')
  const emergencyBucket = buckets.find(b => b.bucketType === 'emergency_fund')
  const debtBucket = buckets.find(b => b.bucketType === 'debt')

  const taxBalance = taxBucket?.ytdBalance || 0
  const retirementBalance = retirementBucket?.ytdBalance || 0
  const emergencyBalance = emergencyBucket?.ytdBalance || 0
  const debtBalance = debtBucket?.ytdBalance || 0

  const estimatedTaxOwed = ytdIncome * ((taxBucket?.percentage || 20) / 100)

  let prompt = `My financial data:
- YTD gig income: $${ytdIncome.toFixed(2)}
- Tax bucket: $${taxBalance.toFixed(2)} set aside (estimated owed: $${estimatedTaxOwed.toFixed(2)})
- Retirement: $${retirementBalance.toFixed(2)} saved this year (${(retirementBucket?.percentage || 0).toFixed(1)}% of income)
- Emergency fund: $${emergencyBalance.toFixed(2)} of $${(emergencyBucket?.goalAmount || 5000).toFixed(2)} goal (${((emergencyBalance / (emergencyBucket?.goalAmount || 5000)) * 100).toFixed(0)}% complete)`

  if (debtBucket && debtBalance > 0) {
    prompt += `\n- Debt payoff: $${debtBalance.toFixed(2)} applied to ${debtBucket.name}`
  }

  prompt += `\n- Next quarterly tax payment: ${nextQuarterlyDate} (${daysUntilQuarterly} days away)
- I have ${gigCount} paid gigs averaging $${avgGigAmount.toFixed(2)} each

What is the one most important financial action I should focus on right now?`

  return prompt
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 405 }
      )
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Validate caller identity
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    )

    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser()
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Parse request body
    const body = await req.json() as RequestBody
    if (!body || typeof body.ytdIncome !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid request body' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Simple rate limiting: check allocation_transactions count for today
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabaseClient
      .from('allocation_transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', authUser.id)
      .gte('created_at', `${today}T00:00:00`)

    if (count && count >= 10) {
      return new Response(
        JSON.stringify({ error: 'Rate limit exceeded. Try again tomorrow.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
      )
    }

    // Check for Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicApiKey) {
      console.error('[AI Coach] ANTHROPIC_API_KEY not configured')
      return new Response(
        JSON.stringify({ 
          tip: FALLBACK_TIP,
          fallback: true,
          generatedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // Build the user prompt
    const userPrompt = buildUserPrompt(body)

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[AI Coach] Anthropic API error:', response.status, errorText)
      throw new Error('Anthropic API request failed')
    }

    const data = await response.json()
    const tip = data.content?.[0]?.text || FALLBACK_TIP

    return new Response(
      JSON.stringify({ 
        tip,
        fallback: false,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[AI Coach] Error:', error)
    return new Response(
      JSON.stringify({ 
        tip: FALLBACK_TIP,
        fallback: true,
        generatedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  }
})
