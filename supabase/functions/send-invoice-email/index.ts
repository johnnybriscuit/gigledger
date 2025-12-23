import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invoiceId, recipientEmail, message } = await req.json()

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch invoice with settings
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from('invoices')
      .select('*, invoice_line_items(*)')
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found')
    }

    // Fetch invoice settings
    const { data: settings, error: settingsError } = await supabaseClient
      .from('invoice_settings')
      .select('*')
      .eq('user_id', invoice.user_id)
      .single()

    if (settingsError || !settings) {
      throw new Error('Invoice settings not found')
    }

    // Generate invoice HTML
    const invoiceHtml = generateInvoiceHTML(invoice, settings, message)

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const resendDomain = Deno.env.get('RESEND_DOMAIN') || 'resend.dev'

    if (!resendApiKey) {
      console.log('No Resend API key configured, skipping email send')
      throw new Error('Email service not configured')
    }

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${settings.business_name} via GigLedger <invoices@${resendDomain}>`,
        reply_to: settings.email,
        to: recipientEmail,
        subject: `Invoice ${invoice.invoice_number} from ${settings.business_name}`,
        html: invoiceHtml,
      }),
    })

    if (!emailResponse.ok) {
      const error = await emailResponse.text()
      throw new Error(`Failed to send email: ${error}`)
    }

    // Update invoice status to 'sent'
    await supabaseClient
      .from('invoices')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', invoiceId)

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function generateInvoiceHTML(invoice: any, settings: any, customMessage: string): string {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: settings.default_currency || 'USD'
    }).format(amount)
  }

  const subtotal = invoice.invoice_line_items?.reduce((sum: number, item: any) => 
    sum + (item.quantity * item.rate), 0) || 0
  const tax = invoice.tax_rate ? subtotal * (invoice.tax_rate / 100) : 0
  const total = subtotal + tax - (invoice.discount_amount || 0)

  const publicUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'https://gigledger-ten.vercel.app'

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #2563eb; }
        .company-name { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .message { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .invoice-details { margin: 30px 0; }
        .detail-row { display: flex; justify-content: space-between; margin: 10px 0; }
        .label { font-weight: 600; color: #4b5563; }
        .line-items { margin: 30px 0; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; }
        td { padding: 12px; border-bottom: 1px solid #e5e7eb; }
        .totals { margin-top: 20px; text-align: right; }
        .total-row { display: flex; justify-content: flex-end; gap: 40px; margin: 8px 0; }
        .grand-total { font-size: 18px; font-weight: bold; color: #2563eb; padding-top: 10px; border-top: 2px solid #2563eb; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${settings.business_name}</div>
        ${settings.email ? `<div>${settings.email}</div>` : ''}
        ${settings.phone ? `<div>${settings.phone}</div>` : ''}
      </div>

      <div class="message">
        ${customMessage.split('\n').map(line => `<p>${line}</p>`).join('')}
      </div>

      <div class="invoice-details">
        <h2>Invoice ${invoice.invoice_number}</h2>
        <div class="detail-row">
          <span class="label">Invoice Date:</span>
          <span>${new Date(invoice.invoice_date).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Due Date:</span>
          <span>${new Date(invoice.due_date).toLocaleDateString()}</span>
        </div>
        <div class="detail-row">
          <span class="label">Bill To:</span>
          <div>
            <div><strong>${invoice.client_name}</strong></div>
            ${invoice.client_company ? `<div>${invoice.client_company}</div>` : ''}
            ${invoice.client_email ? `<div>${invoice.client_email}</div>` : ''}
          </div>
        </div>
      </div>

      <div class="line-items">
        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Rate</th>
              <th style="text-align: right;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.invoice_line_items?.map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td style="text-align: right;">${item.quantity}</td>
                <td style="text-align: right;">${formatCurrency(item.rate)}</td>
                <td style="text-align: right;">${formatCurrency(item.quantity * item.rate)}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
      </div>

      <div class="totals">
        <div class="total-row">
          <span class="label">Subtotal:</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${invoice.tax_rate ? `
          <div class="total-row">
            <span class="label">Tax (${invoice.tax_rate}%):</span>
            <span>${formatCurrency(tax)}</span>
          </div>
        ` : ''}
        ${invoice.discount_amount ? `
          <div class="total-row">
            <span class="label">Discount:</span>
            <span>-${formatCurrency(invoice.discount_amount)}</span>
          </div>
        ` : ''}
        <div class="total-row grand-total">
          <span class="label">Total:</span>
          <span>${formatCurrency(total)}</span>
        </div>
      </div>

      <div style="text-align: center;">
        <a href="${publicUrl}/invoices/${invoice.id}" class="button">View Invoice Online</a>
      </div>

      ${invoice.notes ? `
        <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 6px;">
          <strong>Notes:</strong>
          <p>${invoice.notes}</p>
        </div>
      ` : ''}

      <div class="footer">
        <p>This invoice was sent via GigLedger</p>
        <p>If you have any questions, please reply to this email.</p>
      </div>
    </body>
    </html>
  `
}
