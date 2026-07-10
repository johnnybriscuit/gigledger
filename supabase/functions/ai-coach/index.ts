import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

const SYSTEM_PROMPT = `You are Bozzy's financial coach for self-employed musicians and gig workers.

Your job is to give ONE specific, actionable, encouraging piece of advice based on the user's ACTUAL financial data provided.

STRICT RULES:
- Maximum 2 sentences total
- CRITICAL: If gigCount > 0, this is an ACTIVE USER. NEVER tell an active user to log their "first gig," "get started," or imply they haven't begun using the app.
- Must reference at least one specific dollar amount or percentage from their data
- Rotate through these advice categories based on what is most relevant:
  * TAX: quarterly payments, coverage, setting aside
  * RETIREMENT: contribution rate, account types, limits
  * EMERGENCY: progress toward goal, importance
  * INCOME: gig frequency, average rate, patterns
  * DEBT: payoff pace, interest savings
  * GOAL: progress toward savings goals
- Tone: warm, direct, like a knowledgeable friend
- Never be generic — if data is available use it
- Never say "consider" — say what to DO
- Do not mention competitors or other apps
- You may use **bold** for emphasis on the single most important number or date in your response. Keep formatting minimal — bold at most one key figure.
- Use whole dollar amounts only (e.g. "$211", never "$211.00" or "$211.50")

EXAMPLES OF GOOD ADVICE:
"You've set aside $1,082 for taxes — you're fully covered for Q3. Move that money to a dedicated savings account before you're tempted to spend it."

"Your retirement contribution is at 3% — bumping it to even 5% would add $866 to your SEP-IRA this year based on your $4,330 income so far."

"At $188 per gig average, one extra gig this month would fully fund your emergency savings contribution for the quarter."

EXAMPLES OF BAD ADVICE (never do this):
"Consider setting up a separate account." ← too vague
"You're doing great!" ← not actionable
"Make sure to track your expenses." ← generic`

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
  lastAdviceCategory?: string
}

// Whole-dollar, comma-formatted — matches how the app displays currency
// everywhere else. Using .toFixed(2) here previously produced amounts like
// "$211.00" in the prompt, which Claude would echo back verbatim; the
// client's "first sentence" preview then misread that decimal point as a
// sentence boundary and truncated mid-number.
function fmtDollars(n: number): string {
  return Math.round(n).toLocaleString('en-US')
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
- YTD gig income: $${fmtDollars(ytdIncome)}
- Tax bucket: $${fmtDollars(taxBalance)} set aside (estimated owed: $${fmtDollars(estimatedTaxOwed)})
- Retirement: $${fmtDollars(retirementBalance)} saved this year (${Math.round(retirementBucket?.percentage || 0)}% of income)
- Emergency fund: $${fmtDollars(emergencyBalance)} of $${fmtDollars(emergencyBucket?.goalAmount || 5000)} goal (${((emergencyBalance / (emergencyBucket?.goalAmount || 5000)) * 100).toFixed(0)}% complete)`

  if (debtBucket && debtBalance > 0) {
    prompt += `\n- Debt payoff: $${fmtDollars(debtBalance)} applied to ${debtBucket.name}`
  }

  prompt += `\n- Next quarterly tax payment: ${nextQuarterlyDate} (${daysUntilQuarterly} days away)
- I have ${gigCount} paid gigs${gigCount > 0 ? ' (I AM AN ACTIVE USER — do NOT suggest I log my first gig or get started)' : ' (I am just getting started)'} averaging $${fmtDollars(avgGigAmount)} each`

  if (body.lastAdviceCategory) {
    prompt += `\n\nMy last advice was about: ${body.lastAdviceCategory}. Please advise on something DIFFERENT this time.`
  }

  prompt += `\n\nWhat is the one most important financial action I should focus on right now?`

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
    const token = authHeader.replace('Bearer ', '')
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser(token)
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
        model: 'claude-sonnet-4-6',
        // 150 was too tight for a "2 sentence" reply once bold markdown and
        // specific dollar figures are included — Claude would occasionally
        // run past the cap and get hard-truncated mid-sentence (e.g. "Your
        // emergency fund at $211." missing "is"). Give real headroom; the
        // system prompt still constrains length, this just stops us from
        // cutting off a valid response.
        max_tokens: 300,
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

    // If Claude's response was cut off by the token cap, it may be a broken
    // partial sentence (e.g. missing a word mid-clause). Don't serve that —
    // fall back to the static tip instead of showing users a truncated message.
    if (data.stop_reason === 'max_tokens') {
      console.error('[AI Coach] Response truncated at max_tokens, using fallback')
      return new Response(
        JSON.stringify({
          tip: FALLBACK_TIP,
          fallback: true,
          generatedAt: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

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
