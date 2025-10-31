import Constants from 'expo-constants';

function getEnvVar(key: string): string {
  const value = Constants.expoConfig?.extra?.[key] || process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const env = {
  supabaseUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  deepLinkScheme: getEnvVar('EXPO_PUBLIC_DEEP_LINK_SCHEME') || 'gigledger',
  defaultMileageRate: parseFloat(getEnvVar('EXPO_PUBLIC_DEFAULT_MILEAGE_RATE') || '0.67'),
} as const;
