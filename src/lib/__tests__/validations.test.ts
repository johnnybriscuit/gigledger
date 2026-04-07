import { describe, expect, it } from 'vitest';
import { gigSchema } from '../validations';

describe('gigSchema', () => {
  it('allows a negative net amount when deductions exceed income', () => {
    const result = gigSchema.parse({
      payer_id: '11111111-1111-1111-1111-111111111111',
      date: '2026-04-07',
      title: 'Loss leader gig',
      gross_amount: 150,
      tips: 0,
      fees: 50,
      per_diem: 0,
      other_income: 0,
      net_amount: -25,
      paid: false,
      taxes_withheld: false,
    });

    expect(result.net_amount).toBe(-25);
  });

  it('still rejects a negative gross amount', () => {
    expect(() =>
      gigSchema.parse({
        payer_id: '11111111-1111-1111-1111-111111111111',
        date: '2026-04-07',
        title: 'Invalid gross',
        gross_amount: -1,
        tips: 0,
        fees: 0,
        per_diem: 0,
        other_income: 0,
        net_amount: -1,
        paid: false,
        taxes_withheld: false,
      })
    ).toThrow();
  });
});
