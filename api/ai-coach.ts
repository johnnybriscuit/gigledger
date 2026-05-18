/**
 * AI Financial Coach API endpoint
 * Uses Anthropic Claude to generate personalized financial advice
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkIdentifierRateLimit } from '../src/lib/rateLimit';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface CoachRequestBody {
  ytdIncome: number;
  taxBucketBalance: number;
  estimatedTaxOwed: number;
  retirementBalance: number;
  retirementPercentage: number;
  emergencyBalance: number;
  emergencyGoal: number;
  debtBalance?: number;
  debtName?: string;
  nextQuarterlyDate: string;
  daysUntilQuarterly: number;
  gigCount: number;
  avgGigAmount: number;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing authorization' });
    }

    const token = authHeader.substring(7);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Rate limit: 10 requests per user per day
    const oneDayMs = 24 * 60 * 60 * 1000;
    const rateLimit = await checkIdentifierRateLimit(user.id, 'ai-coach', 10, oneDayMs);
    
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Try again tomorrow.',
        remaining: rateLimit.remaining,
      });
    }

    // Validate request body
    const body = req.body as CoachRequestBody;
    if (!body || typeof body.ytdIncome !== 'number') {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Check for Anthropic API key
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      console.error('[AI Coach] ANTHROPIC_API_KEY not configured');
      return res.status(200).json({ 
        tip: "Set up a separate bank account named 'Tax Money' and transfer your tax allocation every time you get paid.",
        fallback: true,
      });
    }

    // Build the user prompt
    const userPrompt = buildUserPrompt(body);

    // Call Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 200,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AI Coach] Anthropic API error:', response.status, errorText);
      throw new Error('Anthropic API request failed');
    }

    const data = await response.json();
    const tip = data.content?.[0]?.text || FALLBACK_TIP;

    return res.status(200).json({ 
      tip,
      fallback: false,
      remaining: rateLimit.remaining,
    });

  } catch (error) {
    console.error('[AI Coach] Error:', error);
    return res.status(200).json({ 
      tip: FALLBACK_TIP,
      fallback: true,
    });
  }
}

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
- Do not mention competitors or other apps`;

const FALLBACK_TIP = "Set up a separate bank account named 'Tax Money' and transfer your tax allocation every time you get paid.";

function buildUserPrompt(body: CoachRequestBody): string {
  const {
    ytdIncome,
    taxBucketBalance,
    estimatedTaxOwed,
    retirementBalance,
    retirementPercentage,
    emergencyBalance,
    emergencyGoal,
    debtBalance,
    debtName,
    nextQuarterlyDate,
    daysUntilQuarterly,
    gigCount,
    avgGigAmount,
  } = body;

  let prompt = `My financial data:
- YTD gig income: $${ytdIncome.toFixed(2)}
- Tax bucket: $${taxBucketBalance.toFixed(2)} set aside (estimated owed: $${estimatedTaxOwed.toFixed(2)})
- Retirement: $${retirementBalance.toFixed(2)} saved this year (${retirementPercentage.toFixed(1)}% of income)
- Emergency fund: $${emergencyBalance.toFixed(2)} of $${emergencyGoal.toFixed(2)} goal (${((emergencyBalance / emergencyGoal) * 100).toFixed(0)}% complete)`;

  if (debtBalance && debtName) {
    prompt += `\n- Debt payoff: $${debtBalance.toFixed(2)} applied to ${debtName}`;
  }

  prompt += `\n- Next quarterly tax payment: ${nextQuarterlyDate} (${daysUntilQuarterly} days away)
- I have ${gigCount} paid gigs averaging $${avgGigAmount.toFixed(2)} each

What is the one most important financial action I should focus on right now?`;

  return prompt;
}
