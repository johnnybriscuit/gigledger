/**
 * Geocoding utilities for city-level map pins
 * Uses a simple city coordinates lookup for common US cities
 */

interface CityCoordinates {
  lat: number;
  lon: number;
}

// Common US city coordinates (can be expanded as needed)
const CITY_COORDS: Record<string, CityCoordinates> = {
  // Major cities by state
  'Nashville, TN': { lat: 36.1627, lon: -86.7816 },
  'Memphis, TN': { lat: 35.1495, lon: -90.0490 },
  'Knoxville, TN': { lat: 35.9606, lon: -83.9207 },
  'Chattanooga, TN': { lat: 35.0456, lon: -85.3097 },
  'New York, NY': { lat: 40.7128, lon: -74.0060 },
  'Los Angeles, CA': { lat: 34.0522, lon: -118.2437 },
  'Chicago, IL': { lat: 41.8781, lon: -87.6298 },
  'Houston, TX': { lat: 29.7604, lon: -95.3698 },
  'Phoenix, AZ': { lat: 33.4484, lon: -112.0740 },
  'Philadelphia, PA': { lat: 39.9526, lon: -75.1652 },
  'San Antonio, TX': { lat: 29.4241, lon: -98.4936 },
  'San Diego, CA': { lat: 32.7157, lon: -117.1611 },
  'Dallas, TX': { lat: 32.7767, lon: -96.7970 },
  'San Jose, CA': { lat: 37.3382, lon: -121.8863 },
  'Austin, TX': { lat: 30.2672, lon: -97.7431 },
  'Jacksonville, FL': { lat: 30.3322, lon: -81.6557 },
  'Fort Worth, TX': { lat: 32.7555, lon: -97.3308 },
  'Columbus, OH': { lat: 39.9612, lon: -82.9988 },
  'Charlotte, NC': { lat: 35.2271, lon: -80.8431 },
  'San Francisco, CA': { lat: 37.7749, lon: -122.4194 },
  'Indianapolis, IN': { lat: 39.7684, lon: -86.1581 },
  'Seattle, WA': { lat: 47.6062, lon: -122.3321 },
  'Denver, CO': { lat: 39.7392, lon: -104.9903 },
  'Boston, MA': { lat: 42.3601, lon: -71.0589 },
  'Portland, OR': { lat: 45.5152, lon: -122.6784 },
  'Las Vegas, NV': { lat: 36.1699, lon: -115.1398 },
  'Detroit, MI': { lat: 42.3314, lon: -83.0458 },
  'Miami, FL': { lat: 25.7617, lon: -80.1918 },
  'Atlanta, GA': { lat: 33.7490, lon: -84.3880 },
  'Minneapolis, MN': { lat: 44.9778, lon: -93.2650 },
  'St. Louis, MO': { lat: 38.6270, lon: -90.1994 },
  'Tampa, FL': { lat: 27.9506, lon: -82.4572 },
  'Baltimore, MD': { lat: 39.2904, lon: -76.6122 },
  'Pittsburgh, PA': { lat: 40.4406, lon: -79.9959 },
  'Orlando, FL': { lat: 28.5383, lon: -81.3792 },
  'Sacramento, CA': { lat: 38.5816, lon: -121.4944 },
  'Kansas City, MO': { lat: 39.0997, lon: -94.5786 },
  'Milwaukee, WI': { lat: 43.0389, lon: -87.9065 },
  'Raleigh, NC': { lat: 35.7796, lon: -78.6382 },
  'Louisville, KY': { lat: 38.2527, lon: -85.7585 },
  'New Orleans, LA': { lat: 29.9511, lon: -90.0715 },
  'Salt Lake City, UT': { lat: 40.7608, lon: -111.8910 },
  'Cleveland, OH': { lat: 41.4993, lon: -81.6944 },
  'Tucson, AZ': { lat: 32.2226, lon: -110.9747 },
  'Albuquerque, NM': { lat: 35.0844, lon: -106.6504 },
  'Fresno, CA': { lat: 36.7378, lon: -119.7871 },
  'Mesa, AZ': { lat: 33.4152, lon: -111.8315 },
  'Oklahoma City, OK': { lat: 35.4676, lon: -97.5164 },
  'Omaha, NE': { lat: 41.2565, lon: -95.9345 },
  'Virginia Beach, VA': { lat: 36.8529, lon: -75.9780 },
};

// State center coordinates as fallback
const STATE_CENTERS: Record<string, CityCoordinates> = {
  'AL': { lat: 32.806671, lon: -86.791130 },
  'AK': { lat: 61.370716, lon: -152.404419 },
  'AZ': { lat: 33.729759, lon: -111.431221 },
  'AR': { lat: 34.969704, lon: -92.373123 },
  'CA': { lat: 36.116203, lon: -119.681564 },
  'CO': { lat: 39.059811, lon: -105.311104 },
  'CT': { lat: 41.597782, lon: -72.755371 },
  'DE': { lat: 39.318523, lon: -75.507141 },
  'FL': { lat: 27.766279, lon: -81.686783 },
  'GA': { lat: 33.040619, lon: -83.643074 },
  'HI': { lat: 21.094318, lon: -157.498337 },
  'ID': { lat: 44.240459, lon: -114.478828 },
  'IL': { lat: 40.349457, lon: -88.986137 },
  'IN': { lat: 39.849426, lon: -86.258278 },
  'IA': { lat: 42.011539, lon: -93.210526 },
  'KS': { lat: 38.526600, lon: -96.726486 },
  'KY': { lat: 37.668140, lon: -84.670067 },
  'LA': { lat: 31.169546, lon: -91.867805 },
  'ME': { lat: 44.693947, lon: -69.381927 },
  'MD': { lat: 39.063946, lon: -76.802101 },
  'MA': { lat: 42.230171, lon: -71.530106 },
  'MI': { lat: 43.326618, lon: -84.536095 },
  'MN': { lat: 45.694454, lon: -93.900192 },
  'MS': { lat: 32.741646, lon: -89.678696 },
  'MO': { lat: 38.456085, lon: -92.288368 },
  'MT': { lat: 46.921925, lon: -110.454353 },
  'NE': { lat: 41.125370, lon: -98.268082 },
  'NV': { lat: 38.313515, lon: -117.055374 },
  'NH': { lat: 43.452492, lon: -71.563896 },
  'NJ': { lat: 40.298904, lon: -74.521011 },
  'NM': { lat: 34.840515, lon: -106.248482 },
  'NY': { lat: 42.165726, lon: -74.948051 },
  'NC': { lat: 35.630066, lon: -79.806419 },
  'ND': { lat: 47.528912, lon: -99.784012 },
  'OH': { lat: 40.388783, lon: -82.764915 },
  'OK': { lat: 35.565342, lon: -96.928917 },
  'OR': { lat: 44.572021, lon: -122.070938 },
  'PA': { lat: 40.590752, lon: -77.209755 },
  'RI': { lat: 41.680893, lon: -71.511780 },
  'SC': { lat: 33.856892, lon: -80.945007 },
  'SD': { lat: 44.299782, lon: -99.438828 },
  'TN': { lat: 35.747845, lon: -86.692345 },
  'TX': { lat: 31.054487, lon: -97.563461 },
  'UT': { lat: 40.150032, lon: -111.862434 },
  'VT': { lat: 44.045876, lon: -72.710686 },
  'VA': { lat: 37.769337, lon: -78.169968 },
  'WA': { lat: 47.400902, lon: -121.490494 },
  'WV': { lat: 38.491226, lon: -80.954453 },
  'WI': { lat: 44.268543, lon: -89.616508 },
  'WY': { lat: 42.755966, lon: -107.302490 },
  'DC': { lat: 38.907192, lon: -77.036871 },
};

/**
 * Get coordinates for a city
 * @param city - City name (e.g., "Nashville")
 * @param stateCode - State code (e.g., "TN")
 * @returns Coordinates or null if not found
 */
export function getCityCoordinates(city: string | null, stateCode: string): CityCoordinates | null {
  if (!city) {
    // Return state center as fallback
    return STATE_CENTERS[stateCode] || null;
  }

  // Normalize city name
  const normalizedCity = city.trim();
  
  // Try exact match with state
  const key1 = `${normalizedCity}, ${stateCode}`;
  if (CITY_COORDS[key1]) {
    return CITY_COORDS[key1];
  }

  // Try case-insensitive match
  const lowerKey = key1.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (key.toLowerCase() === lowerKey) {
      return coords;
    }
  }

  // Fallback to state center
  return STATE_CENTERS[stateCode] || null;
}

/**
 * Group gigs by city for pin rendering
 */
export interface CityGigGroup {
  city: string;
  stateCode: string;
  coordinates: CityCoordinates;
  gigs: Array<{
    id: string;
    date: string;
    venue?: string | null;
    payer?: string;
    amount: number;
  }>;
  totalAmount: number;
}

export function groupGigsByCity(gigs: any[], stateCode: string): CityGigGroup[] {
  const cityGroups = new Map<string, CityGigGroup>();

  gigs.forEach((gig) => {
    const city = gig.city || 'Unknown';
    const coords = getCityCoordinates(gig.city, stateCode);
    
    if (!coords) return;

    const amount = 
      (gig.gross_amount || 0) +
      (gig.tips || 0) +
      (gig.per_diem || 0) +
      (gig.other_income || 0) -
      (gig.fees || 0);

    if (!cityGroups.has(city)) {
      cityGroups.set(city, {
        city,
        stateCode,
        coordinates: coords,
        gigs: [],
        totalAmount: 0,
      });
    }

    const group = cityGroups.get(city)!;
    group.gigs.push({
      id: gig.id,
      date: gig.date,
      venue: gig.notes,
      payer: gig.payer?.name,
      amount,
    });
    group.totalAmount += amount;
  });

  return Array.from(cityGroups.values());
}
