import React, { useState } from 'react';
import { Platform } from 'react-native';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingTaxInfo } from './OnboardingTaxInfo';
import { OnboardingBusinessStructure } from './OnboardingBusinessStructure';
import { BucketSetupScreen } from './BucketSetupScreen';
import { OnboardingAddPayer } from './OnboardingAddPayer';
import { OnboardingAddGig } from './OnboardingAddGig';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../lib/supabase';
import { useTaxProfile } from '../hooks/useTaxProfile';
import { createDefaultBuckets } from '../lib/createDefaultBuckets';
import { trackOnboardingComplete, trackFirstGigCreated } from '../lib/analytics';
import { createAllocationForGig } from '../hooks/useAllocationTransactions';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [payerId, setPayerId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { preference: themePreference, setTheme } = useTheme();
  const { data: taxProfile } = useTaxProfile();

  const createBuckets = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await createDefaultBuckets(user.id, taxProfile?.state ?? null);
      }
    } catch (error) {
      console.error('[OnboardingFlow] Error creating default buckets:', error);
    }
  };

  const persistCompletion = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('[OnboardingFlow] Error getting user for completion:', userError);
        return;
      }
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_complete: true })
        .eq('id', user.id);
      if (profileError) {
        console.error('[OnboardingFlow] Error updating profile:', profileError);
      }
      const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          onboarding_completed: true,
          onboarding_step: 'done',
        }, { onConflict: 'user_id' });
      if (settingsError) {
        console.error('[OnboardingFlow] Error updating user_settings:', settingsError);
      }
    } catch (error) {
      console.error('[OnboardingFlow] Unexpected error persisting completion:', error);
    }
  };

  const handleComplete = async (gigCreated = false, gigId?: string) => {

    if (Platform.OS === 'web') {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('bozzy_coach_tip')) localStorage.removeItem(key);
      });
      if (!themePreference) {
        setTheme('light');
      }
      sessionStorage.setItem('show_dashboard_tour', 'true');
      sessionStorage.setItem('onboarding_just_completed', 'true');
      sessionStorage.setItem('onboarding_v2_completed', 'true');
    }

    await persistCompletion();

    // Auto-backfill safety net: if paid gigs exist but no allocation_transactions yet, create them now
    if (gigCreated) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { count: allocCount } = await supabase
            .from('allocation_transactions')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          if ((allocCount ?? 0) === 0) {
            const { data: paidGigs } = await supabase
              .from('gigs')
              .select('id, gross_amount, date')
              .eq('user_id', user.id)
              .eq('paid', true)
              .gt('gross_amount', 0);
            if (paidGigs && paidGigs.length > 0) {
              await Promise.allSettled(
                paidGigs.map(g =>
                  createAllocationForGig(user.id, {
                    gigId: g.id,
                    grossAmount: g.gross_amount,
                    gigDate: g.date ?? undefined,
                  })
                )
              );
            }
          }
        }
      } catch (err) {
        console.error('[OnboardingFlow] Auto-backfill error (non-fatal):', err);
      }
    }

    trackOnboardingComplete({ activation_type: gigCreated ? 'first_gig' : 'first_action' });
    if (gigCreated && gigId) {
      trackFirstGigCreated({ entity_id: gigId, source: 'onboarding' });
    }

    queryClient.invalidateQueries();
    onComplete();
  };

  // Step 1 — Welcome (no skip)
  if (step === 1) {
    return (
      <OnboardingWelcome
        onNext={() => setStep(2)}
        onSkip={() => setStep(2)}
      />
    );
  }

  // Step 2 — Tax Info (no skip, critical)
  if (step === 2) {
    return (
      <OnboardingTaxInfo
        onComplete={() => setStep(3)}
        onBack={() => setStep(1)}
      />
    );
  }

  // Step 3 — Business Structure (no skip, critical)
  if (step === 3) {
    const advanceToStep4 = async () => {
      await createBuckets();
      setStep(4);
    };
    return (
      <OnboardingBusinessStructure
        onNext={() => void advanceToStep4()}
        onSkip={() => void advanceToStep4()}
        onBack={() => setStep(2)}
      />
    );
  }

  // Step 4 — Bucket Setup (skip completes onboarding)
  if (step === 4) {
    return (
      <BucketSetupScreen
        isOnboarding={true}
        onComplete={() => setStep(5)}
      />
    );
  }

  // Step 5 — Add Payer (optional)
  if (step === 5) {
    return (
      <OnboardingAddPayer
        onNext={(id, name) => { setPayerId(id); setPayerName(name); setStep(6); }}
        onSkip={() => void handleComplete(false)}
        onBack={() => setStep(4)}
      />
    );
  }

  // Step 6 — Add Gig (optional, unlock moment)
  return (
    <OnboardingAddGig
      payerId={payerId}
      payerName={payerName}
      onComplete={() => void handleComplete(true)}
      onSkip={() => void handleComplete(false)}
      onBack={() => setStep(5)}
    />
  );
}
