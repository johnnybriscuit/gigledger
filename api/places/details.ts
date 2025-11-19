/**
 * Google Place Details Proxy
 * Fetches detailed place information and normalizes address components
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit: number, windowSeconds: number): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `places-details:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + (windowSeconds * 1000) });
    return { success: true };
  }

  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { success: false, retryAfter };
  }

  entry.count++;
  return { success: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // CORS - same origin only
  const origin = req.headers.origin;
  const allowedOrigins = [
    'http://localhost:8090',
    'https://gigledger-ten.vercel.app'
  ];
  
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Security headers
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Content-Type', 'application/json');

  // Rate limiting
  const identifier = req.headers['x-forwarded-for'] as string || 'unknown';
  const rateLimitResult = checkRateLimit(identifier, 30, 60); // 30 requests per 60 seconds
  
  if (!rateLimitResult.success) {
    return res.status(429).json({ 
      error: 'Too many requests',
      retryAfter: rateLimitResult.retryAfter 
    });
  }

  try {
    const { place_id } = req.query;

    if (!place_id || typeof place_id !== 'string') {
      return res.status(400).json({ error: 'Query parameter "place_id" is required' });
    }

    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return res.status(500).json({ error: 'Places API not configured' });
    }

    // Build Google Place Details API URL
    const params = new URLSearchParams({
      place_id,
      key: GOOGLE_API_KEY,
      fields: 'formatted_address,address_components,geometry/location,name,types',
    });

    const googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;

    console.log('Place Details request:', { place_id });

    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Google Places API error:', data.status, data.error_message);
      return res.status(500).json({ 
        error: 'Places API error',
        status: data.status 
      });
    }

    const result = data.result;

    // Extract and normalize address components
    const parts: {
      street_number?: string;
      route?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    } = {};

    if (result.address_components) {
      for (const component of result.address_components) {
        const types = component.types;
        const value = component.long_name;
        const shortValue = component.short_name;

        if (types.includes('street_number')) {
          parts.street_number = value;
        } else if (types.includes('route')) {
          parts.route = value;
        } else if (types.includes('locality')) {
          parts.city = value;
        } else if (types.includes('administrative_area_level_1')) {
          parts.state = shortValue; // Use short name for state (e.g., "FL" instead of "Florida")
        } else if (types.includes('postal_code')) {
          parts.postal_code = value;
        } else if (types.includes('country')) {
          parts.country = shortValue; // Use short name for country (e.g., "US")
        }
      }
    }

    // Normalize response
    const normalized = {
      place_id: result.place_id,
      name: result.name || '',
      formatted_address: result.formatted_address || '',
      location: result.geometry?.location ? {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      } : null,
      parts,
    };

    return res.status(200).json(normalized);

  } catch (error: any) {
    console.error('Place details error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch place details',
      details: error.message 
    });
  }
}
