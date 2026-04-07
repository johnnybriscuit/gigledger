import { drivingMiles, formatProvider, type DistanceProvider, type LatLng } from '../../lib/geo';

export interface InlineMileage {
  miles: string;
  note?: string;
  venueAddress?: string;
  startLocation?: string;
  endLocation?: string;
  roundTrip?: boolean;
  isAutoCalculated?: boolean;
  oneWayMiles?: string;
}

interface StoredMileageMetadata {
  is_round_trip?: boolean | null;
  is_auto_calculated?: boolean | null;
  notes?: string | null;
}

interface BuildAutoCalculatedInlineMileageInput {
  oneWayMiles: number;
  provider: DistanceProvider;
  startLocation: string;
  endLocation: string;
  venueAddress?: string;
  roundTrip: boolean;
}

interface CalculateInlineMileageInput {
  homeCoordinates: LatLng;
  venueCoordinates: LatLng;
  homeAddress: string;
  venueAddress: string;
  roundTrip: boolean;
}

export function buildAutoCalculatedInlineMileage({
  oneWayMiles,
  provider,
  startLocation,
  endLocation,
  venueAddress,
  roundTrip,
}: BuildAutoCalculatedInlineMileageInput): InlineMileage {
  const normalizedOneWayMiles = Number(oneWayMiles.toFixed(3));
  const baseNote = `Calculated via ${formatProvider(provider)}`;

  return {
    miles: (roundTrip ? normalizedOneWayMiles * 2 : normalizedOneWayMiles).toFixed(1),
    note: `${baseNote}${roundTrip ? ' (round trip)' : ''}`,
    startLocation,
    endLocation,
    venueAddress: venueAddress ?? endLocation,
    roundTrip,
    isAutoCalculated: true,
    oneWayMiles: normalizedOneWayMiles.toFixed(3),
  };
}

export async function calculateInlineMileage({
  homeCoordinates,
  venueCoordinates,
  homeAddress,
  venueAddress,
  roundTrip,
}: CalculateInlineMileageInput): Promise<InlineMileage> {
  const result = await drivingMiles(homeCoordinates, venueCoordinates);

  return buildAutoCalculatedInlineMileage({
    oneWayMiles: result.miles,
    provider: result.provider,
    startLocation: homeAddress,
    endLocation: venueAddress,
    venueAddress,
    roundTrip,
  });
}

export function syncAutoCalculatedInlineMileageRoundTrip(
  mileage: InlineMileage,
  roundTrip: boolean
): InlineMileage {
  const oneWayMiles = Number.parseFloat(mileage.oneWayMiles || mileage.miles || '0');

  if (!mileage.isAutoCalculated || !Number.isFinite(oneWayMiles) || oneWayMiles <= 0) {
    return {
      ...mileage,
      roundTrip,
    };
  }

  const baseNote = mileage.note?.replace(' (round trip)', '') || 'Calculated mileage';

  return {
    ...mileage,
    miles: (roundTrip ? oneWayMiles * 2 : oneWayMiles).toFixed(1),
    roundTrip,
    note: `${baseNote}${roundTrip ? ' (round trip)' : ''}`,
    oneWayMiles: oneWayMiles.toFixed(3),
  };
}

export function inferStoredMileageRoundTrip(mileage: StoredMileageMetadata): boolean {
  if (typeof mileage.is_round_trip === 'boolean') {
    return mileage.is_round_trip;
  }

  return /\(round trip\)/i.test(mileage.notes || '');
}

export function inferStoredMileageAutoCalculated(mileage: StoredMileageMetadata): boolean {
  if (typeof mileage.is_auto_calculated === 'boolean') {
    return mileage.is_auto_calculated;
  }

  return /^Calculated via /i.test(mileage.notes || '');
}
