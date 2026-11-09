/**
 * Gig History CSV export
 *
 * Unlike the tax exports (cash-basis, paid gigs only), this captures EVERY gig
 * in the selected date range — played & paid, played & unpaid, and upcoming —
 * with a totals block at the bottom. Meant for personal income review, not
 * tax filing.
 */

import type { GigWithPayer } from '../../hooks/useGigs';
import { getGigDisplayName } from '../gigDisplayName';
import { roundCents } from './rounding';

type GigHistoryOptions = {
  /** Local date (YYYY-MM-DD) used to split Played vs Upcoming. Defaults to today. */
  today?: string;
};

function localTodayString(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const HEADERS = [
  'date',
  'gig',
  'payer',
  'venue',
  'city',
  'state',
  'status',
  'payment_status',
  'gross_amount',
  'tips',
  'per_diem',
  'other_income',
  'total_income',
  'fees',
  'expenses',
  'subcontractor_payments',
  'net',
  'notes',
] as const;

type BucketKey = 'playedPaid' | 'playedUnpaid' | 'upcoming';

export function buildGigHistoryCsv(
  gigs: GigWithPayer[],
  options: GigHistoryOptions = {}
): string {
  const today = options.today ?? localTodayString();

  const sorted = [...gigs].sort((a, b) => a.date.localeCompare(b.date));

  const totals: Record<BucketKey, { count: number; income: number; net: number }> = {
    playedPaid: { count: 0, income: 0, net: 0 },
    playedUnpaid: { count: 0, income: 0, net: 0 },
    upcoming: { count: 0, income: 0, net: 0 },
  };

  const rows = sorted.map((gig) => {
    const isPlayed = gig.date <= today;
    const isPaid = gig.paid === true;
    const bucket: BucketKey = !isPlayed
      ? 'upcoming'
      : isPaid
      ? 'playedPaid'
      : 'playedUnpaid';

    const gross = gig.gross_amount || 0;
    const tips = gig.tips || 0;
    const perDiem = gig.per_diem || 0;
    const otherIncome = gig.other_income || 0;
    const totalIncome = gross + tips + perDiem + otherIncome;

    const fees = gig.fees || 0;
    const expenses = (gig.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
    const subPayments = (gig.subcontractor_payments || []).reduce(
      (sum, p) => sum + (p.amount || 0),
      0
    );
    const net = totalIncome - fees - expenses - subPayments;

    totals[bucket].count += 1;
    totals[bucket].income = roundCents(totals[bucket].income + totalIncome);
    totals[bucket].net = roundCents(totals[bucket].net + net);

    return {
      date: gig.date,
      gig: getGigDisplayName(gig),
      payer: gig.payer?.name || '',
      venue: gig.location || '',
      city: gig.city || '',
      state: gig.state || gig.state_code || '',
      status: isPlayed ? 'Played' : 'Upcoming',
      payment_status: isPaid ? 'Paid' : 'Unpaid',
      gross_amount: roundCents(gross),
      tips: roundCents(tips),
      per_diem: roundCents(perDiem),
      other_income: roundCents(otherIncome),
      total_income: roundCents(totalIncome),
      fees: roundCents(fees),
      expenses: roundCents(expenses),
      subcontractor_payments: roundCents(subPayments),
      net: roundCents(net),
      notes: gig.notes || '',
    };
  });

  // Header row uses stringifyCsv conventions; data rows are emitted as objects
  // keyed by header name so column order stays aligned.
  const dataRows = rows.map((r) => {
    const out: Record<string, any> = {};
    for (const h of HEADERS) out[h] = r[h as keyof typeof r];
    return out;
  });

  // Build CSV: header + data + blank + summary block.
  const csvLines: string[] = [];
  csvLines.push(HEADERS.join(','));
  for (const r of dataRows) {
    csvLines.push(
      HEADERS.map((h) => escapeField(r[h])).join(',')
    );
  }

  csvLines.push('');
  csvLines.push('SUMMARY');
  csvLines.push('category,gig_count,total_income,net');
  const summaryRows: Array<[string, number, number, number]> = [
    ['All gigs', sorted.length, roundCents(totals.playedPaid.income + totals.playedUnpaid.income + totals.upcoming.income), roundCents(totals.playedPaid.net + totals.playedUnpaid.net + totals.upcoming.net)],
    ['Played & paid', totals.playedPaid.count, totals.playedPaid.income, totals.playedPaid.net],
    ['Played & unpaid', totals.playedUnpaid.count, totals.playedUnpaid.income, totals.playedUnpaid.net],
    ['Upcoming', totals.upcoming.count, totals.upcoming.income, totals.upcoming.net],
  ];
  for (const [label, count, income, net] of summaryRows) {
    csvLines.push(`${escapeField(label)},${count},${income},${net}`);
  }
  csvLines.push('');
  csvLines.push('"net = total income - fees - gig expenses - subcontractor payments. Income is booked/expected regardless of payment status."');

  return csvLines.join('\n');
}

function escapeField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
