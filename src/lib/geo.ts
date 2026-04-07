/**
 * Geolocation and distance calculation utilities
 * Supports routed-distance providers only.
 */

import { getBaseUrl } from './getBaseUrl';

export interface LatLng {
  lat: number;
  lng: number;
}

export type DistanceProvider = 'google' | 'mapbox' | 'haversine';

export interface DistanceResult {
  miles: number;
  provider: DistanceProvider;
}

/**
 * Calculate driving distance between two points
 * Uses provider pipeline: server-side Google route proxy → Mapbox
 * Throws when no routed driving distance is available.
 */
export async function drivingMiles(
  origin: LatLng,
  dest: LatLng
): Promise<DistanceResult> {
  // Prefer the server-side proxy so routed mileage does not depend on exposed client keys.
  try {
    const result = await googleDistanceMatrixViaProxy(origin, dest);
    if (result !== null) {
      return { miles: result, provider: 'google' };
    }
  } catch (err) {
    console.warn('Google Distance Matrix proxy failed, trying fallback:', err);
  }

  // Try Mapbox Directions API
  const mapboxToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  if (mapboxToken) {
    try {
      const result = await mapboxDirections(origin, dest, mapboxToken);
      if (result !== null) {
        return { miles: result, provider: 'mapbox' };
      }
    } catch (err) {
      console.warn('Mapbox Directions failed:', err);
    }
  }

  throw new Error('NO_DRIVING_ROUTE');
}

/**
 * Google Maps Distance Matrix API via same-origin/server-side proxy.
 * Returns driving distance in miles, or null if unavailable
 */
async function googleDistanceMatrixViaProxy(origin: LatLng, dest: LatLng): Promise<number | null> {
  const isWeb = typeof window !== 'undefined' && Boolean(window.location?.origin);
  const url = new URL('/api/distance', isWeb ? window.location.origin : getBaseUrl());
  url.searchParams.set('origin_lat', String(origin.lat));
  url.searchParams.set('origin_lng', String(origin.lng));
  url.searchParams.set('destination_lat', String(dest.lat));
  url.searchParams.set('destination_lng', String(dest.lng));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google proxy error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK') {
    console.warn('Google Distance Matrix proxy status:', data.status);
    return null;
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (element?.status !== 'OK') {
    console.warn('Google Distance Matrix proxy element status:', element?.status);
    return null;
  }

  // Distance is in meters, convert to miles
  const meters = element.distance?.value;
  if (typeof meters !== 'number') {
    return null;
  }

  return meters * 0.000621371; // meters to miles
}

/**
 * Mapbox Directions API
 * Returns driving distance in miles, or null if unavailable
 */
async function mapboxDirections(
  origin: LatLng,
  dest: LatLng,
  token: string
): Promise<number | null> {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}`;
  const params = new URLSearchParams({
    access_token: token,
    geometries: 'geojson',
  });

  const response = await fetch(`${url}?${params}`);
  if (!response.ok) {
    throw new Error(`Mapbox API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
    console.warn('Mapbox Directions returned no routes');
    return null;
  }

  // Distance is in meters
  const meters = data.routes[0].distance;
  if (typeof meters !== 'number') {
    return null;
  }

  return meters * 0.000621371; // meters to miles
}

/**
 * Format provider name for display
 */
export function formatProvider(provider: DistanceProvider): string {
  switch (provider) {
    case 'google':
      return 'Google Maps';
    case 'mapbox':
      return 'Mapbox';
    case 'haversine':
      return 'Haversine (straight-line)';
  }
}
