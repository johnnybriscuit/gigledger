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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = typeof req.query.token === 'string' ? req.query.token : '';

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const supabase = createServiceClient();

    const { data: shareLink, error: linkError } = await supabase
      .from('shared_schedule_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .single();

    if (linkError || !shareLink) {
      return res.status(404).json({ error: 'Share link not found' });
    }

    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    const today = new Date().toISOString().slice(0, 10);

    const endDate = shareLink.share_window_days
      ? new Date(
          Date.now() + shareLink.share_window_days * 24 * 60 * 60 * 1000
        ).toISOString().slice(0, 10)
      : null;

    let gigsQuery = supabase
      .from('gigs')
      .select(`
        id,
        date,
        title,
        location,
        city,
        state,
        net_amount,
        gross_amount,
        paid,
        booking_status,
        payer:payers(name)
      `)
      .eq('user_id', shareLink.user_id)
      .gte('date', today)
      .order('date', { ascending: true });

    if (endDate) {
      gigsQuery = gigsQuery.lte('date', endDate);
    }

    const { data: gigsRaw, error: gigsError } = await gigsQuery;

    if (gigsError) {
      console.error('[share/token] gigs query error:', gigsError);
      return res.status(500).json({ error: 'Internal server error' });
    }

    const gigs = (gigsRaw ?? []).map((g: any) => {
      const payerName = Array.isArray(g.payer)
        ? (g.payer[0]?.name ?? null)
        : (g.payer?.name ?? null);

      return {
        id: g.id,
        date: g.date,
        title: g.title,
        venue: shareLink.show_venues ? (g.location ?? null) : null,
        city: shareLink.show_venues ? (g.city ?? null) : null,
        state: shareLink.show_venues ? (g.state ?? null) : null,
        amount: shareLink.show_amounts ? (Number(g.net_amount) ?? null) : null,
        grossAmount: shareLink.show_amounts ? (Number(g.gross_amount) ?? null) : null,
        status: g.paid ? 'paid' : 'unpaid',
        bookingStatus: (g.booking_status ?? 'confirmed') as 'tentative' | 'confirmed',
        payerName,
      };
    });

    const monthlyTotals: Record<string, number> = shareLink.show_amounts
      ? gigs.reduce((acc: Record<string, number>, g: any) => {
          const month = g.date.slice(0, 7);
          acc[month] = (acc[month] ?? 0) + (g.amount ?? 0);
          return acc;
        }, {})
      : {};

    const monthlyConfirmed: Record<string, number> = shareLink.show_amounts
      ? gigs.filter((g: any) => g.bookingStatus === 'confirmed').reduce((acc: Record<string, number>, g: any) => {
          const month = g.date.slice(0, 7);
          acc[month] = (acc[month] ?? 0) + (g.amount ?? 0);
          return acc;
        }, {})
      : {};

    const monthlyTentative: Record<string, number> = shareLink.show_amounts
      ? gigs.filter((g: any) => g.bookingStatus === 'tentative').reduce((acc: Record<string, number>, g: any) => {
          const month = g.date.slice(0, 7);
          acc[month] = (acc[month] ?? 0) + (g.amount ?? 0);
          return acc;
        }, {})
      : {};

    await supabase
      .from('shared_schedule_links')
      .update({
        last_accessed: new Date().toISOString(),
        access_count: (shareLink.access_count ?? 0) + 1,
      })
      .eq('id', shareLink.id);

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', shareLink.user_id)
      .single();

    const displayName =
      shareLink.display_name ||
      profile?.full_name ||
      'Shared';

    return res.status(200).json({
      displayName,
      showAmounts: shareLink.show_amounts,
      showVenues: shareLink.show_venues,
      shareWindowDays: shareLink.share_window_days ?? 90,
      gigs,
      monthlyTotals,
      monthlyConfirmed,
      monthlyTentative,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[share/token] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
