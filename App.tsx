import React, { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { supabase } from './src/lib/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
import { AuthCallbackScreen } from './src/screens/AuthCallbackScreen';
import { CheckEmailScreen } from './src/screens/CheckEmailScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { MFAOnboardingScreen } from './src/screens/MFAOnboardingScreen';
import { MFAChallengeScreen } from './src/screens/MFAChallengeScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { TermsScreen } from './src/screens/TermsScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { BusinessStructuresScreen } from './src/screens/BusinessStructuresScreen';
import { initializeUserData } from './src/services/profileService';
import type { Session } from '@supabase/supabase-js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      refetchOnReconnect: false, // Don't refetch on network reconnect
      staleTime: Infinity, // Data never goes stale unless manually invalidated
      gcTime: Infinity, // Keep data in cache indefinitely (formerly cacheTime)
      retry: 1, // Only retry failed requests once
    },
  },
});

function AppContent() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [needsMFA, setNeedsMFA] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<'auth' | 'onboarding' | 'dashboard' | 'terms' | 'privacy' | 'business-structures' | 'mfa-setup' | 'mfa-challenge' | 'auth-callback' | 'check-email' | 'forgot-password' | 'reset-password'>('auth');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Only update session on actual auth events, not on token refresh
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        setSession(session);
        
        // Clear all cached data on sign out to prevent data leakage
        if (event === 'SIGNED_OUT') {
          queryClient.clear();
        }
        
        // Refetch all data on sign in to get the new user's data
        if (event === 'SIGNED_IN' && session?.user) {
          // Ensure user profile and settings exist (idempotent)
          initializeUserData(session.user.id, session.user.email || '').catch(err => {
            console.error('[App] Error initializing user data:', err);
          });
          queryClient.invalidateQueries();
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if user needs onboarding when session changes
  useEffect(() => {
    async function checkOnboarding() {
      if (session) {
        setCheckingProfile(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error('[App] No user found in session');
            setCheckingProfile(false);
            return;
          }

          const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarding_complete')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('[App] Error checking onboarding status:', error);
          } else {
            setNeedsOnboarding(!(profile as any)?.onboarding_complete);
          }
        } catch (error) {
          console.error('[App] Error in checkOnboarding:', error);
        }
        setCheckingProfile(false);
      } else {
        setNeedsOnboarding(false);
      }
    }
    checkOnboarding();
  }, [session]);

  // Handle deep links for OAuth callback on native
  useEffect(() => {
    const handleDeepLink = async (url: string) => {
      console.log('[DeepLink] Received URL:', url);
      
      // Parse the URL
      const { hostname, path, queryParams } = Linking.parse(url);
      
      console.log('[DeepLink] Parsed - hostname:', hostname, 'path:', path);
      
      // Handle auth callback from OAuth (Google)
      // Only navigate to callback screen if we're not already there
      if ((path === 'auth/callback' || path === '/auth/callback') && currentRoute !== 'auth-callback') {
        console.log('[DeepLink] Auth callback detected, navigating to auth-callback screen');
        setCurrentRoute('auth-callback');
      }
    };

    // Get initial URL (if app was opened via deep link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('[DeepLink] Initial URL:', url);
        handleDeepLink(url);
      }
    });

    // Listen for deep link events while app is running
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('[DeepLink] Event URL:', event.url);
      handleDeepLink(event.url);
    });

    return () => subscription.remove();
  }, [currentRoute]);

  // Don't show loading after initial load to prevent unmounting
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Allow Terms page to be accessed without authentication
  if (currentRoute === 'terms') {
    return (
      <>
        <StatusBar style="dark" />
        <TermsScreen onNavigateBack={() => setCurrentRoute('auth')} />
      </>
    );
  }

  // Allow Privacy page to be accessed without authentication
  if (currentRoute === 'privacy') {
    return (
      <>
        <StatusBar style="dark" />
        <PrivacyScreen onNavigateBack={() => setCurrentRoute('auth')} />
      </>
    );
  }

  // Allow Business Structures page (requires authentication)
  if (currentRoute === 'business-structures' && session) {
    return (
      <>
        <StatusBar style="dark" />
        <BusinessStructuresScreen 
          onNavigateBack={() => setCurrentRoute('dashboard')} 
          onNavigateToSubscription={() => setCurrentRoute('dashboard')}
        />
      </>
    );
  }

  // Check email verification screen
  if (currentRoute === 'check-email' && session) {
    return (
      <>
        <StatusBar style="dark" />
        <CheckEmailScreen
          email={session.user.email || ''}
          onVerified={() => {
            setEmailVerified(true);
            setCurrentRoute('dashboard');
          }}
          onResend={async () => {
            try {
              const SITE_URL = Constants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
              if (!SITE_URL) {
                alert('Configuration error: SITE_URL not set');
                return;
              }
              
              await supabase.auth.resend({
                type: 'signup',
                email: session.user.email || '',
                options: {
                  emailRedirectTo: `${SITE_URL}/auth/callback`,
                },
              });
              alert('Verification email sent!');
            } catch (error: any) {
              alert(error.message || 'Failed to resend email');
            }
          }}
        />
      </>
    );
  }

  // Forgot Password (no session required)
  if (currentRoute === 'forgot-password') {
    return (
      <>
        <StatusBar style="dark" />
        <ForgotPasswordScreen onBack={() => setCurrentRoute('auth')} />
      </>
    );
  }

  // Reset Password (no session required initially, but will be created by recovery link)
  if (currentRoute === 'reset-password') {
    return (
      <>
        <StatusBar style="dark" />
        <ResetPasswordScreen 
          onSuccess={() => setCurrentRoute('auth')}
          onBack={() => setCurrentRoute('auth')}
        />
      </>
    );
  }

  // Show appropriate screen based on auth and onboarding status
  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthScreen 
          onNavigateToTerms={() => setCurrentRoute('terms')}
          onNavigateToPrivacy={() => setCurrentRoute('privacy')}
          onNavigateToForgotPassword={() => setCurrentRoute('forgot-password')}
        />
      </>
    );
  }

  // Block access if email not verified
  if (session && !session.user.email_confirmed_at) {
    if (currentRoute !== 'check-email') {
      setCurrentRoute('check-email');
    }
    return null; // Will render check-email screen above
  }

  // MFA Setup (first-time after auth)
  if (currentRoute === 'mfa-setup') {
    return (
      <>
        <StatusBar style="dark" />
        <MFAOnboardingScreen 
          onNavigateToDashboard={() => setCurrentRoute('dashboard')}
        />
      </>
    );
  }

  // MFA Challenge (returning users)
  if (currentRoute === 'mfa-challenge') {
    return (
      <>
        <StatusBar style="dark" />
        <MFAChallengeScreen 
          onNavigateToDashboard={() => setCurrentRoute('dashboard')}
          onNavigateToAuth={() => setCurrentRoute('auth')}
        />
      </>
    );
  }

  // Auth Callback (magic link handler)
  if (currentRoute === 'auth-callback') {
    return (
      <>
        <StatusBar style="dark" />
        <AuthCallbackScreen 
          onNavigateToMFASetup={() => setCurrentRoute('mfa-setup')}
          onNavigateToDashboard={() => setCurrentRoute('dashboard')}
          onNavigateToAuth={() => setCurrentRoute('auth')}
        />
      </>
    );
  }

  if (needsOnboarding) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingFlow
          onComplete={() => {
            // Invalidate all queries before transitioning to dashboard
            queryClient.invalidateQueries();
            setNeedsOnboarding(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <DashboardScreen onNavigateToBusinessStructures={() => setCurrentRoute('business-structures')} />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
});
