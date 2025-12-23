import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { invoiceId, recipientEmail, message, userId } = req.body;

    if (!invoiceId || !recipientEmail || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        line_items:invoice_line_items(*)
      `)
      .eq('id', invoiceId)
      .eq('user_id', userId)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const { data: settings, error: settingsError } = await supabase
      .from('invoice_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsError || !settings) {
      return res.status(404).json({ error: 'Invoice settings not found' });
    }

    const invoiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invoices/view/${invoice.id}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .invoice-details {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-label {
      font-weight: 600;
      color: #6b7280;
    }
    .detail-value {
      color: #111827;
    }
    .total {
      font-size: 24px;
      font-weight: 700;
      color: #2563eb;
    }
    .button {
      display: inline-block;
      background-color: #2563eb;
      color: white;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Invoice from ${settings.business_name}</h1>
  </div>
  
  <div class="content">
    ${message ? `<p>${message}</p>` : ''}
    
    <div class="invoice-details">
      <div class="detail-row">
        <span class="detail-label">Invoice Number:</span>
        <span class="detail-value">${invoice.invoice_number}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Invoice Date:</span>
        <span class="detail-value">${new Date(invoice.invoice_date).toLocaleDateString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Due Date:</span>
        <span class="detail-value">${new Date(invoice.due_date).toLocaleDateString()}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount Due:</span>
        <span class="detail-value total">$${invoice.total_amount.toFixed(2)}</span>
      </div>
    </div>
    
    <div style="text-align: center;">
      <a href="${invoiceUrl}" class="button">View Invoice</a>
    </div>
    
    <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
      Click the button above to view your invoice online. You can also download a PDF copy.
    </p>
  </div>
  
  <div class="footer">
    <p>${settings.business_name}</p>
    ${settings.email ? `<p>${settings.email}</p>` : ''}
    ${settings.phone ? `<p>${settings.phone}</p>` : ''}
  </div>
</body>
</html>
    `;

    // Use Resend API if configured
    if (process.env.RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `${settings.business_name} via GigLedger <invoices@${process.env.RESEND_DOMAIN || 'resend.dev'}>`,
          reply_to: settings.email, // Client replies go directly to the user
          to: recipientEmail,
          subject: `Invoice ${invoice.invoice_number} from ${settings.business_name}`,
          html: emailHtml,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email via Resend');
      }
    } else {
      // Fallback: Log email (for development)
      console.log('Email would be sent to:', recipientEmail);
      console.log('Email HTML:', emailHtml);
    }

    // Update invoice status to 'sent'
    await supabase
      .from('invoices')
      .update({ 
        status: 'sent', 
        sent_at: new Date().toISOString() 
      })
      .eq('id', invoiceId)
      .eq('user_id', userId);

    return res.status(200).json({ 
      success: true, 
      message: 'Invoice sent successfully',
      invoiceUrl 
    });

  } catch (error) {
    console.error('Error sending invoice:', error);
    return res.status(500).json({ error: 'Failed to send invoice' });
  }
}
