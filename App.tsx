import React, { useState, useEffect, useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { supabase } from './src/lib/supabase';
import { AuthScreen } from './src/screens/AuthScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { OnboardingFlow } from './src/screens/OnboardingFlow';
import { TermsScreen } from './src/screens/TermsScreen';
import { PrivacyScreen } from './src/screens/PrivacyScreen';
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
  const [checkingProfile, setCheckingProfile] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<'auth' | 'onboarding' | 'dashboard' | 'terms' | 'privacy'>('auth');

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
            setNeedsOnboarding(false);
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
            setNeedsOnboarding(false);
          } else {
            setNeedsOnboarding(!(profile as any)?.onboarding_complete);
          }
        } catch (error) {
          console.error('[App] Error in checkOnboarding:', error);
          setNeedsOnboarding(false);
        }
        setCheckingProfile(false);
      } else {
        setNeedsOnboarding(false);
      }
    }
    checkOnboarding();
  }, [session]);

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

  // Show appropriate screen based on auth and onboarding status
  if (!session) {
    return (
      <>
        <StatusBar style="dark" />
        <AuthScreen 
          onNavigateToTerms={() => setCurrentRoute('terms')}
          onNavigateToPrivacy={() => setCurrentRoute('privacy')}
        />
      </>
    );
  }

  if (needsOnboarding) {
    return (
      <>
        <StatusBar style="dark" />
        <OnboardingFlow
          onComplete={() => setNeedsOnboarding(false)}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="dark" />
      <DashboardScreen />
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
