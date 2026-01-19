/**
 * Distance calculation utilities for mileage tracking
 * 
 * Phase 1: Simple geocoding + Haversine formula (free, good estimate)
 * Phase 2 (future): Can upgrade to Google Maps Distance Matrix API for exact driving distance
 */

/**
 * Geocode a location string to lat/lng coordinates
 * Uses Nominatim (OpenStreetMap) - free, no API key required
 */
export async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1`,
      {
        headers: {
          'User-Agent': 'GigLedger-MileageTracker/1.0', // Required by Nominatim
        },
      }
    );

    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in miles
 */
export function calculateHaversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate distance between two location strings
 * Geocodes both locations, then calculates distance
 * 
 * @param fromLocation - Starting location (e.g., "Nashville, TN")
 * @param toLocation - Ending location (e.g., "Columbus, OH")
 * @returns Distance in miles, or null if geocoding fails
 */
export async function calculateDistance(
  fromLocation: string,
  toLocation: string
): Promise<number | null> {
  try {
    // Geocode both locations
    const [fromCoords, toCoords] = await Promise.all([
      geocodeLocation(fromLocation),
      geocodeLocation(toLocation),
    ]);

    if (!fromCoords || !toCoords) {
      console.warn('Failed to geocode one or both locations');
      return null;
    }

    // Calculate distance
    const distance = calculateHaversineDistance(
      fromCoords.lat,
      fromCoords.lng,
      toCoords.lat,
      toCoords.lng
    );

    return distance;
  } catch (error) {
    console.error('Distance calculation error:', error);
    return null;
  }
}

/**
 * Format distance for display
 * @param miles - Distance in miles
 * @returns Formatted string (e.g., "107 miles" or "5.5 miles")
 */
export function formatDistance(miles: number | null): string {
  if (miles === null) return 'Unknown';
  return `${miles} mile${miles === 1 ? '' : 's'}`;
}

/**
 * Calculate tax deduction for mileage
 * @param miles - Distance in miles
 * @param ratePerMile - IRS standard mileage rate (default: $0.67 for 2024)
 * @returns Tax deduction amount
 */
export function calculateMileageDeduction(miles: number, ratePerMile: number = 0.67): number {
  return Math.round(miles * ratePerMile * 100) / 100; // Round to 2 decimal places
}

/**
 * Format tax deduction for display
 * @param miles - Distance in miles
 * @param ratePerMile - IRS standard mileage rate
 * @returns Formatted string (e.g., "$71.69 (107 miles × $0.67/mile)")
 */
export function formatMileageDeduction(miles: number, ratePerMile: number = 0.67): string {
  const deduction = calculateMileageDeduction(miles, ratePerMile);
  return `$${deduction.toFixed(2)} (${miles} miles × $${ratePerMile.toFixed(2)}/mile)`;
}
