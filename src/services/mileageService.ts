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
  // Hardcoded API key for now - move to secure backend in production
  const apiKey = 'AIzaSyBNJRJ7kKDS1bGHaKmbpQf9D9nFc51wZqw';
  
  if (!apiKey) {
    console.log('No Google Maps API key found');
    return null;
  }
  
  // Use CORS proxy for web, direct API for mobile
  const isWeb = typeof window !== 'undefined' && window.document;
  const baseUrl = isWeb 
    ? 'https://cors-anywhere.herokuapp.com/https://maps.googleapis.com/maps/api/distancematrix/json'
    : 'https://maps.googleapis.com/maps/api/distancematrix/json';
  
  const url = `${baseUrl}?origins=${encodeURIComponent(origin)}&destinations=${encodeURIComponent(destination)}&key=${apiKey}`;
  
  try {
    console.log('Calculating distance from:', origin, 'to:', destination);
    const response = await fetch(url, {
      headers: isWeb ? {
        'X-Requested-With': 'XMLHttpRequest'
      } : {}
    });
    
    if (!response.ok) {
      console.error('API response not OK:', response.status, response.statusText);
      return null;
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
    } else {
      console.error('Distance API error:', data.status, data.error_message);
    }
  } catch (error) {
    console.error('Error calculating distance:', error);
  }
  
  return null;
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
