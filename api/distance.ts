/**
 * Vercel Serverless Function to proxy Google Maps Distance Matrix API requests
 * This avoids CORS issues when calling from the browser
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { origin, destination } = req.query;

  // Validate required parameters
  if (!origin || !destination) {
    return res.status(400).json({ 
      error: 'Missing required parameters: origin and destination' 
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
    // Call Google Maps Distance Matrix API
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origin as string)}&destinations=${encodeURIComponent(destination as string)}&key=${apiKey}`;
    
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
