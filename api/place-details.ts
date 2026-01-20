import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Serverless endpoint to resolve Google Place ID to coordinates
 * Avoids CORS issues by calling Google API from server-side
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { placeId } = req.query;

  // Validate placeId parameter
  if (!placeId || typeof placeId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid placeId parameter' });
  }

  // Get API key from environment
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error('[place-details] GOOGLE_MAPS_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Use Google Geocoding API with place_id (simple and reliable)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error(`[place-details] Google API error: ${data.status}`, data.error_message);
      return res.status(400).json({ 
        error: `Failed to fetch place details: ${data.status}`,
        status: data.status 
      });
    }

    const result = data.results[0];
    if (!result || !result.geometry || !result.geometry.location) {
      return res.status(404).json({ error: 'Place not found or missing geometry' });
    }

    // Extract coordinates and details
    const { lat, lng } = result.geometry.location;
    const formattedAddress = result.formatted_address || '';
    
    // Extract name from address components if available
    const nameComponent = result.address_components?.find(
      (c: any) => c.types.includes('establishment') || c.types.includes('point_of_interest')
    );
    const name = nameComponent?.long_name || '';

    // Return clean response
    return res.status(200).json({
      placeId,
      lat,
      lng,
      formatted_address: formattedAddress,
      name,
    });

  } catch (error) {
    console.error('[place-details] Error fetching place details:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
