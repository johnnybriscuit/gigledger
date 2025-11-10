import { supabase } from '../lib/supabase';

/**
 * Ensures a user profile exists for the given user ID.
 * Creates one if it doesn't exist (idempotent).
 */
export async function ensureUserProfile(userId: string, email: string) {
  try {
    // Check if profile already exists
    const { data: existing, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found, which is expected for new users
      console.error('[ensureUserProfile] Error checking existing profile:', fetchError);
      throw fetchError;
    }

    // Profile already exists
    if (existing) {
      console.log('[ensureUserProfile] Profile already exists for user:', userId);
      return { success: true, created: false };
    }

    // Create new profile
    console.log('[ensureUserProfile] Creating new profile for user:', userId);
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        email: email,
        full_name: '',
        state_code: null,
        filing_status: 'single',
      });

    if (insertError) {
      // Check if it's a duplicate key error (race condition)
      if (insertError.code === '23505') {
        console.log('[ensureUserProfile] Profile was created by another process (race condition)');
        return { success: true, created: false };
      }
      console.error('[ensureUserProfile] Error creating profile:', insertError);
      throw insertError;
    }

    console.log('[ensureUserProfile] Profile created successfully');
    return { success: true, created: true };
  } catch (error) {
    console.error('[ensureUserProfile] Unexpected error:', error);
    return { success: false, created: false, error };
  }
}

/**
 * Ensures user_settings exists for the given user ID.
 * Creates one if it doesn't exist (idempotent).
 */
export async function ensureUserSettings(userId: string) {
  try {
    // Check if settings already exist
    const { data: existing, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[ensureUserSettings] Error checking existing settings:', fetchError);
      throw fetchError;
    }

    // Settings already exist
    if (existing) {
      console.log('[ensureUserSettings] Settings already exist for user:', userId);
      return { success: true, created: false };
    }

    // Create new settings
    console.log('[ensureUserSettings] Creating new settings for user:', userId);
    const { error: insertError } = await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        onboarding_completed: false,
        onboarding_step: 'welcome',
      });

    if (insertError) {
      // Check if it's a duplicate key error (race condition)
      if (insertError.code === '23505') {
        console.log('[ensureUserSettings] Settings were created by another process (race condition)');
        return { success: true, created: false };
      }
      console.error('[ensureUserSettings] Error creating settings:', insertError);
      throw insertError;
    }

    console.log('[ensureUserSettings] Settings created successfully');
    return { success: true, created: true };
  } catch (error) {
    console.error('[ensureUserSettings] Unexpected error:', error);
    return { success: false, created: false, error };
  }
}

/**
 * Initializes all user data after sign-up or first login.
 * Ensures profile and settings exist.
 */
export async function initializeUserData(userId: string, email: string) {
  console.log('[initializeUserData] Initializing data for user:', userId);
  
  const profileResult = await ensureUserProfile(userId, email);
  const settingsResult = await ensureUserSettings(userId);

  return {
    profile: profileResult,
    settings: settingsResult,
  };
}
