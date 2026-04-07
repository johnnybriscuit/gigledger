/**
 * Google Geocoding Proxy
 * Resolves a free-form address into normalized address parts and coordinates.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyProxyHeaders, enforceProxyAccess, parseAllowedOrigins } from '../_lib/proxySecurity';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_PROXY_ORIGINS);

  if (req.method === 'OPTIONS') {
    applyProxyHeaders(req, res, allowedOrigins);
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const allowed = await enforceProxyAccess(req, res, 'places-geocode', {
    limit: Number(process.env.GOOGLE_PROXY_RATE_LIMIT || 30),
    windowMs: Number(process.env.GOOGLE_PROXY_RATE_LIMIT_WINDOW_MS || 60_000),
    allowedOrigins,
  });
  if (!allowed) {
    return;
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Query parameter "address" is required' });
    }

    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return res.status(500).json({ error: 'Geocoding API not configured' });
    }

    const params = new URLSearchParams({
      address,
      key: GOOGLE_API_KEY,
    });

    const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`;
    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.status !== 'OK' || !Array.isArray(data.results) || data.results.length === 0) {
      console.error('Google Geocoding API error:', data.status, data.error_message);
      return res.status(502).json({
        error: 'Geocoding API error',
        status: data.status,
      });
    }

    const result = data.results[0];
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
          parts.state = shortValue;
        } else if (types.includes('postal_code')) {
          parts.postal_code = value;
        } else if (types.includes('country')) {
          parts.country = shortValue;
        }
      }
    }

    return res.status(200).json({
      place_id: result.place_id || '',
      formatted_address: result.formatted_address || '',
      location: result.geometry?.location
        ? {
            lat: result.geometry.location.lat,
            lng: result.geometry.location.lng,
          }
        : null,
      parts,
    });
  } catch (error: unknown) {
    console.error('Geocode error:', error instanceof Error ? error.message : error);
    return res.status(500).json({
      error: 'Failed to geocode address',
    });
  }
}
