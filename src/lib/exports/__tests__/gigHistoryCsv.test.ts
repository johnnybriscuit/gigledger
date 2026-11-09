import { describe, it, expect } from 'vitest';
import { buildGigHistoryCsv } from '../gigHistoryCsv';
import type { GigWithPayer } from '../../../hooks/useGigs';

function makeGig(overrides: Partial<GigWithPayer>): GigWithPayer {
  return {
    id: 'g1',
    user_id: 'u1',
    payer_id: 'p1',
    date: '2026-06-15',
    gross_amount: 500,
    tips: 0,
    per_diem: 0,
    other_income: 0,
    fees: 0,
    net_amount: 500,
    paid: true,
    title: 'Club Gig',
    location: 'The Venue',
    city: 'Nashville',
    state: 'TN',
    state_code: 'TN',
    notes: null,
    booking_status: 'confirmed',
    amount_type: 'gross',
    calendar_event_id: null,
    country: 'US',
    country_code: 'US',
    created_at: '2026-01-01',
    end_time: null,
    import_batch_id: null,
    invoice_link: null,
    net_amount_w2: null,
    payment_method: null,
    start_time: null,
    tax_treatment: null,
    taxes_withheld: null,
    tour_id: null,
    updated_at: '2026-01-01',
    withholding_amount: null,
    payer: { id: 'p1', name: 'Blue Bar', payer_type: 'bar', tax_treatment: 'contractor_1099' },
    ...overrides,
  } as GigWithPayer;
}

const TODAY = '2026-11-09';

describe('buildGigHistoryCsv', () => {
  it('includes paid, unpaid, and upcoming gigs (unlike tax exports)', () => {
    const gigs = [
      makeGig({ id: 'a', date: '2026-06-01', paid: true, gross_amount: 500 }),
      makeGig({ id: 'b', date: '2026-10-01', paid: false, gross_amount: 300 }),
      makeGig({ id: 'c', date: '2026-12-20', paid: false, gross_amount: 800 }),
    ];
    const csv = buildGigHistoryCsv(gigs, { today: TODAY });
    const lines = csv.split('\n');

    expect(csv).toContain('Played & paid');
    expect(csv).toContain('Played & unpaid');
    expect(csv).toContain('Upcoming');
    // all three gigs present
    expect(lines.filter((l) => l.startsWith('2026-'))).toHaveLength(3);
  });

  it('marks played vs upcoming and paid vs unpaid correctly', () => {
    const gigs = [
      makeGig({ id: 'a', date: '2026-01-05', paid: true }),
      makeGig({ id: 'b', date: '2026-01-10', paid: false }),
      makeGig({ id: 'c', date: '2026-12-31', paid: false }),
    ];
    const csv = buildGigHistoryCsv(gigs, { today: TODAY });

    expect(csv).toMatch(/2026-01-05.*Played,Paid/);
    expect(csv).toMatch(/2026-01-10.*Played,Unpaid/);
    expect(csv).toMatch(/2026-12-31.*Upcoming,Unpaid/);
  });

  it('computes total income and net with fees, expenses, and sub payments deducted', () => {
    const gigs = [
      makeGig({
        id: 'a',
        gross_amount: 1000,
        tips: 100,
        per_diem: 50,
        other_income: 25,
        fees: 30,
        expenses: [{ id: 'e1', category: 'Meals', description: 'dinner', amount: 45, notes: null }],
        subcontractor_payments: [{ id: 's1', subcontractor_id: 'sub1', amount: 200, note: null }],
      }),
    ];
    const csv = buildGigHistoryCsv(gigs, { today: TODAY });
    // total_income = 1175, net = 1175 - 30 - 45 - 200 = 900
    expect(csv).toMatch(/1175,30,45,200,900/);
  });

  it('emits summary totals for each bucket', () => {
    const gigs = [
      makeGig({ id: 'a', date: '2026-06-01', paid: true, gross_amount: 500 }),
      makeGig({ id: 'b', date: '2026-10-01', paid: false, gross_amount: 300 }),
      makeGig({ id: 'c', date: '2026-12-20', paid: false, gross_amount: 800 }),
      makeGig({ id: 'd', date: '2026-12-28', paid: true, gross_amount: 400 }),
    ];
    const csv = buildGigHistoryCsv(gigs, { today: TODAY });

    expect(csv).toContain('All gigs,4,2000,2000');
    expect(csv).toContain('Played & paid,1,500,500');
    expect(csv).toContain('Played & unpaid,1,300,300');
    expect(csv).toContain('Upcoming,2,1200,1200');
  });

  it('handles empty gig list', () => {
    const csv = buildGigHistoryCsv([], { today: TODAY });
    expect(csv).toContain('date,gig,payer');
    expect(csv).toContain('All gigs,0,0,0');
  });

  it('escapes commas and quotes in text fields', () => {
    const gigs = [
      makeGig({ title: 'Gig at "Joe\'s", Friday', notes: 'line1\nline2' }),
    ];
    const csv = buildGigHistoryCsv(gigs, { today: TODAY });
    expect(csv).toContain('"Gig at ""Joe\'s"", Friday"');
    expect(csv).toContain('"line1\nline2"');
  });
});
