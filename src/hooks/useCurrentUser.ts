import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  getCachedUser,
  getSharedUser,
  syncSharedUser,
} from '../lib/sharedAuth';

export function useCurrentUser() {
  const [user, setUser] = useState<User | null>(getCachedUser() ?? null);
  const [isLoading, setIsLoading] = useState(getCachedUser() === undefined);

  useEffect(() => {
    let mounted = true;

    getSharedUser()
      .then((nextUser) => {
        if (!mounted) return;
        setUser(nextUser);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      syncSharedUser(nextUser);
      setUser(nextUser);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { data: user, isLoading };
}

export function useUserId(): string | null {
  const { data: user } = useCurrentUser();
  return user?.id || null;
}
