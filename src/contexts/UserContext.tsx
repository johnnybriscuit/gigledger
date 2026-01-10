/**
 * User Context - Shared user and tax profile data
 * Eliminates N+1 query problem by fetching once and sharing across components
 */

import React, { createContext, useContext, ReactNode, useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTaxProfile } from '../hooks/useTaxProfile';
import { useProfile } from '../hooks/useProfile';
import type { TaxProfile } from '../tax/engine';
import type { BusinessStructure } from '../hooks/useProfile';

interface UserContextValue {
  userId: string | null;
  user: {
    id: string;
    email: string;
  } | null;
  profile: {
    full_name: string | null;
    business_structure: BusinessStructure | null;
    plan: string | null;
  } | null;
  taxProfile: TaxProfile | null;
  isLoading: boolean;
  isReady: boolean;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const mountedRef = useRef(true);

  // Cleanup on unmount to prevent state updates
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Fetch user once
  const { data: user, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      console.log('🔵 [UserContext] Fetching user...');
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) {
        console.error('🔴 [UserContext] Error fetching user:', error);
        throw error;
      }
      console.log('✅ [UserContext] User fetched:', !!user);
      return user;
    },
    retry: 1,
    staleTime: 30000,
  });

  const userId = user?.id || null;

  // Fetch profile once - CRITICAL: Only fetch if we have a userId
  const { data: profile, isLoading: profileLoading, error: profileError } = useProfile(userId || undefined);

  // Fetch tax profile once
  const { data: taxProfile, isLoading: taxProfileLoading, error: taxProfileError } = useTaxProfile();

  // CRITICAL FIX: Don't stay loading forever if userId is null
  // Profile and taxProfile queries are disabled when userId is null, so they'll never resolve
  // We should only wait for them if userId exists
  const isLoading = userLoading || (userId ? (profileLoading || taxProfileLoading) : false);
  const isReady = !isLoading && !!user && !!profile;

  // Safety timeout: If loading for more than 10 seconds, force ready state
  useEffect(() => {
    if (isLoading) {
      const timeout = setTimeout(() => {
        if (!mountedRef.current) return; // Don't update state if unmounted
        
        console.error('🔴 [UserContext] Loading timeout after 10 seconds!');
        console.error('🔴 [UserContext] State:', {
          userLoading,
          profileLoading,
          taxProfileLoading,
          userId: !!userId,
          hasUser: !!user,
          hasProfile: !!profile,
          userError,
          profileError,
          taxProfileError,
        });
        setLoadingTimeout(true);
      }, 10000);

      return () => clearTimeout(timeout);
    }
  }, [isLoading, userLoading, profileLoading, taxProfileLoading, userId, user, profile, userError, profileError, taxProfileError]);

  // Log loading state for debugging
  if (isLoading || loadingTimeout) {
    console.log('🔵 [UserContext] Loading state:', {
      userLoading,
      profileLoading,
      taxProfileLoading,
      userId: !!userId,
      hasUser: !!user,
      hasProfile: !!profile,
      hasTaxProfile: !!taxProfile,
      isLoading,
      isReady,
      loadingTimeout,
      errors: {
        userError: userError?.message,
        profileError: profileError?.message,
        taxProfileError: taxProfileError?.message,
      },
    });
  }

  // If timeout occurred, log error and continue anyway
  if (loadingTimeout && isLoading) {
    console.error('🔴 [UserContext] CRITICAL: Forcing ready state due to timeout');
  }

  const value: UserContextValue = {
    userId,
    user: user ? {
      id: user.id,
      email: user.email || '',
    } : null,
    profile: profile ? {
      full_name: profile.full_name || null,
      business_structure: profile.business_structure || null,
      plan: (profile as any).plan || null,
    } : null,
    taxProfile: taxProfile || null,
    isLoading,
    isReady,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
