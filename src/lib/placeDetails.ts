import Constants from 'expo-constants';
import { getBaseUrl } from './getBaseUrl';

export interface PlaceDetailsResult {
  place_id: string;
  name: string;
  formatted_address: string;
  location: {
    lat: number;
    lng: number;
  } | null;
  parts: {
    street_number?: string;
    route?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

function normalizeGoogleAddressParts(addressComponents: any[] | undefined): PlaceDetailsResult['parts'] {
  const parts: PlaceDetailsResult['parts'] = {};

  if (!Array.isArray(addressComponents)) {
    return parts;
  }

  for (const component of addressComponents) {
    const types: string[] = Array.isArray(component?.types) ? component.types : [];
    const value = component?.long_name;
    const shortValue = component?.short_name;

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

function normalizeProxyResponse(data: any): PlaceDetailsResult | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const location =
    typeof data.location?.lat === 'number' && typeof data.location?.lng === 'number'
      ? { lat: data.location.lat, lng: data.location.lng }
      : null;

  return {
    place_id: typeof data.place_id === 'string' ? data.place_id : '',
    name: typeof data.name === 'string' ? data.name : '',
    formatted_address: typeof data.formatted_address === 'string' ? data.formatted_address : '',
    location,
    parts: typeof data.parts === 'object' && data.parts ? data.parts : {},
  };
}

function normalizeGeocodeResponse(data: any): PlaceDetailsResult | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const location =
    typeof data.location?.lat === 'number' && typeof data.location?.lng === 'number'
      ? { lat: data.location.lat, lng: data.location.lng }
      : null;

  return {
    place_id: typeof data.place_id === 'string' ? data.place_id : '',
    name: '',
    formatted_address: typeof data.formatted_address === 'string' ? data.formatted_address : '',
    location,
    parts: typeof data.parts === 'object' && data.parts ? data.parts : {},
  };
}

async function fetchViaProxy(placeId: string): Promise<PlaceDetailsResult | null> {
  const encoded = encodeURIComponent(placeId);
  const isWeb = typeof window !== 'undefined' && Boolean(window.location?.origin);

  const urls = isWeb
    ? [`/api/places/details?place_id=${encoded}`, `${getBaseUrl()}/api/places/details?place_id=${encoded}`]
    : [`${getBaseUrl()}/api/places/details?place_id=${encoded}`];

  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) continue;

      const data = await response.json();
      const normalized = normalizeProxyResponse(data);
      if (normalized) return normalized;
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchViaGoogle(placeId: string): Promise<PlaceDetailsResult | null> {
  const apiKey =
    Constants.expoConfig?.extra?.googleMapsApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: 'place_id,name,formatted_address,geometry/location,address_components',
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/place/details/json?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = data?.result;

    if (data?.status !== 'OK' || !result) {
      return null;
    }

    return {
      place_id: typeof result.place_id === 'string' ? result.place_id : placeId,
      name: typeof result.name === 'string' ? result.name : '',
      formatted_address: typeof result.formatted_address === 'string' ? result.formatted_address : '',
      location:
        typeof result.geometry?.location?.lat === 'number' && typeof result.geometry?.location?.lng === 'number'
          ? {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng,
            }
          : null,
      parts: normalizeGoogleAddressParts(result.address_components),
    };
  } catch {
    return null;
  }
}

async function fetchAddressViaProxy(address: string): Promise<PlaceDetailsResult | null> {
  const encoded = encodeURIComponent(address);
  const isWeb = typeof window !== 'undefined' && Boolean(window.location?.origin);

  const urls = isWeb
    ? [`/api/places/geocode?address=${encoded}`, `${getBaseUrl()}/api/places/geocode?address=${encoded}`]
    : [`${getBaseUrl()}/api/places/geocode?address=${encoded}`];

  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: 'include' });
      if (!response.ok) continue;

      const data = await response.json();
      const normalized = normalizeGeocodeResponse(data);
      if (normalized) return normalized;
    } catch {
      continue;
    }
  }

  return null;
}

async function fetchAddressViaGoogle(address: string): Promise<PlaceDetailsResult | null> {
  const apiKey =
    Constants.expoConfig?.extra?.googleMapsApiKey || process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    address,
    key: apiKey,
  });

  try {
    const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const result = Array.isArray(data?.results) ? data.results[0] : null;

    if (data?.status !== 'OK' || !result) {
      return null;
    }

    return {
      place_id: typeof result.place_id === 'string' ? result.place_id : '',
      name: '',
      formatted_address: typeof result.formatted_address === 'string' ? result.formatted_address : '',
      location:
        typeof result.geometry?.location?.lat === 'number' && typeof result.geometry?.location?.lng === 'number'
          ? {
              lat: result.geometry.location.lat,
              lng: result.geometry.location.lng,
            }
          : null,
      parts: normalizeGoogleAddressParts(result.address_components),
    };
  } catch {
    return null;
  }
}

export async function resolvePlaceDetails(placeId: string): Promise<PlaceDetailsResult | null> {
  if (!placeId) {
    return null;
  }

  const proxyResult = await fetchViaProxy(placeId);
  if (proxyResult?.location) {
    return proxyResult;
  }

  const googleResult = await fetchViaGoogle(placeId);
  if (googleResult?.location) {
    return googleResult;
  }

  return proxyResult ?? googleResult;
}

export async function resolveAddressDetails(address: string): Promise<PlaceDetailsResult | null> {
  if (!address?.trim()) {
    return null;
  }

  const proxyResult = await fetchAddressViaProxy(address);
  if (proxyResult?.location) {
    return proxyResult;
  }

  const googleResult = await fetchAddressViaGoogle(address);
  if (googleResult?.location) {
    return googleResult;
  }

  return proxyResult ?? googleResult;
}
