import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { invoiceId, token } = req.body ?? {};

  if (!invoiceId || !token) {
    return res.status(400).json({ error: 'invoiceId and token are required' });
  }

  try {
    const supabase = createServiceClient();

    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('id, status, viewed_at')
      .eq('id', invoiceId)
      .eq('public_token', token)
      .single();

    if (fetchError || !invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    if (invoice.viewed_at) {
      return res.status(200).json({ ok: true, viewed_at: invoice.viewed_at });
    }

    const nextStatus = invoice.status === 'sent' ? 'viewed' : invoice.status;
    const viewedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('invoices')
      .update({
        status: nextStatus,
        viewed_at: viewedAt,
      })
      .eq('id', invoiceId)
      .eq('public_token', token);

    if (updateError) {
      throw updateError;
    }

    return res.status(200).json({ ok: true, viewed_at: viewedAt });
  } catch (error) {
    console.error('[public-invoice-viewed] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
