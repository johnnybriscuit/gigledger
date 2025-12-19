import React, { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
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
import { invalidateUserQueries } from './src/lib/queryKeys';
import { useAppBootstrap } from './src/hooks/useAppBootstrap';
import { LoadingScreen } from './src/components/LoadingScreen';
import { ErrorScreen } from './src/components/ErrorScreen';
import { perf } from './src/lib/performance';
import type { Session } from '@supabase/supabase-js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      refetchOnReconnect: false, // Don't refetch on network reconnect
      staleTime: 60000, // 1 minute - balance freshness with performance
      gcTime: 300000, // 5 minutes - keep data in cache for reasonable time
      retry: 1, // Only retry failed requests once
    },
  },
});

function AppContent() {
  const bootstrap = useAppBootstrap();
  const [currentRoute, setCurrentRoute] = useState<'auth' | 'onboarding' | 'dashboard' | 'terms' | 'privacy' | 'business-structures' | 'mfa-setup' | 'mfa-challenge' | 'auth-callback' | 'check-email' | 'forgot-password' | 'reset-password'>('auth');

  // Mark when bootstrap completes
  useEffect(() => {
    if (bootstrap.status === 'ready') {
      perf.mark('bootstrap-ready');
      console.log('[Perf] Bootstrap ready. View full report with: perf.getReport()');
    }
  }, [bootstrap.status]);

  // Listen for auth changes (sign out)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🟢 Auth state changed:', event, 'Session:', !!session);
      // Clear all cached data on sign out to prevent data leakage
      if (event === 'SIGNED_OUT') {
        console.log('🟢 SIGNED_OUT event detected, clearing cache and redirecting to auth');
        queryClient.clear();
        // Force re-render by resetting route
        setCurrentRoute('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  // Handle deep links for OAuth callback on native
  useEffect(() => {
    // Skip deep link handling on web - it causes redirect loops
    if (Platform.OS === 'web') {
      console.log('[DeepLink] Skipping deep link handler on web platform');
      return;
    }

    const handleDeepLink = async (url: string) => {
      console.log('[DeepLink] Received URL:', url);
      
      // Parse the URL
      const { hostname, path, queryParams } = Linking.parse(url);
      
      console.log('[DeepLink] Parsed - hostname:', hostname, 'path:', path);
      
      // Handle auth callback from OAuth (Google)
      if (path === 'auth/callback' || path === '/auth/callback') {
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
  }, []);

  // Bootstrap loading state
  if (bootstrap.status === 'loading') {
    return <LoadingScreen />;
  }

  // Bootstrap error state
  if (bootstrap.status === 'error') {
    return <ErrorScreen error={bootstrap.error} onRetry={bootstrap.retry} />;
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
  if (currentRoute === 'business-structures' && bootstrap.session) {
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
  if (currentRoute === 'check-email' && bootstrap.session) {
    return (
      <>
        <StatusBar style="dark" />
        <CheckEmailScreen
          email={bootstrap.session.user.email || ''}
          onVerified={() => {
            setCurrentRoute('dashboard');
          }}
          onResend={async () => {
            try {
              const SITE_URL = Constants.expoConfig?.extra?.siteUrl || process.env.EXPO_PUBLIC_SITE_URL;
              if (!SITE_URL) {
                alert('Configuration error: SITE_URL not set');
                return;
              }
              
              if (bootstrap.session) {
                await supabase.auth.resend({
                  type: 'signup',
                  email: bootstrap.session.user.email || '',
                  options: {
                    emailRedirectTo: `${SITE_URL}/auth/callback`,
                  },
                });
              }
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

  // Unauthenticated - show auth screen
  if (bootstrap.status === 'unauthenticated') {
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
  if (bootstrap.session && !bootstrap.session.user.email_confirmed_at) {
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

  // Bootstrap ready - check if needs onboarding
  if (bootstrap.needsOnboarding) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingFlow
          onComplete={() => {
            // Invalidate user queries after onboarding
            if (bootstrap.session?.user) {
              invalidateUserQueries(queryClient, bootstrap.session.user.id);
            }
            // Trigger re-bootstrap to update needsOnboarding status
            bootstrap.retry();
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
