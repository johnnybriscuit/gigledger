export function generateShareToken(): string {
  const array = new Uint8Array(18);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function buildShareUrl(token: string): string {
  const baseUrl = process.env.EXPO_PUBLIC_SITE_URL 
    || 'https://bozzygigs.com';
  return `${baseUrl}/share/${token}`;
}
