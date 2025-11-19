/**
 * Google Places Autocomplete Proxy
 * Securely proxies requests to Google Places API
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Simple in-memory rate limiting
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, limit: number, windowSeconds: number): { success: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `places:${identifier}`;
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
      return res.status(500).json({ 
        error: 'Places API error',
        status: data.status 
      });
    }

    // Normalize response
    const predictions = (data.predictions || []).map((pred: any) => ({
      description: pred.description,
      place_id: pred.place_id,
      structured_formatting: pred.structured_formatting ? {
        main_text: pred.structured_formatting.main_text,
        secondary_text: pred.structured_formatting.secondary_text,
      } : undefined,
    }));

    return res.status(200).json({ predictions });

  } catch (error: any) {
    console.error('Places autocomplete error:', error.message);
    return res.status(500).json({ 
      error: 'Failed to fetch autocomplete results',
      details: error.message 
    });
  }
}
