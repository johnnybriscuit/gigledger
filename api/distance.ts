/**
 * Vercel Serverless Function to proxy Google Maps Distance Matrix API requests
 * This avoids CORS issues when calling from the browser
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

function getFirstQueryValue(value: string | string[] | undefined): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value)) {
    return typeof value[0] === 'string' ? value[0] : null;
  }

  return null;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = getFirstQueryValue(req.query.origin);
  const destination = getFirstQueryValue(req.query.destination);
  const originLat = getFirstQueryValue(req.query.origin_lat);
  const originLng = getFirstQueryValue(req.query.origin_lng);
  const destinationLat = getFirstQueryValue(req.query.destination_lat);
  const destinationLng = getFirstQueryValue(req.query.destination_lng);

  const hasAddressInputs = Boolean(origin && destination);
  const hasCoordinateInputs = Boolean(originLat && originLng && destinationLat && destinationLng);

  // Validate required parameters
  if (!hasAddressInputs && !hasCoordinateInputs) {
    return res.status(400).json({ 
      error: 'Missing required parameters: origin/destination or origin_lat/origin_lng/destination_lat/destination_lng',
    });
  }

  // Get API key from environment variable
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  
  if (!apiKey) {
    console.error('GOOGLE_MAPS_API_KEY not configured');
    return res.status(500).json({ 
      error: 'API key not configured',
      code: 'API_KEY_MISSING'
    });
  }

  try {
    const origins = hasCoordinateInputs
      ? `${originLat},${originLng}`
      : origin!;
    const destinations = hasCoordinateInputs
      ? `${destinationLat},${destinationLng}`
      : destination!;

    // Call Google Maps Distance Matrix API
    const params = new URLSearchParams({
      origins,
      destinations,
      mode: 'driving',
      units: 'imperial',
      key: apiKey,
    });
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?${params.toString()}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Google Maps API error:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: 'Google Maps API error',
        code: 'API_ERROR'
      });
    }

    const data = await response.json();

    // Check for API-level errors
    if (data.status === 'REQUEST_DENIED') {
      console.error('Google Maps API request denied:', data.error_message);
      return res.status(403).json({ 
        error: data.error_message || 'API request denied',
        code: 'API_KEY_INVALID'
      });
    }

    // Return the response
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error calling Google Maps API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      code: 'SERVER_ERROR',
      message: error.message 
    });
  }
}
