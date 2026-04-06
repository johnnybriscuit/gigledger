import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { supabase } from '../lib/supabase';
import {
  getStoredTrustedDeviceToken,
  getVerifiedTOTPFactor,
  logSecurityEvent,
  verifyTrustedDevice,
  type MFAFactor,
} from '../lib/mfa';
import {
  consumePendingSignup,
  trackEmailVerified,
  trackLogin,
  trackSignUp,
} from '../lib/analytics';
import { track } from '../lib/tracking';

interface AuthCallbackScreenProps {
  oauthCallbackUrl?: string | null;
  onNavigateToMFASetup?: () => void;
  onNavigateToMFAVerify?: (factor: MFAFactor) => void;
  onNavigateToDashboard?: () => void;
  onNavigateToAuth?: () => void;
}

export function AuthCallbackScreen({ 
  oauthCallbackUrl,
  onNavigateToMFASetup, 
  onNavigateToMFAVerify,
  onNavigateToDashboard,
  onNavigateToAuth 
}: AuthCallbackScreenProps = {}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, [oauthCallbackUrl]);

  const handleCallback = async () => {
    try {
      // For native platforms, check if we have a deep link URL with OAuth params
      if (Platform.OS !== 'web') {
        // Use the URL passed from App.tsx (from deep link handler)
        const url = oauthCallbackUrl || await Linking.getInitialURL();
        console.log('[AuthCallback] OAuth callback URL:', url);
        
        if (url) {
          const { queryParams } = Linking.parse(url);
          console.log('[AuthCallback] Query params:', Object.keys(queryParams || {}));
          
          // Handle OAuth tokens from deep link
          const accessToken = queryParams?.access_token as string | undefined;
          const refreshToken = queryParams?.refresh_token as string | undefined;
          const code = queryParams?.code as string | undefined;
          
          if (accessToken && refreshToken) {
            console.log('[AuthCallback] Setting session from access_token + refresh_token');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              console.error('[AuthCallback] Failed to set session:', sessionError);
              throw sessionError;
            }
          } else if (code) {
            console.log('[AuthCallback] Exchanging code for session');
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error('[AuthCallback] Failed to exchange code:', exchangeError);
              throw exchangeError;
            }
          } else {
            console.log('[AuthCallback] No OAuth params found in deep link, checking existing session');
          }
        }
      }
      
      // Get the current session (either just set above, or existing from web OAuth)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('[AuthCallback] Session error:', sessionError);
        
        // Check for specific OAuth errors
        if (sessionError.message?.includes('access_denied')) {
          await logSecurityEvent('oauth_google_error', { error: 'access_denied' }, false);
          setError('You denied access to Google. Please try again if you want to sign in with Google.');
        } else if (sessionError.message?.includes('redirect_uri_mismatch')) {
          await logSecurityEvent('oauth_google_error', { error: 'redirect_uri_mismatch' }, false);
          setError('OAuth configuration error. Please contact support.');
        } else if (sessionError.message?.includes('origin_mismatch')) {
          await logSecurityEvent('oauth_google_error', { error: 'origin_mismatch' }, false);
          setError('OAuth origin mismatch. Please contact support.');
        } else {
          await logSecurityEvent('oauth_callback_error', { error: sessionError.message }, false);
          setError(sessionError.message || 'Authentication failed.');
        }
        setLoading(false);
        return;
      }

      if (!session) {
        setError('Your sign-in link is invalid or has expired.');
        setLoading(false);
        return;
      }

      console.log('[AuthCallback] Session established for:', session.user.email);
      const pendingSignupMethod = consumePendingSignup();
      const isSignupCompletion = !!pendingSignupMethod;

      // Check if this is an OAuth login (Google)
      const isOAuth = session.user.app_metadata?.provider === 'google' || 
                      session.user.identities?.some(id => id.provider === 'google');
      
      if (isOAuth) {
        console.log('[AuthCallback] OAuth (Google) login detected');
        await logSecurityEvent('oauth_google_success', { 
          email: session.user.email,
          provider: 'google',
        });
      }

      if (isSignupCompletion && pendingSignupMethod) {
        if (pendingSignupMethod !== 'google') {
          trackEmailVerified({ method: pendingSignupMethod });
        }

        trackSignUp(pendingSignupMethod);
        track('sign_up', { method: pendingSignupMethod });
      } else {
        const loginMethod = isOAuth ? 'google' : 'magic_link';
        trackLogin(loginMethod);
        track('login', { method: loginMethod });
      }

      const verifiedFactor = await getVerifiedTOTPFactor();
      console.log('[AuthCallback] MFA check - has verified factor:', !!verifiedFactor);

      if (!verifiedFactor) {
        // First time login - redirect to MFA setup
        console.log('[AuthCallback] Redirecting to MFA setup');
        setLoading(false);
        onNavigateToMFASetup?.();
      } else {
        const trustedDeviceToken = await getStoredTrustedDeviceToken();
        const isTrustedDevice = trustedDeviceToken
          ? await verifyTrustedDevice(trustedDeviceToken)
          : false;

        if (isTrustedDevice) {
          console.log('[AuthCallback] Trusted device verified, redirecting to dashboard');
          setLoading(false);
          onNavigateToDashboard?.();
          return;
        }

        console.log('[AuthCallback] Redirecting to MFA verification');
        setLoading(false);
        onNavigateToMFAVerify?.(verifiedFactor);
      }
    } catch (err: any) {
      console.error('[AuthCallback] Error:', err);
      setError(err.message || 'An error occurred during sign-in.');
      setLoading(false);
    }
  };

  const handleResendLink = () => {
    onNavigateToAuth?.();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Signing you in...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Sign-in failed</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.button} onPress={handleResendLink}>
          <Text style={styles.buttonText}>Request a new link</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
