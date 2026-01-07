/**
 * User Context - Shared user and tax profile data
 * Eliminates N+1 query problem by fetching once and sharing across components
 */

import React, { createContext, useContext, ReactNode } from 'react';
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
  // Fetch user once
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const userId = user?.id || null;

  // Fetch profile once
  const { data: profile, isLoading: profileLoading } = useProfile(userId || undefined);

  // Fetch tax profile once
  const { data: taxProfile, isLoading: taxProfileLoading } = useTaxProfile();

  const isLoading = userLoading || profileLoading || taxProfileLoading;
  const isReady = !isLoading && !!user && !!profile;

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
