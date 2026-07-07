import React, { useState } from 'react';
import { Platform } from 'react-native';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingTaxInfo } from './OnboardingTaxInfo';
import { OnboardingBusinessStructure } from './OnboardingBusinessStructure';
import { BucketSetupScreen } from './BucketSetupScreen';
import { OnboardingAddPayer } from './OnboardingAddPayer';
import { OnboardingAddGig } from './OnboardingAddGig';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useTaxProfile } from '../hooks/useTaxProfile';
import { createDefaultBuckets } from '../lib/createDefaultBuckets';
import { trackOnboardingComplete, trackFirstGigCreated } from '../lib/analytics';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [payerId, setPayerId] = useState<string | null>(null);
  const queryClient = useQueryClient();
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
    console.log('[OnboardingFlow] handleComplete — gigCreated:', gigCreated);

    if (Platform.OS === 'web') {
      sessionStorage.setItem('show_dashboard_tour', 'true');
      sessionStorage.setItem('onboarding_just_completed', 'true');
      sessionStorage.setItem('onboarding_v2_completed', 'true');
    }

    await persistCompletion();

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
        onComplete={() => setStep(5)}
      />
    );
  }

  // Step 5 — Add Payer (optional)
  if (step === 5) {
    return (
      <OnboardingAddPayer
        onNext={(id) => { setPayerId(id); setStep(6); }}
        onSkip={() => void handleComplete(false)}
        onBack={() => setStep(4)}
      />
    );
  }

  // Step 6 — Add Gig (optional, unlock moment)
  return (
    <OnboardingAddGig
      payerId={payerId}
      onComplete={() => void handleComplete(true)}
      onSkip={() => void handleComplete(false)}
      onBack={() => setStep(5)}
    />
  );
}
