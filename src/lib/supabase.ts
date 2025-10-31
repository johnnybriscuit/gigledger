import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
// import { env } from './env'; // Temporarily disabled
import type { Database } from '../types/database.types';

// Hardcoded for debugging
const SUPABASE_URL = 'https://jvostkeswuhfwntbrfzl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2b3N0a2Vzd3VoZndudGJyZnpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2Mjg4NDksImV4cCI6MjA3NjIwNDg0OX0.tzh6vU2bfxMk-rqUTtX9JaYwzp_DAaVaU_5G-VPEchg';

// Custom storage adapter for Expo SecureStore (mobile) and localStorage (web)
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === 'web') {
      return Promise.resolve(localStorage.getItem(key));
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
