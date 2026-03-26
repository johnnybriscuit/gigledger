import React, { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { UserProvider } from './src/contexts/UserContext';
import { supabase } from './src/lib/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
import { AuthCallbackScreen } from './src/screens/AuthCallbackScreen';
import { CheckEmailScreen } from './src/screens/CheckEmailScreen';
import { ForgotPasswordScreen } from './src/screens/ForgotPasswordScreen';
import { ResetPasswordScreen } from './src/screens/ResetPasswordScreen';
import { MFAOnboardingScreen } from './src/screens/MFAOnboardingScreen';
import { MFAVerifyScreen } from './src/screens/MFAVerifyScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { TermsScreen } from './src/screens/TermsScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
import { SupportScreen } from './src/screens/SupportScreen';
import { BusinessStructuresScreen } from './src/screens/BusinessStructuresScreen';
import { PublicLandingPage } from './src/screens/PublicLandingPage';
import { PublicInvoiceView } from './src/screens/PublicInvoiceView';
import { initializeUserData } from './src/services/profileService';
import { invalidateUserQueries } from './src/lib/queryKeys';
import { useAppBootstrap } from './src/hooks/useAppBootstrap';
import { LoadingScreen } from './src/components/LoadingScreen';
import { ErrorScreen } from './src/components/ErrorScreen';
import { perf } from './src/lib/performance';
import { enableQueryDebug } from './src/lib/queryDebug';
import { trackPageView } from './src/lib/analytics';
import type { Session } from '@supabase/supabase-js';
import type { MFAFactor } from './src/lib/mfa';

// Import spotlight CSS for Account page CTA highlighting
if (Platform.OS === 'web') {
  require('./src/styles/spotlight.css');
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnMount: false, // Don't refetch on component mount if data exists
      refetchOnReconnect: false, // Don't refetch on network reconnect
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh longer
      gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache longer
      retry: 1, // Only retry failed requests once
    },
  },
});

// Enable query debugging in development
if (__DEV__) {
  enableQueryDebug(queryClient);
}

function AppContent() {
  const bootstrap = useAppBootstrap();
  const getPublicInvoiceRoute = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return null;
    }

    const match = window.location.pathname.match(/^\/invoices\/([^/]+)$/);
    if (!match) {
      return null;
    }

    return {
      invoiceId: decodeURIComponent(match[1]),
      token: new URLSearchParams(window.location.search).get('token'),
    };
  };
  
  // Determine initial route from URL pathname on web
  const getInitialRoute = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname === '/terms') return 'terms';
      if (pathname === '/privacy') return 'privacy';
      if (pathname === '/support') return 'support';
      if (pathname === '/forgot-password') return 'forgot-password';
      if (pathname === '/reset-password') return 'reset-password';
      if (pathname.startsWith('/invoices/')) return 'public-invoice';
    }
    return 'landing';
  };
  
  const initialPublicInvoiceRoute = getPublicInvoiceRoute();
  const [currentRoute, setCurrentRoute] = useState<'landing' | 'auth' | 'onboarding' | 'dashboard' | 'terms' | 'privacy' | 'support' | 'business-structures' | 'mfa-setup' | 'mfa-verify' | 'public-invoice' | 'auth-callback' | 'check-email' | 'forgot-password' | 'reset-password'>(getInitialRoute());
  const [authResolved, setAuthResolved] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [onboardingJustCompleted, setOnboardingJustCompleted] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [oauthCallbackUrl, setOauthCallbackUrl] = useState<string | null>(null);
  const [pendingMfaFactor, setPendingMfaFactor] = useState<MFAFactor | null>(null);
  const [publicInvoiceRoute, setPublicInvoiceRoute] = useState(initialPublicInvoiceRoute);

  // Sync URL with current route on web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const routeToPath: Record<string, string> = {
        'landing': '/',
        'auth': '/',
        'terms': '/terms',
        'privacy': '/privacy',
        'support': '/support',
        'forgot-password': '/forgot-password',
        'reset-password': '/reset-password',
      };
      
      const targetPath = routeToPath[currentRoute];
      if (!targetPath) {
        return;
      }
      if (window.location.pathname !== targetPath) {
        window.history.pushState({}, '', targetPath);
      }
    }
  }, [currentRoute]);

  // Track page views on route changes
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      trackPageView(currentRoute, document.title);
    }
  }, [currentRoute]);

  // Resolve auth state on mount to prevent landing page flash
  useEffect(() => {
    async function resolveAuth() {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('[Auth] Initial session resolved:', !!currentSession);
        
        // If we have a session, validate that the user actually exists
        if (currentSession) {
          console.log('[Auth] Validating session user exists in database...');
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          
          if (userError || !user) {
            console.error('🔴 [Auth] Session validation failed - user deleted or invalid');
            console.log('🔴 [Auth] Clearing stale session and cached data');
            await supabase.auth.signOut();
            queryClient.clear();
            if (Platform.OS === 'web') {
              localStorage.clear();
              sessionStorage.clear();
            }
            setSession(null);
            setAuthResolved(true);
            setCurrentRoute('auth');
            return;
          }
          
          console.log('✅ [Auth] Session validated successfully');
        }
        
        setSession(currentSession);
        setAuthResolved(true);
        
        // If user has session and is on landing, redirect to dashboard
        if (currentSession && currentRoute === 'landing') {
          console.log('[Auth] Session exists on landing, redirecting to dashboard');
          setCurrentRoute('dashboard');
        }
      } catch (error) {
        console.error('[Auth] Failed to resolve session:', error);
        setAuthResolved(true); // Still mark as resolved to avoid infinite loading
      }
    }
    resolveAuth();
  }, []);

  // Mark when bootstrap completes and auto-route authenticated users
  useEffect(() => {
    if (bootstrap.status === 'ready') {
      perf.mark('bootstrap-ready');
      console.log('[Perf] Bootstrap ready. View full report with: perf.getReport()');
      
      // Auto-route to dashboard if user just logged in and is still on landing/auth route
      if (currentRoute === 'landing' || currentRoute === 'auth') {
        console.log('[Routing] User authenticated, redirecting to dashboard');
        setCurrentRoute('dashboard');
      }
    }
  }, [bootstrap.status, currentRoute]);

  // Listen for auth changes (sign out, token refresh failures)
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🟢 Auth state changed:', event, 'Session:', !!newSession);
      setSession(newSession);
      setAuthResolved(true);
      
      // Clear all cached data on sign out to prevent data leakage
      if (event === 'SIGNED_OUT') {
        console.log('🟢 SIGNED_OUT event detected, clearing cache and redirecting to auth');
        queryClient.clear();
        if (Platform.OS === 'web') {
          localStorage.clear();
          sessionStorage.clear();
        }
        // Force re-render by resetting route
        setCurrentRoute('auth');
      }
      
      // Handle token refresh failures (user deleted or invalid session)
      if (event === 'TOKEN_REFRESHED' && !newSession) {
        console.error('🔴 Token refresh failed - session invalid, user may have been deleted');
        console.log('🔴 Signing out and clearing all cached data');
        await supabase.auth.signOut();
        queryClient.clear();
        if (Platform.OS === 'web') {
          localStorage.clear();
          sessionStorage.clear();
        }
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
        console.log('[DeepLink] Auth callback detected, storing URL and navigating to auth-callback screen');
        setOauthCallbackUrl(url);
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

  // AUTH RESOLUTION GATE - Prevent landing page flash on refresh
  if (!authResolved) {
    return <LoadingScreen />;
  }

  // PUBLIC ROUTES - Check these BEFORE bootstrap to avoid timeout on public pages
  
  // Landing page - shown first to all users (NO AppShell, NO bootstrap required)
  // Only show if session is null (logged out)
  if (currentRoute === 'landing' && !session) {
    return (
      <>
        <StatusBar style="dark" />
        <PublicLandingPage 
          onGetStarted={() => {
            setAuthMode('signup');
            setCurrentRoute('auth');
          }}
          onSignIn={() => {
            setAuthMode('signin');
            setCurrentRoute('auth');
          }}
          onNavigateToTerms={() => setCurrentRoute('terms')}
          onNavigateToPrivacy={() => setCurrentRoute('privacy')}
          onNavigateToSupport={() => setCurrentRoute('support')}
        />
      </>
    );
  }

  // Allow Terms page to be accessed without authentication (NO bootstrap required)
  if (currentRoute === 'terms') {
    return (
      <>
        <StatusBar style="dark" />
        <TermsScreen onNavigateBack={() => setCurrentRoute('landing')} />
      </>
    );
  }

  // Allow Privacy page to be accessed without authentication (NO bootstrap required)
  if (currentRoute === 'privacy') {
    return (
      <>
        <StatusBar style="dark" />
        <PrivacyScreen onNavigateBack={() => setCurrentRoute('landing')} />
      </>
    );
  }

  // Allow Support page to be accessed without authentication (NO bootstrap required)
  if (currentRoute === 'support') {
    return (
      <>
        <StatusBar style="dark" />
        <SupportScreen 
          onNavigateBack={() => setCurrentRoute('landing')} 
          onNavigateToSignIn={() => {
            setAuthMode('signin');
            setCurrentRoute('auth');
          }}
        />
      </>
    );
  }

  if (currentRoute === 'public-invoice' && publicInvoiceRoute) {
    return (
      <>
        <StatusBar style="dark" />
        <PublicInvoiceView
          invoiceId={publicInvoiceRoute.invoiceId}
          token={publicInvoiceRoute.token}
        />
      </>
    );
  }

  // AUTHENTICATED ROUTES - Bootstrap required beyond this point
  
  // Bootstrap loading state
  if (bootstrap.status === 'loading') {
    return <LoadingScreen />;
  }

  // Bootstrap error state
  if (bootstrap.status === 'error') {
    return <ErrorScreen error={bootstrap.error} onRetry={bootstrap.retry} />;
  }

  // Allow Business Structures page (requires authentication)
  if (currentRoute === 'business-structures' && bootstrap.session) {
    return (
      <>
        <StatusBar style="dark" />
        <UserProvider>
          <BusinessStructuresScreen 
            onNavigateBack={() => setCurrentRoute('dashboard')} 
            onNavigateToSubscription={() => setCurrentRoute('dashboard')}
          />
        </UserProvider>
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
        <ForgotPasswordScreen onBack={() => setCurrentRoute('landing')} />
      </>
    );
  }

  // Reset Password (no session required initially, but will be created by recovery link)
  if (currentRoute === 'reset-password') {
    return (
      <>
        <StatusBar style="dark" />
        <ResetPasswordScreen 
          onSuccess={() => setCurrentRoute('landing')}
          onBack={() => setCurrentRoute('landing')}
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
          initialMode={authMode}
          onNavigateToTerms={() => setCurrentRoute('terms')}
          onNavigateToPrivacy={() => setCurrentRoute('privacy')}
          onNavigateToSupport={() => setCurrentRoute('support')}
          onNavigateToForgotPassword={() => setCurrentRoute('forgot-password')}
          onNavigateToHome={() => setCurrentRoute('landing')}
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
  if (currentRoute === 'mfa-verify' && pendingMfaFactor) {
    return (
      <>
        <StatusBar style="dark" />
        <MFAVerifyScreen
          factor={pendingMfaFactor}
          onVerified={() => {
            setPendingMfaFactor(null);
            setCurrentRoute('dashboard');
          }}
          onCancel={() => {
            setPendingMfaFactor(null);
            setCurrentRoute('auth');
          }}
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
          oauthCallbackUrl={oauthCallbackUrl}
          onNavigateToMFASetup={() => setCurrentRoute('mfa-setup')}
          onNavigateToMFAVerify={(factor) => {
            setPendingMfaFactor(factor);
            setCurrentRoute('mfa-verify');
          }}
          onNavigateToDashboard={() => setCurrentRoute('dashboard')}
          onNavigateToAuth={() => setCurrentRoute('auth')}
        />
      </>
    );
  }

  // Bootstrap ready - check if needs onboarding (unless just completed)
  if (bootstrap.needsOnboarding && !onboardingJustCompleted) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingFlow
          onComplete={() => {
            console.log('🔵 [App] OnboardingFlow onComplete called');
            console.log('🔵 [App] Setting onboardingJustCompleted flag to bypass needsOnboarding check');
            // Invalidate user queries after onboarding
            if (bootstrap.session?.user) {
              console.log('🔵 [App] Invalidating user queries for:', bootstrap.session.user.id);
              invalidateUserQueries(queryClient, bootstrap.session.user.id);
            }
            // Set flag to bypass onboarding check and render dashboard
            setOnboardingJustCompleted(true);
            console.log('🔵 [App] Flag set - component will re-render and show dashboard');
          }}
        />
      </>
    );
  }

  console.log('🔵 [App] Rendering dashboard - bootstrap complete, onboarding not needed');

  return (
    <>
      <StatusBar style="dark" />
      <UserProvider>
        <DashboardScreen onNavigateToBusinessStructures={() => setCurrentRoute('business-structures')} />
      </UserProvider>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
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
