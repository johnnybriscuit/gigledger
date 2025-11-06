/**
 * Mileage calculation service using Google Maps Distance Matrix API
 */

import Constants from 'expo-constants';
import { IRS_MILEAGE_RATE } from '../hooks/useTaxEstimate';

export interface MileageCalculation {
  miles: number;
  duration: string; // e.g., "25 mins"
  distance: string; // e.g., "15.2 miles"
}

/**
 * Calculate driving distance between two addresses using Google Maps Distance Matrix API
 * @param origin - Starting address (usually home address)
 * @param destination - Destination address (venue)
 * @param roundTrip - Whether to double the distance for round trip
 * @returns Mileage calculation or null if calculation fails
 */
export async function calculateDrivingDistance(
  origin: string,
  destination: string,
  roundTrip: boolean = true
): Promise<MileageCalculation | null> {
  // Determine if we're running on web or native
  const isWeb = typeof window !== 'undefined' && window.document;
  
  // For web, use our serverless function proxy to avoid CORS
  // For native, use the API directly
  const url = isWeb
    ? `/api/distance?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`
    : (() => {
        const apiKey = Constants.expoConfig?.extra?.googleMapsApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
          throw new Error('API_KEY_MISSING');
        }
        return `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
      })();
  
  try {
    console.log('Calculating distance from:', origin, 'to:', destination);
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('API response not OK:', response.status, response.statusText);
      
      // Try to get error details from response
      try {
        const errorData = await response.json();
        if (errorData.code === 'API_KEY_MISSING') {
          throw new Error('API_KEY_MISSING');
        } else if (errorData.code === 'API_KEY_INVALID') {
          throw new Error('API_KEY_INVALID');
        }
      } catch (e) {
        // If we can't parse error, continue with status-based error
      }
      
      if (response.status === 403) {
        throw new Error('API_KEY_INVALID');
      }
      throw new Error('API_ERROR');
    }
    
    const data = await response.json();
    console.log('Distance API response:', data);
    
    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      const distanceInMeters = element.distance.value;
      const miles = distanceInMeters / 1609.34; // Convert meters to miles
      const finalMiles = roundTrip ? miles * 2 : miles;
      
      return {
        miles: Math.round(finalMiles * 10) / 10, // Round to 1 decimal
        duration: element.duration.text,
        distance: element.distance.text,
      };
    } else if (data.status === 'REQUEST_DENIED') {
      console.error('Distance API error: REQUEST_DENIED -', data.error_message);
      throw new Error('API_KEY_INVALID');
    } else if (data.status === 'ZERO_RESULTS') {
      console.error('Distance API error: No route found between addresses');
      throw new Error('NO_ROUTE');
    } else {
      console.error('Distance API error:', data.status, data.error_message);
      throw new Error('API_ERROR');
    }
  } catch (error: any) {
    console.error('Error calculating distance:', error);
    // Re-throw specific errors, wrap others
    if (error.message?.startsWith('API_') || error.message === 'NO_ROUTE') {
      throw error;
    }
    // Network error
    throw new Error('NETWORK_ERROR');
  }
}

/**
 * Calculate mileage deduction amount
 */
export function calculateMileageDeduction(miles: number): number {
  return miles * IRS_MILEAGE_RATE;
}

/**
 * Format address for display (shorten if too long)
 */
export function formatAddress(address: string, maxLength: number = 50): string {
  if (address.length <= maxLength) return address;
  return address.substring(0, maxLength - 3) + '...';
}
