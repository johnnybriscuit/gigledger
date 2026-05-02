import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subcontractorId, taxYear } = await req.json()

    // Create Supabase client with service role key for full access
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get authenticated user from request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Not authenticated')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Invalid authentication')
    }

    // Fetch subcontractor 1099 total from view
    const { data: subcontractor, error: fetchError } = await supabaseClient
      .from('subcontractor_1099_totals')
      .select('*')
      .eq('subcontractor_id', subcontractorId)
      .eq('tax_year', taxYear)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !subcontractor) {
      throw new Error('Subcontractor 1099 data not found')
    }

    // Verify e-delivery consent
    if (!subcontractor.edelivery_consent) {
      throw new Error('E-delivery consent required')
    }

    // Get email address
    const recipientEmail = subcontractor.edelivery_email || subcontractor.email
    if (!recipientEmail) {
      throw new Error('No email address available')
    }

    // Fetch user's profile/settings for payer info
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Generate 1099 prep summary HTML
    const emailHtml = generate1099EmailHTML(subcontractor, profile, taxYear)

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendDomain = Deno.env.get('RESEND_DOMAIN') || 'resend.dev'

    if (!resendApiKey) {
      console.log('No Resend API key configured')
      throw new Error('Email service not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Bozzy <1099@${resendDomain}>`,
        to: recipientEmail,
        subject: `Your 1099-NEC Preparation Summary for ${taxYear}`,
        html: emailHtml,
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    // Log delivery in database
    await supabaseClient.from('subcontractor_1099_deliveries').insert({
      user_id: user.id,
      subcontractor_id: subcontractorId,
      tax_year: taxYear,
      amount: subcontractor.total_paid,
      recipient_email: recipientEmail,
      delivery_method: 'email',
    })

    // Update last sent timestamp
    await supabaseClient
      .from('subcontractors')
      .update({ last_1099_email_sent_at: new Date().toISOString() })
      .eq('id', subcontractorId)
      .eq('user_id', user.id)

    return new Response(
      JSON.stringify({ success: true, message: '1099 email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending 1099 email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function generate1099EmailHTML(subcontractor: any, profile: any, taxYear: number): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const legalName = subcontractor.legal_name || subcontractor.name
  const payerName = profile?.business_name || profile?.full_name || 'Your Payer'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #f59e0b; }
        .title { font-size: 24px; font-weight: bold; color: #f59e0b; margin-bottom: 10px; }
        .subtitle { color: #6b7280; }
        .disclaimer { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .disclaimer-text { color: #92400e; font-weight: 600; margin: 0; }
        .section { margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px; }
        .section-title { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 15px; }
        .info-row { display: flex; justify-content: space-between; margin: 10px 0; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .label { font-weight: 600; color: #4b5563; }
        .value { color: #111827; }
        .amount-box { background: #eff6ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
        .amount-label { font-size: 14px; color: #1e40af; font-weight: 600; margin-bottom: 5px; }
        .amount-value { font-size: 32px; font-weight: bold; color: #1e40af; }
        .summary { background: #ffffff; padding: 15px; border-radius: 6px; margin: 15px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
        .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">1099-NEC Preparation Summary</div>
        <div class="subtitle">Tax Year ${taxYear}</div>
      </div>

      <div class="disclaimer">
        <p class="disclaimer-text">⚠️ IMPORTANT: This is NOT an official IRS Form 1099-NEC</p>
        <p style="margin: 5px 0 0 0; font-size: 14px; color: #92400e;">
          This is a preparation summary for your records. Your payer will file the official form with the IRS.
        </p>
      </div>

      <p>Hello ${legalName},</p>
      <p>This is a summary of payments you received from <strong>${payerName}</strong> during the ${taxYear} tax year. This information will be used to prepare your Form 1099-NEC.</p>

      <div class="amount-box">
        <div class="amount-label">Box 1: Nonemployee Compensation</div>
        <div class="amount-value">${formatCurrency(subcontractor.total_paid)}</div>
      </div>

      <div class="section">
        <div class="section-title">Recipient Information</div>
        <div class="info-row">
          <span class="label">Name:</span>
          <span class="value">${legalName}</span>
        </div>
        ${subcontractor.address_line1 ? `
          <div class="info-row">
            <span class="label">Address:</span>
            <span class="value">
              ${subcontractor.address_line1}${subcontractor.address_line2 ? ', ' + subcontractor.address_line2 : ''}<br>
              ${subcontractor.city}, ${subcontractor.state} ${subcontractor.postal_code}
            </span>
          </div>
        ` : ''}
        ${subcontractor.tax_id_last4 ? `
          <div class="info-row">
            <span class="label">TIN (last 4):</span>
            <span class="value">****${subcontractor.tax_id_last4}</span>
          </div>
        ` : ''}
      </div>

      <div class="section">
        <div class="section-title">Payment Summary</div>
        <div class="summary">
          <div class="info-row">
            <span class="label">Number of Gigs:</span>
            <span class="value">${subcontractor.gig_count}</span>
          </div>
          <div class="info-row">
            <span class="label">Total Paid:</span>
            <span class="value">${formatCurrency(subcontractor.total_paid)}</span>
          </div>
          <div class="info-row">
            <span class="label">Requires 1099-NEC:</span>
            <span class="value">${subcontractor.requires_1099 ? 'Yes (≥ $600)' : 'No (< $600)'}</span>
          </div>
        </div>
      </div>

      <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #111827;">What You Need to Do</h3>
        <ol style="margin: 0; padding-left: 20px;">
          <li style="margin-bottom: 10px;">Review this information for accuracy</li>
          <li style="margin-bottom: 10px;">Keep this summary for your tax records</li>
          <li style="margin-bottom: 10px;">Report this income on your tax return (Schedule C if self-employed)</li>
          <li style="margin-bottom: 10px;">Contact ${payerName} if you notice any discrepancies</li>
        </ol>
      </div>

      <div style="background: #eff6ff; padding: 15px; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; font-size: 14px; color: #1e40af;">
          <strong>Note:</strong> The official Form 1099-NEC will be filed with the IRS by ${payerName} and a copy will be provided to you by January 31st of the following year.
        </p>
      </div>

      <div class="footer">
        <p>This email was sent via Bozzy</p>
        <p>Questions? Reply to this email or contact ${payerName} directly.</p>
        <p style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
          You received this email because you consented to electronic delivery of 1099 forms.
        </p>
      </div>
    </body>
    </html>
  `
}
