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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Validate caller identity with anon client
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

    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser()
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

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

    if (invoice.user_id !== authUser.id) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
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

    const publicToken = invoice.public_token ?? crypto.randomUUID().replace(/-/g, '')

    if (!invoice.public_token) {
      const { error: tokenError } = await supabaseClient
        .from('invoices')
        .update({ public_token: publicToken })
        .eq('id', invoiceId)

      if (tokenError) {
        throw tokenError
      }
    }

    // Generate invoice HTML
    const invoiceHtml = generateInvoiceHTML(
      { ...invoice, public_token: publicToken },
      settings,
      message
    )

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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

// Helper to format payment methods for display
function formatPaymentMethodsForEmail(config: any, invoiceNumber: string): string {
  if (!config || !config.methods || config.methods.length === 0) {
    return '';
  }

  const esc = (text: unknown) =>
    String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

  const safeUrl = (raw: unknown) => {
    const value = String(raw ?? '').trim();
    if (!value) return '#';
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return esc(value);
    }
    return '#';
  }

  const displays: string[] = [];
  const defaultNote = `Invoice #${invoiceNumber}`;

  for (const method of config.methods) {
    if (!method.enabled) continue;

    switch (method.type) {
      case 'cash':
        displays.push(`<strong>Cash:</strong> ${esc(method.instructions || 'Cash accepted in person.')}`);
        break;
      case 'check':
        const checkParts = [`Check payable to: ${esc(method.payableTo)}`];
        if (method.memo) checkParts.push(`Memo: ${esc(method.memo)}`);
        else if (invoiceNumber) checkParts.push(`Memo: ${esc(invoiceNumber)}`);
        if (method.mailingAddress) checkParts.push(`Mail to: ${esc(method.mailingAddress)}`);
        displays.push(`<strong>Check:</strong> ${checkParts.join(' • ')}`);
        break;
      case 'venmo':
        displays.push(`<strong>Venmo:</strong> ${esc(method.handle)} • Note: ${esc(method.note || defaultNote)}`);
        break;
      case 'zelle':
        displays.push(`<strong>Zelle:</strong> ${esc(method.contact)} • Note: ${esc(method.note || defaultNote)}`);
        break;
      case 'paypal':
        displays.push(`<strong>PayPal:</strong> ${esc(method.contact)} • Note: ${esc(method.note || defaultNote)}`);
        break;
      case 'cashapp':
        displays.push(`<strong>Cash App:</strong> ${esc(method.cashtag)} • Note: ${esc(method.note || defaultNote)}`);
        break;
      case 'wire':
        if (method.includeBankDetailsOnInvoice && (method.accountHolder || method.bankName)) {
          const wireParts = [];
          if (method.accountHolder) wireParts.push(`Account Holder: ${esc(method.accountHolder)}`);
          if (method.bankName) wireParts.push(`Bank: ${esc(method.bankName)}`);
          if (method.routingNumber) wireParts.push(`Routing: ${esc(method.routingNumber)}`);
          if (method.accountNumber) {
            const masked = method.accountNumber.length > 4 ? '****' + method.accountNumber.slice(-4) : method.accountNumber;
            wireParts.push(`Account: ${esc(masked)}`);
          }
          if (method.swift) wireParts.push(`SWIFT: ${esc(method.swift)}`);
          if (method.reference) wireParts.push(`Reference: ${esc(method.reference)}`);
          else if (invoiceNumber) wireParts.push(`Reference: ${esc(invoiceNumber)}`);
          displays.push(`<strong>Wire Transfer:</strong> ${wireParts.join(' • ')}`);
        } else {
          displays.push(`<strong>Wire Transfer:</strong> ${esc(method.instructions || 'Contact support@bozzygigs.com for wire instructions.')}`);
        }
        break;
      case 'card':
        const paymentUrl = safeUrl(method.paymentUrl);
        const cardParts = [`Pay here: <a href="${paymentUrl}">${paymentUrl}</a>`];
        if (method.acceptedCards) cardParts.push(`Accepted: ${esc(method.acceptedCards)}`);
        if (method.note) cardParts.push(esc(method.note));
        displays.push(`<strong>Credit/Debit Card:</strong> ${cardParts.join(' • ')}`);
        break;
    }
  }

  return displays.join('<br>');
}

function generateInvoiceHTML(invoice: any, settings: any, customMessage: string): string {
  const escapeHtml = (text: string) =>
    text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')

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

  // Format payment methods using structured config
  const paymentMethodsHtml = settings.payment_methods_config 
    ? formatPaymentMethodsForEmail(settings.payment_methods_config, invoice.invoice_number)
    : '';

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
        <div class="company-name">${escapeHtml(settings.business_name || '')}</div>
        ${settings.email ? `<div>${escapeHtml(settings.email)}</div>` : ''}
        ${settings.phone ? `<div>${escapeHtml(settings.phone)}</div>` : ''}
      </div>

      <div class="message">
        ${String(customMessage || '').split('\n').map(line => `<p>${escapeHtml(line)}</p>`).join('')}
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
            <div><strong>${escapeHtml(invoice.client_name || '')}</strong></div>
            ${invoice.client_company ? `<div>${escapeHtml(invoice.client_company)}</div>` : ''}
            ${invoice.client_email ? `<div>${escapeHtml(invoice.client_email)}</div>` : ''}
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
                <td>${escapeHtml(String(item.description || ''))}</td>
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
        <a href="${publicUrl}/invoices/${invoice.id}?token=${invoice.public_token}" class="button">View Invoice Online</a>
      </div>

      ${paymentMethodsHtml ? `
        <div style="margin-top: 30px; padding: 15px; background: #eff6ff; border-radius: 6px; border: 1px solid #bfdbfe;">
          <strong style="color: #1e40af; font-size: 16px;">Payment Methods:</strong>
          <div style="margin-top: 10px; line-height: 1.8;">
            ${paymentMethodsHtml}
          </div>
        </div>
      ` : ''}

      ${invoice.notes ? `
        <div style="margin-top: 30px; padding: 15px; background: #f9fafb; border-radius: 6px;">
          <strong>Notes:</strong>
          <p>${escapeHtml(String(invoice.notes))}</p>
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
