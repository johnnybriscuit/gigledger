/**
 * AppBootstrap Hook
 * 
 * Single source of truth for app readiness state.
 * Ensures all critical data is loaded before rendering main app.
 * 
 * Critical path:
 * 1. Session exists
 * 2. Profile loaded (includes onboarding_complete)
 * 3. Settings loaded (if needed)
 * 4. Tax profile loaded (for dashboard)
 * 
 * Non-critical (prefetched but non-blocking):
 * - Gigs list
 * - Payers list
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../lib/queryKeys';
import { initializeUserData } from '../services/profileService';
import type { Session } from '@supabase/supabase-js';
import type { TaxProfile } from '../tax/engine';
import type { StateCode } from '../tax/config/2025';

export interface BootstrapStatus {
  status: 'loading' | 'ready' | 'error' | 'unauthenticated';
  error?: string;
  debug: {
    sessionChecked: boolean;
    profileLoaded: boolean;
    settingsLoaded: boolean;
    taxProfileLoaded: boolean;
    onboardingChecked: boolean;
  };
  session: Session | null;
  needsOnboarding: boolean;
}

const BOOTSTRAP_TIMEOUT = 15000; // 15 seconds

export function useAppBootstrap() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<BootstrapStatus>({
    status: 'loading',
    debug: {
      sessionChecked: false,
      profileLoaded: false,
      settingsLoaded: false,
      taxProfileLoaded: false,
      onboardingChecked: false,
    },
    session: null,
    needsOnboarding: false,
  });

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let cancelled = false;

    async function bootstrap() {
      try {
        // Set timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (!cancelled) {
            setStatus(prev => ({
              ...prev,
              status: 'error',
              error: 'Bootstrap timed out. Please refresh the page.',
            }));
          }
        }, BOOTSTRAP_TIMEOUT);

        // Step 1: Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (cancelled) return;

        // If session check fails (e.g., CSRF token error), treat as unauthenticated
        // This allows user to proceed to login screen instead of showing error
        if (sessionError) {
          console.warn('[Bootstrap] Session error, treating as unauthenticated:', sessionError.message);
          setStatus({
            status: 'unauthenticated',
            debug: {
              sessionChecked: true,
              profileLoaded: false,
              settingsLoaded: false,
              taxProfileLoaded: false,
              onboardingChecked: false,
            },
            session: null,
            needsOnboarding: false,
          });
          return;
        }

        if (!session) {
          setStatus({
            status: 'unauthenticated',
            debug: {
              sessionChecked: true,
              profileLoaded: false,
              settingsLoaded: false,
              taxProfileLoaded: false,
              onboardingChecked: false,
            },
            session: null,
            needsOnboarding: false,
          });
          return;
        }

        setStatus(prev => ({
          ...prev,
          debug: { ...prev.debug, sessionChecked: true },
          session,
        }));

        // Step 2: Initialize user data (idempotent)
        await initializeUserData(session.user.id, session.user.email || '');

        if (cancelled) return;

        // Step 3: Fetch critical data in parallel
        const [profileResult, taxProfileResult] = await Promise.allSettled([
          // Profile (includes onboarding_complete)
          supabase
            .from('profiles')
            .select('id, full_name, onboarding_complete, business_structure')
            .eq('id', session.user.id)
            .single(),
          
          // Tax profile
          supabase
            .from('user_tax_profile')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle(),
        ]);

        if (cancelled) return;

        // Check profile result
        if (profileResult.status === 'rejected') {
          throw new Error('Failed to load profile');
        }

        const profile = profileResult.value.data;
        if (!profile) {
          throw new Error('Profile not found');
        }

        // Cache profile data
        queryClient.setQueryData(queryKeys.profile(session.user.id), profile);

        // Check tax profile result (non-critical, just cache if available)
        if (taxProfileResult.status === 'fulfilled' && taxProfileResult.value.data) {
          // Transform raw database row to TaxProfile format (same as useTaxProfile hook)
          const row = taxProfileResult.value.data;
          const transformedProfile: TaxProfile = {
            filingStatus: row.filing_status as TaxProfile['filingStatus'],
            state: row.state as StateCode,
            county: row.county || undefined,
            nycResident: row.nyc_resident || undefined,
            yonkersResident: row.yonkers_resident || undefined,
            deductionMethod: row.deduction_method as 'standard' | 'itemized',
            itemizedAmount: row.itemized_amount || undefined,
            seIncome: row.se_income,
          };
          queryClient.setQueryData(queryKeys.taxProfile(session.user.id), transformedProfile);
        }

        if (cancelled) return;

        // Step 4: Prefetch dashboard data (non-blocking)
        // Fire and forget - don't wait for these
        Promise.allSettled([
          queryClient.prefetchQuery({
            queryKey: queryKeys.gigs(session.user.id),
            queryFn: async () => {
              const { data } = await supabase
                .from('gigs')
                .select(`
                  *,
                  payer:payers(id, name, payer_type),
                  expenses(id, category, description, amount, notes),
                  mileage(id, miles, notes)
                `)
                .eq('user_id', session.user.id)
                .order('date', { ascending: false });
              return data;
            },
          }),
          queryClient.prefetchQuery({
            queryKey: queryKeys.payers(session.user.id),
            queryFn: async () => {
              const { data } = await supabase
                .from('payers')
                .select('*')
                .eq('user_id', session.user.id)
                .order('name');
              return data;
            },
          }),
        ]).catch(err => {
          console.warn('[Bootstrap] Prefetch failed (non-critical):', err);
        });

        // Bootstrap complete
        setStatus({
          status: 'ready',
          debug: {
            sessionChecked: true,
            profileLoaded: true,
            settingsLoaded: true,
            taxProfileLoaded: taxProfileResult.status === 'fulfilled',
            onboardingChecked: true,
          },
          session,
          needsOnboarding: !profile.onboarding_complete,
        });

        clearTimeout(timeoutId);
      } catch (error: any) {
        if (!cancelled) {
          console.error('[Bootstrap] Error:', error);
          setStatus(prev => ({
            ...prev,
            status: 'error',
            error: error.message || 'Failed to initialize app',
          }));
          clearTimeout(timeoutId);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [queryClient]);

  const retry = () => {
    setStatus({
      status: 'loading',
      debug: {
        sessionChecked: false,
        profileLoaded: false,
        settingsLoaded: false,
        taxProfileLoaded: false,
        onboardingChecked: false,
      },
      session: null,
      needsOnboarding: false,
    });
  };

  return { ...status, retry };
}
