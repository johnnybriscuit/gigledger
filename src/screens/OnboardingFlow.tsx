import React, { useState } from 'react';
import { Platform } from 'react-native';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingBusinessStructure } from './OnboardingBusinessStructure';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const queryClient = useQueryClient();

  const handleWelcomeNext = () => {
    setStep(2);
  };

  const handleBusinessStructureNext = () => {
    void handleComplete();
  };

  const handleComplete = async () => {
    console.log(' [OnboardingFlow] handleComplete called');

    // Set flag to show tour on dashboard
    if (Platform.OS === 'web') {
      sessionStorage.setItem('show_dashboard_tour', 'true');
      sessionStorage.setItem('onboarding_just_completed', 'true');
      console.log(' [OnboardingFlow] Set show_dashboard_tour flag in sessionStorage');
    }

    // Persist onboarding completion
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error(' [OnboardingFlow] Error getting user:', userError);
      } else if (!user) {
        console.error(' [OnboardingFlow] No user found');
      } else {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id);

        if (profileError) {
          console.error(' [OnboardingFlow] Error updating profile onboarding_complete:', profileError);
        }

        const { error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            onboarding_completed: true,
            onboarding_step: 'done',
          }, {
            onConflict: 'user_id',
          });

        if (settingsError) {
          console.error(' [OnboardingFlow] Error updating user_settings onboarding_completed:', settingsError);
        }
      }
    } catch (error) {
      console.error(' [OnboardingFlow] Unexpected error persisting onboarding completion:', error);
    }

    // Invalidate all queries to ensure fresh data loads
    console.log(' [OnboardingFlow] Invalidating all queries...');
    queryClient.invalidateQueries();
    
    console.log(' [OnboardingFlow] Calling onComplete() to trigger bootstrap.retry()');
    onComplete();
  };

  const handleSkipToEnd = () => {
    void handleComplete();
  };

  if (step === 1) {
    return (
      <OnboardingWelcome
        onNext={handleWelcomeNext}
        onSkip={handleSkipToEnd}
      />
    );
  }

  return (
    <OnboardingBusinessStructure
      onNext={handleBusinessStructureNext}
      onSkip={handleBusinessStructureNext}
      onBack={() => setStep(1)}
    />
  );
}
