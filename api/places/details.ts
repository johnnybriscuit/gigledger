/**
 * Google Place Details Proxy
 * Fetches detailed place information and normalizes address components
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyProxyHeaders, enforceProxyAccess, parseAllowedOrigins } from '../../src/lib/proxySecurity';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

type AddressParts = {
  street_number?: string;
  route?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

function extractAddressParts(addressComponents: unknown): AddressParts {
  const parts: AddressParts = {};
  if (!Array.isArray(addressComponents)) {
    return parts;
  }

  for (const component of addressComponents as Array<{ types?: string[]; long_name?: string; short_name?: string }>) {
    const types = Array.isArray(component.types) ? component.types : [];
    const value = typeof component.long_name === 'string' ? component.long_name : '';
    const shortValue = typeof component.short_name === 'string' ? component.short_name : '';

    if (types.includes('street_number')) {
      parts.street_number = value;
    } else if (types.includes('route')) {
      parts.route = value;
    } else if (types.includes('locality')) {
      parts.city = value;
    } else if (types.includes('administrative_area_level_1')) {
      parts.state = shortValue;
    } else if (types.includes('postal_code')) {
      parts.postal_code = value;
    } else if (types.includes('country')) {
      parts.country = shortValue;
    }
  }

  return parts;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_PROXY_ORIGINS);

  if (req.method === 'OPTIONS') {
    applyProxyHeaders(req, res, allowedOrigins);
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const allowed = await enforceProxyAccess(req, res, 'places-details', {
    limit: Number(process.env.GOOGLE_PROXY_RATE_LIMIT || 30),
    windowMs: Number(process.env.GOOGLE_PROXY_RATE_LIMIT_WINDOW_MS || 60_000),
    allowedOrigins,
  });
  if (!allowed) {
    return;
  }

  try {
    const placeId = typeof req.query.place_id === 'string' ? req.query.place_id : null;
    const address = typeof req.query.address === 'string' ? req.query.address : null;

    if (!placeId && !address) {
      return res.status(400).json({ error: 'Query parameter "place_id" or "address" is required' });
    }

    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return res.status(500).json({ error: 'Places API not configured' });
    }

    let googleUrl = '';
    let requestMode: 'place_id' | 'address' = 'place_id';

    if (placeId) {
      const params = new URLSearchParams({
        place_id: placeId,
        key: GOOGLE_API_KEY,
        fields: 'formatted_address,address_components,geometry/location,name,types',
      });
      googleUrl = `https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`;
      requestMode = 'place_id';
      console.log('Place Details request:', { place_id: placeId });
    } else {
      const params = new URLSearchParams({
        address: address!,
        key: GOOGLE_API_KEY,
      });
      googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
      requestMode = 'address';
      console.log('Places geocode request via details endpoint');
    }

    const response = await fetch(googleUrl);
    const data: any = await response.json();

    if (requestMode === 'place_id') {
      if (data.status !== 'OK' || !data.result) {
        console.error('Google Places API error:', data.status, data.error_message);
        return res.status(502).json({
          error: 'Places API error',
          status: data.status,
        });
      }
    } else if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      console.error('Google Geocoding API error:', data.status, data.error_message);
      return res.status(502).json({
        error: 'Geocoding API error',
        status: data.status,
      });
    }

    const result = requestMode === 'place_id' ? data.result : data.results[0];
    const parts = extractAddressParts(result?.address_components);
    const location = result?.geometry?.location;

    const normalized = {
      place_id: typeof result?.place_id === 'string' ? result.place_id : '',
      name: typeof result?.name === 'string' ? result.name : '',
      formatted_address: typeof result?.formatted_address === 'string' ? result.formatted_address : '',
      location:
        typeof location?.lat === 'number' && typeof location?.lng === 'number'
          ? {
              lat: location.lat,
              lng: location.lng,
            }
          : null,
      parts,
    };

    return res.status(200).json(normalized);

  } catch (error: unknown) {
    console.error('Place details/geocode error:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      error: 'Failed to fetch place information',
    });
  }
}
