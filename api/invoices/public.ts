import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import type { PublicInvoicePayload } from '../../src/types/invoice';

function createServiceClient() {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Server configuration error');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function sendNoStore(res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json');
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  sendNoStore(res);

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const invoiceId = typeof req.query.invoiceId === 'string' ? req.query.invoiceId : '';
  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (!invoiceId || !token) {
    return res.status(400).json({ error: 'invoiceId and token are required' });
  }

  try {
    const supabase = createServiceClient();

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        user_id,
        client_name,
        client_company,
        client_email,
        client_address,
        invoice_number,
        invoice_date,
        due_date,
        status,
        subtotal,
        tax_rate,
        tax_amount,
        discount_amount,
        total_amount,
        currency,
        payment_terms,
        notes,
        accepted_payment_methods,
        sent_at,
        viewed_at,
        paid_at,
        public_token,
        invoice_line_items(id, description, quantity, rate, amount, sort_order),
        invoice_payments(id, payment_date, amount, payment_method, reference_number)
      `)
      .eq('id', invoiceId)
      .eq('public_token', token)
      .single();

    if (invoiceError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    let invoiceStatus = invoice.status;
    let invoiceViewedAt = invoice.viewed_at;

    if (invoice.status === 'sent' && !invoice.viewed_at) {
      const viewedAt = new Date().toISOString();
      const { error: viewedUpdateError } = await supabase
        .from('invoices')
        .update({
          status: 'viewed',
          viewed_at: viewedAt,
        })
        .eq('id', invoice.id)
        .eq('public_token', token);

      if (!viewedUpdateError) {
        invoiceStatus = 'viewed';
        invoiceViewedAt = viewedAt;
      } else {
        console.warn('[public-invoice] Failed to mark invoice as viewed:', viewedUpdateError);
      }
    }

    const { data: settings, error: settingsError } = await supabase
      .from('invoice_settings')
      .select(`
        business_name,
        email,
        phone,
        address,
        website,
        logo_url,
        default_currency,
        color_scheme,
        font_style,
        layout_style,
        accepted_payment_methods,
        payment_methods_config
      `)
      .eq('user_id', invoice.user_id)
      .single();

    if (settingsError || !settings) {
      return res.status(404).json({ error: 'Invoice settings not found' });
    }

    const payments = invoice.invoice_payments ?? [];
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount ?? 0), 0);

    const payload: PublicInvoicePayload = {
      invoice: {
        id: invoice.id,
        client_name: invoice.client_name,
        client_company: invoice.client_company,
        client_email: invoice.client_email,
        client_address: invoice.client_address,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        status: invoiceStatus as PublicInvoicePayload['invoice']['status'],
        subtotal: Number(invoice.subtotal ?? 0),
        tax_rate: invoice.tax_rate === null ? undefined : Number(invoice.tax_rate),
        tax_amount: invoice.tax_amount === null ? undefined : Number(invoice.tax_amount),
        discount_amount: invoice.discount_amount === null ? undefined : Number(invoice.discount_amount),
        total_amount: Number(invoice.total_amount ?? 0),
        currency: invoice.currency,
        payment_terms: invoice.payment_terms ?? undefined,
        notes: invoice.notes ?? undefined,
        accepted_payment_methods: (invoice.accepted_payment_methods as PublicInvoicePayload['invoice']['accepted_payment_methods']) ?? [],
        sent_at: invoice.sent_at ?? undefined,
        viewed_at: invoiceViewedAt ?? undefined,
        paid_at: invoice.paid_at ?? undefined,
        line_items: (invoice.invoice_line_items ?? [])
          .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
          .map((item) => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity ?? 0),
          rate: Number(item.rate ?? 0),
          amount: Number(item.amount ?? 0),
          sort_order: item.sort_order,
        })),
        payments: [...payments]
          .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
          .map((payment) => ({
          id: payment.id,
          payment_date: payment.payment_date,
          amount: Number(payment.amount ?? 0),
          payment_method: payment.payment_method,
          reference_number: payment.reference_number ?? undefined,
        })),
        total_paid: totalPaid,
        balance_due: Math.max(0, Number(invoice.total_amount ?? 0) - totalPaid),
      },
      settings: {
        business_name: settings.business_name,
        email: settings.email,
        phone: settings.phone ?? undefined,
        address: settings.address ?? undefined,
        website: settings.website ?? undefined,
        logo_url: settings.logo_url ?? undefined,
        default_currency: settings.default_currency,
        color_scheme: settings.color_scheme,
        font_style: settings.font_style,
        layout_style: settings.layout_style,
        accepted_payment_methods: (settings.accepted_payment_methods as PublicInvoicePayload['settings']['accepted_payment_methods']) ?? [],
        payment_methods_config: settings.payment_methods_config ?? undefined,
      },
    };

    return res.status(200).json(payload);
  } catch (error) {
    console.error('[public-invoice] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
