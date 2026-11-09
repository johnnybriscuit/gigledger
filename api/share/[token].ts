import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { getGigDisplayName } from '../../src/lib/gigDisplayName';

function escapeCsvField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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
  const wantsCsv = req.query.format === 'csv';

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
    const isHistory = shareLink.link_type === 'history';

    // History links share an explicit [start, end] range (past or future).
    // Schedule links share upcoming gigs within a rolling window.
    const selectCols = isHistory
      ? `id, date, title, location, city, state, gross_amount, tips, per_diem,
         other_income, fees, net_amount, paid, booking_status,
         payer:payers(name),
         expenses(amount),
         gig_subcontractor_payments(amount)`
      : `id, date, title, location, city, state, net_amount, gross_amount,
         paid, booking_status, payer:payers(name)`;

    let gigsQuery = supabase
      .from('gigs')
      .select(selectCols)
      .eq('user_id', shareLink.user_id)
      .order('date', { ascending: true });

    let rangeStart: string | null = null;
    let rangeEnd: string | null = null;

    if (isHistory) {
      rangeStart = shareLink.share_start_date;
      rangeEnd = shareLink.share_end_date;
      if (!rangeStart || !rangeEnd) {
        return res.status(500).json({ error: 'Share link misconfigured' });
      }
      gigsQuery = gigsQuery.gte('date', rangeStart).lte('date', rangeEnd);
    } else {
      gigsQuery = gigsQuery.gte('date', today);
      if (shareLink.share_window_days) {
        rangeEnd = new Date(
          Date.now() + shareLink.share_window_days * 24 * 60 * 60 * 1000
        ).toISOString().slice(0, 10);
        gigsQuery = gigsQuery.lte('date', rangeEnd);
      }
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

      const base = {
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

      if (!isHistory) return base;

      // History rows carry the full income breakdown (amounts gated by privacy)
      const gross = (g.gross_amount ?? 0) + (g.tips ?? 0) + (g.per_diem ?? 0) + (g.other_income ?? 0);
      const expenses = (g.expenses ?? []).reduce((s: number, e: any) => s + (e.amount ?? 0), 0);
      const subs = (g.gig_subcontractor_payments ?? []).reduce((s: number, p: any) => s + (p.amount ?? 0), 0);
      const fees = g.fees ?? 0;

      return {
        ...base,
        played: g.date <= today,
        totalIncome: shareLink.show_amounts ? round2(gross) : null,
        fees: shareLink.show_amounts ? round2(fees) : null,
        expenses: shareLink.show_amounts ? round2(expenses) : null,
        subPayments: shareLink.show_amounts ? round2(subs) : null,
        net: shareLink.show_amounts ? round2(gross - fees - expenses - subs) : null,
      };
    });

    // ── CSV download (history links only) ───────────────────────────────
    if (wantsCsv) {
      if (!isHistory) {
        return res.status(400).json({ error: 'CSV export is only available for gig history links' });
      }

      const headers = ['date', 'gig', 'payer'];
      if (shareLink.show_venues) headers.push('venue', 'city', 'state');
      headers.push('status', 'payment_status');
      if (shareLink.show_amounts) {
        headers.push('total_income', 'fees', 'expenses', 'subcontractor_payments', 'net');
      }

      const lines: string[] = [headers.join(',')];
      for (const g of gigs as any[]) {
        const row: any[] = [
          g.date,
          getGigDisplayName({ title: g.title, location: g.venue, payer: { name: g.payerName } }),
          g.payerName ?? '',
        ];
        if (shareLink.show_venues) row.push(g.venue ?? '', g.city ?? '', g.state ?? '');
        row.push(g.played ? 'Played' : 'Upcoming', g.status === 'paid' ? 'Paid' : 'Unpaid');
        if (shareLink.show_amounts) {
          row.push(g.totalIncome, g.fees, g.expenses, g.subPayments, g.net);
        }
        lines.push(row.map(escapeCsvField).join(','));
      }

      // Summary block
      const buckets = { playedPaid: [0, 0], playedUnpaid: [0, 0], upcoming: [0, 0] };
      for (const g of gigs as any[]) {
        const key = !g.played ? 'upcoming' : g.status === 'paid' ? 'playedPaid' : 'playedUnpaid';
        (buckets as any)[key][0] += 1;
        (buckets as any)[key][1] += g.net ?? 0;
      }
      lines.push('');
      lines.push('SUMMARY');
      lines.push(shareLink.show_amounts ? 'category,gig_count,net' : 'category,gig_count');
      const totalCount = buckets.playedPaid[0] + buckets.playedUnpaid[0] + buckets.upcoming[0];
      const totalNet = round2(buckets.playedPaid[1] + buckets.playedUnpaid[1] + buckets.upcoming[1]);
      const pushSummary = (label: string, b: number[]) =>
        lines.push(shareLink.show_amounts ? `${label},${b[0]},${round2(b[1])}` : `${label},${b[0]}`);
      pushSummary('All gigs', [totalCount, totalNet]);
      pushSummary('Played & paid', buckets.playedPaid);
      pushSummary('Played & unpaid', buckets.playedUnpaid);
      pushSummary('Upcoming', buckets.upcoming);

      const filename = `gig_history_${rangeStart}_to_${rangeEnd}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(lines.join('\n'));
    }

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

    if (!isHistory) {
      return res.status(200).json({
        mode: 'schedule',
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
    }

    // History response adds range + played/paid/upcoming totals
    const totals = {
      gigsCount: gigs.length,
      playedPaidCount: (gigs as any[]).filter((g) => g.played && g.status === 'paid').length,
      playedUnpaidCount: (gigs as any[]).filter((g) => g.played && g.status !== 'paid').length,
      upcomingCount: (gigs as any[]).filter((g) => !g.played).length,
      playedPaidNet: shareLink.show_amounts
        ? round2((gigs as any[]).filter((g) => g.played && g.status === 'paid').reduce((s, g) => s + (g.net ?? 0), 0))
        : null,
      playedUnpaidNet: shareLink.show_amounts
        ? round2((gigs as any[]).filter((g) => g.played && g.status !== 'paid').reduce((s, g) => s + (g.net ?? 0), 0))
        : null,
      upcomingNet: shareLink.show_amounts
        ? round2((gigs as any[]).filter((g) => !g.played).reduce((s, g) => s + (g.net ?? 0), 0))
        : null,
    };

    return res.status(200).json({
      mode: 'history',
      displayName,
      showAmounts: shareLink.show_amounts,
      showVenues: shareLink.show_venues,
      rangeStart,
      rangeEnd,
      gigs,
      monthlyTotals,
      monthlyConfirmed,
      monthlyTentative,
      totals,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[share/token] Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
