import Constants from 'expo-constants';

/**
 * Helper function to require an environment variable.
 * Throws a readable error in development if the variable is missing.
 * 
 * @param name - The environment variable name (e.g., 'EXPO_PUBLIC_SUPABASE_URL')
 * @param value - The value from process.env or Constants
 * @returns The value if present
 * @throws Error if value is missing in development
 */
function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    const isDev = __DEV__ || process.env.NODE_ENV === 'development';
    const errorMessage = `Missing required environment variable: ${name}\n\n` +
      `Please ensure ${name} is set in your .env file.\n` +
      `See .env.example for reference.`;
    
    if (isDev) {
      throw new Error(errorMessage);
    } else {
      console.error(errorMessage);
      return '';
    }
  }
  return value;
}

/**
 * Helper function to get an environment variable with fallback.
 * Tries Constants.expoConfig.extra first, then process.env.
 */
function getEnvVar(key: string): string | undefined {
  return Constants.expoConfig?.extra?.[key] || process.env[key];
}

/**
 * Centralized environment configuration.
 * 
 * SECURITY NOTES:
 * - Only EXPO_PUBLIC_* variables should be accessed here
 * - Server-side secrets (RESEND_API_KEY, STRIPE_SECRET_KEY, etc.) 
 *   must NEVER be imported or referenced in client code
 * - See SECURITY_NOTES.md for detailed guidance
 */
export const env = {
  // Supabase Configuration
  supabaseUrl: requireEnv('EXPO_PUBLIC_SUPABASE_URL', getEnvVar('EXPO_PUBLIC_SUPABASE_URL')),
  supabaseAnonKey: requireEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY')),
  
  // Site Configuration
  siteUrl: requireEnv('EXPO_PUBLIC_SITE_URL', getEnvVar('EXPO_PUBLIC_SITE_URL')),
  
  // EAS Configuration
  easProjectId: getEnvVar('EXPO_PUBLIC_EAS_PROJECT_ID') || '',
  
  // Google Maps API Key (client-side - must be restricted in Google Cloud Console)
  googleMapsApiKey: getEnvVar('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY') || '',
  
  // Google OAuth
  googleOAuthEnabled: getEnvVar('EXPO_PUBLIC_GOOGLE_OAUTH_ENABLED') === 'true',
  
  // Deep Linking
  deepLinkScheme: getEnvVar('EXPO_PUBLIC_DEEP_LINK_SCHEME') || 'bozzy',
  
  // Tax Configuration
  taxYear: parseInt(getEnvVar('EXPO_PUBLIC_TAX_YEAR') || '2025', 10),
  federalFlatRateSingle: parseFloat(getEnvVar('EXPO_PUBLIC_FEDERAL_FLAT_RATE_SINGLE') || '0.12'),
  federalFlatRateMarried: parseFloat(getEnvVar('EXPO_PUBLIC_FEDERAL_FLAT_RATE_MARRIED') || '0.12'),
  federalFlatRateHOH: parseFloat(getEnvVar('EXPO_PUBLIC_FEDERAL_FLAT_RATE_HOH') || '0.12'),
  useFederalBrackets: getEnvVar('EXPO_PUBLIC_USE_FEDERAL_BRACKETS') === 'true',
  
  // Mileage
  defaultMileageRate: parseFloat(getEnvVar('EXPO_PUBLIC_DEFAULT_MILEAGE_RATE') || '0.67'),
  
  // Stripe Price IDs (public identifiers - safe to bundle)
  stripeMonthlyPriceId: getEnvVar('EXPO_PUBLIC_STRIPE_MONTHLY_PRICE_ID_PROD') || '',
  stripeYearlyPriceId: getEnvVar('EXPO_PUBLIC_STRIPE_YEARLY_PRICE_ID_PROD') || '',
  
  // App URL for shareable links
  appUrl: getEnvVar('NEXT_PUBLIC_APP_URL') || getEnvVar('EXPO_PUBLIC_SITE_URL') || '',
} as const;

// WARNING: The following secrets must NEVER be accessed in client code:
// 
// - RESEND_API_KEY (use Supabase Edge Functions instead)
// - STRIPE_SECRET_KEY_PROD (use Vercel API routes instead)
// - STRIPE_WEBHOOK_SECRET_PROD (use Vercel API routes instead)
// - SUPABASE_SERVICE_ROLE_KEY (use Vercel API routes instead)
// 
// These should only be used in:
// - api/*.ts (Vercel API routes)
// - supabase/functions/*/index.ts (Supabase Edge Functions)
// 
// Attempting to access these in client code will expose them to end users!
