/**
 * Get the base URL for the current environment
 * Ensures auth redirects return to the same environment (preview, prod, or localhost)
 */
export function getBaseUrl(): string {
  // Browser: use window.location.origin (source of truth)
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  // Server-side fallback for Vercel deployments
  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  // Fallback to configured site URL or localhost
  return process.env.EXPO_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
