import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {},
    },
  },
}));

describe('resolveAddressDetails', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('normalizes geocoded address details returned from the proxy', async () => {
    const { resolveAddressDetails } = await import('../placeDetails');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        place_id: 'place-123',
        formatted_address: '123 Main St, Austin, TX 78701, USA',
        location: { lat: 30.2672, lng: -97.7431 },
        parts: {
          city: 'Austin',
          state: 'TX',
          country: 'US',
        },
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveAddressDetails('123 Main St, Austin, TX');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      place_id: 'place-123',
      name: '',
      formatted_address: '123 Main St, Austin, TX 78701, USA',
      location: { lat: 30.2672, lng: -97.7431 },
      parts: {
        city: 'Austin',
        state: 'TX',
        country: 'US',
      },
    });
  });
});
