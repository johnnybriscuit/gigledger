import { describe, expect, it } from 'vitest';
import {
  GOLDEN_EXPECTED,
  GOLDEN_GIGS,
  validateGoldenDataset,
} from './fixtures/taxTreatmentGoldenDataset';

describe('Export Tax Treatment', () => {
  it('keeps the golden dataset internally consistent', () => {
    const validation = validateGoldenDataset();

    expect(validation.valid).toBe(true);
    expect(validation.errors).toEqual([]);
    expect(GOLDEN_GIGS).toHaveLength(GOLDEN_EXPECTED.totalGigs);
    expect(GOLDEN_EXPECTED.contractor1099Income + GOLDEN_EXPECTED.w2Income).toBe(
      GOLDEN_EXPECTED.totalIncome
    );
  });
});
