import { describe, expect, it } from 'vitest';
import {
  buildAutoCalculatedInlineMileage,
  inferStoredMileageAutoCalculated,
  inferStoredMileageRoundTrip,
  syncAutoCalculatedInlineMileageRoundTrip,
} from '../inlineMileage';

describe('inline mileage helpers', () => {
  it('builds a normalized one-way auto-calculated payload', () => {
    expect(
      buildAutoCalculatedInlineMileage({
        oneWayMiles: 12.3456,
        provider: 'google',
        startLocation: 'Home Base',
        endLocation: 'Bluebird Cafe',
        venueAddress: 'Bluebird Cafe, Nashville, TN',
        roundTrip: false,
      })
    ).toEqual({
      miles: '12.3',
      note: 'Calculated via Google Maps',
      startLocation: 'Home Base',
      endLocation: 'Bluebird Cafe',
      venueAddress: 'Bluebird Cafe, Nashville, TN',
      roundTrip: false,
      isAutoCalculated: true,
      oneWayMiles: '12.346',
    });
  });

  it('doubles normalized miles and note text for round trips', () => {
    expect(
      buildAutoCalculatedInlineMileage({
        oneWayMiles: 18.25,
        provider: 'mapbox',
        startLocation: 'Home',
        endLocation: 'Venue',
        roundTrip: true,
      })
    ).toMatchObject({
      miles: '36.5',
      note: 'Calculated via Mapbox (round trip)',
      roundTrip: true,
      isAutoCalculated: true,
      oneWayMiles: '18.250',
    });
  });

  it('reuses stored one-way miles when the round-trip toggle changes later', () => {
    const oneWayMileage = buildAutoCalculatedInlineMileage({
      oneWayMiles: 21.5,
      provider: 'google',
      startLocation: 'Home',
      endLocation: 'Venue',
      roundTrip: false,
    });

    const roundTripMileage = syncAutoCalculatedInlineMileageRoundTrip(oneWayMileage, true);

    expect(roundTripMileage.miles).toBe('43.0');
    expect(roundTripMileage.note).toBe('Calculated via Google Maps (round trip)');
    expect(roundTripMileage.roundTrip).toBe(true);
    expect(roundTripMileage.oneWayMiles).toBe('21.500');
  });

  it('infers round-trip state from persisted notes when the DB flag is missing', () => {
    expect(
      inferStoredMileageRoundTrip({
        is_round_trip: null,
        notes: 'Calculated via Google Maps (round trip)',
      })
    ).toBe(true);

    expect(
      inferStoredMileageRoundTrip({
        is_round_trip: null,
        notes: 'Calculated via Google Maps',
      })
    ).toBe(false);
  });

  it('infers auto-calculated state from persisted notes when the DB flag is missing', () => {
    expect(
      inferStoredMileageAutoCalculated({
        is_auto_calculated: null,
        notes: 'Calculated via Mapbox (round trip)',
      })
    ).toBe(true);

    expect(
      inferStoredMileageAutoCalculated({
        is_auto_calculated: null,
        notes: 'Manual venue parking lot estimate',
      })
    ).toBe(false);
  });
});
