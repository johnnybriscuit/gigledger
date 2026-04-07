/**
 * Google Places Autocomplete Proxy
 * Securely proxies requests to Google Places API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyProxyHeaders, enforceProxyAccess, parseAllowedOrigins } from '../_lib/proxySecurity';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
type AutocompletePrediction = {
  description?: string;
  place_id?: string;
  structured_formatting?: {
    main_text?: string;
    secondary_text?: string;
  };
};

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

  const allowed = await enforceProxyAccess(req, res, 'places-autocomplete', {
    limit: Number(process.env.GOOGLE_PROXY_RATE_LIMIT || 30),
    windowMs: Number(process.env.GOOGLE_PROXY_RATE_LIMIT_WINDOW_MS || 60_000),
    allowedOrigins,
  });
  if (!allowed) {
    return;
  }

  try {
    const { q, types, sessiontoken } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    if (!GOOGLE_API_KEY) {
      console.error('GOOGLE_MAPS_API_KEY is not configured');
      return res.status(500).json({ error: 'Places API not configured' });
    }

    // Build Google Places Autocomplete API URL
    const params = new URLSearchParams({
      input: q,
      key: GOOGLE_API_KEY,
    });

    if (types && typeof types === 'string') {
      params.append('types', types);
    }

    if (sessiontoken && typeof sessiontoken === 'string') {
      params.append('sessiontoken', sessiontoken);
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/place/autocomplete/json?${params.toString()}`;

    console.log('Places Autocomplete request:', { query: q, types, hasSession: !!sessiontoken });

    const response = await fetch(googleUrl);
    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      console.error('Google Places API error:', data.status, data.error_message);
      return res.status(502).json({ 
        error: 'Places API error',
        status: data.status 
      });
    }

    // Normalize response
    const predictions = ((data.predictions || []) as AutocompletePrediction[]).map((pred) => ({
      description: pred.description,
      place_id: pred.place_id,
      structured_formatting: pred.structured_formatting ? {
        main_text: pred.structured_formatting.main_text,
        secondary_text: pred.structured_formatting.secondary_text,
      } : undefined,
    }));

    return res.status(200).json({ predictions });

  } catch (error: unknown) {
    console.error('Places autocomplete error:', error instanceof Error ? error.message : error);
    return res.status(500).json({ 
      error: 'Failed to fetch autocomplete results',
    });
  }
}
