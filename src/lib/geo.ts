/**
 * Geolocation and distance calculation utilities
 * Supports multiple providers: Google Maps, Mapbox, Haversine fallback
 */

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
 * Uses provider pipeline: Google Maps → Mapbox → Haversine
 */
export async function drivingMiles(
  origin: LatLng,
  dest: LatLng
): Promise<DistanceResult> {
  // Try Google Maps Distance Matrix API
  const googleKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    try {
      const result = await googleDistanceMatrix(origin, dest, googleKey);
      if (result !== null) {
        return { miles: result, provider: 'google' };
      }
    } catch (err) {
      console.warn('Google Distance Matrix failed, trying fallback:', err);
    }
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
      console.warn('Mapbox Directions failed, using haversine:', err);
    }
  }

  // Fallback to haversine (great-circle distance)
  const miles = haversineDistance(origin, dest);
  return { miles, provider: 'haversine' };
}

/**
 * Google Maps Distance Matrix API
 * Returns driving distance in miles, or null if unavailable
 */
async function googleDistanceMatrix(
  origin: LatLng,
  dest: LatLng,
  apiKey: string
): Promise<number | null> {
  const url = new URL('https://maps.googleapis.com/maps/api/distancematrix/json');
  url.searchParams.set('origins', `${origin.lat},${origin.lng}`);
  url.searchParams.set('destinations', `${dest.lat},${dest.lng}`);
  url.searchParams.set('mode', 'driving');
  url.searchParams.set('units', 'imperial');
  url.searchParams.set('key', apiKey);

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.status !== 'OK') {
    console.warn('Google Distance Matrix status:', data.status);
    return null;
  }

  const element = data.rows?.[0]?.elements?.[0];
  if (element?.status !== 'OK') {
    console.warn('Google Distance Matrix element status:', element?.status);
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
 * Haversine formula for great-circle distance
 * Returns distance in miles (as the crow flies)
 */
function haversineDistance(origin: LatLng, dest: LatLng): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRadians(dest.lat - origin.lat);
  const dLng = toRadians(dest.lng - origin.lng);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(origin.lat)) *
      Math.cos(toRadians(dest.lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
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
