import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useState, useEffect } from 'react';
import { getSharedUserId } from '../lib/sharedAuth';

export interface BetaTester {
  id: string;
  email: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useBetaTester() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  
  useEffect(() => {
    async function fetchUserInfo() {
      const id = await getSharedUserId();
      setUserId(id);
      
      if (id) {
        const { data: { user } } = await supabase.auth.getUser();
        setUserEmail(user?.email || null);
      }
    }
    
    fetchUserInfo();
  }, []);
  
  return useQuery({
    queryKey: userEmail ? queryKeys.betaTester(userEmail) : ['beta-tester-loading'],
    queryFn: async () => {
      if (!userEmail) return null;

      const { data, error } = await (supabase as any)
        .from('beta_testers')
        .select('*')
        .eq('email', userEmail)
        .eq('active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data as BetaTester;
    },
    enabled: !!userEmail,
    staleTime: 5 * 60 * 1000,
  });
}

export function useIsBetaTester(): boolean {
  const { data: betaTester } = useBetaTester();
  return !!betaTester && betaTester.active;
}
