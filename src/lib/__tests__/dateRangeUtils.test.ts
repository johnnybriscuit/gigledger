import { describe, expect, it } from 'vitest';
import { filterByDateRange } from '../dateRangeUtils';
import { parseStoredDate } from '../date';

describe('dateRangeUtils', () => {
  it('treats stored yyyy-MM-dd values as local calendar dates', () => {
    const parsed = parseStoredDate('2025-01-15');
    expect(parsed.getFullYear()).toBe(2025);
    expect(parsed.getMonth()).toBe(0);
    expect(parsed.getDate()).toBe(15);
  });

  it('includes entries on the custom end date', () => {
    const items = [
      { id: 'a', date: '2025-01-01' },
      { id: 'b', date: '2025-01-31' },
    ];

    const filtered = filterByDateRange(
      items,
      parseStoredDate('2025-01-01'),
      parseStoredDate('2025-01-31')
    );

    expect(filtered.map((item) => item.id)).toEqual(['a', 'b']);
  });
});
