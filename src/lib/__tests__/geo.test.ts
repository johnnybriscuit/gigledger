import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { drivingMiles } from '../geo';

const ORIGINAL_ENV = { ...process.env };

describe('drivingMiles', () => {
  beforeEach(() => {
    process.env = {
      ...ORIGINAL_ENV,
      EXPO_PUBLIC_SITE_URL: 'https://example.test',
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    process.env = { ...ORIGINAL_ENV };
  });

  it('prefers the Google route proxy for driving mileage', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'OK',
                distance: { value: 16093.4 },
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await drivingMiles(
      { lat: 36.174465, lng: -86.76796 },
      { lat: 36.2067, lng: -86.6922 }
    );

    expect(result.provider).toBe('google');
    expect(result.miles).toBeCloseTo(10, 3);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/distance?');
    expect(String(fetchMock.mock.calls[0][0])).toContain('origin_lat=36.174465');
  });

  it('falls back to Mapbox when the Google route proxy cannot return a route', async () => {
    process.env.EXPO_PUBLIC_MAPBOX_TOKEN = 'mapbox-test-token';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'OK',
          rows: [
            {
              elements: [
                {
                  status: 'ZERO_RESULTS',
                },
              ],
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 'Ok',
          routes: [{ distance: 32186.8 }],
        }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await drivingMiles(
      { lat: 36.174465, lng: -86.76796 },
      { lat: 36.2067, lng: -86.6922 }
    );

    expect(result.provider).toBe('mapbox');
    expect(result.miles).toBeCloseTo(20, 3);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when no routed driving provider can return a route', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'OK',
        rows: [
          {
            elements: [
              {
                status: 'ZERO_RESULTS',
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      drivingMiles(
        { lat: 36.174465, lng: -86.76796 },
        { lat: 36.2067, lng: -86.6922 }
      )
    ).rejects.toThrow('NO_DRIVING_ROUTE');
  });
});
