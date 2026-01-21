import React, { useState } from 'react';
import { Platform } from 'react-native';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingBusinessStructure } from './OnboardingBusinessStructure';
import { useQueryClient } from '@tanstack/react-query';

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
    handleComplete();
  };

  const handleComplete = () => {
    console.log('🔵 [OnboardingFlow] handleComplete called');
    
    // Set flag to show tour on dashboard
    if (Platform.OS === 'web') {
      sessionStorage.setItem('show_dashboard_tour', 'true');
      sessionStorage.setItem('onboarding_just_completed', 'true');
      console.log('🔵 [OnboardingFlow] Set show_dashboard_tour flag in sessionStorage');
    }
    
    // Invalidate all queries to ensure fresh data loads
    console.log('🔵 [OnboardingFlow] Invalidating all queries...');
    queryClient.invalidateQueries();
    
    console.log('🔵 [OnboardingFlow] Calling onComplete() to trigger bootstrap.retry()');
    onComplete();
  };

  const handleSkipToEnd = () => {
    handleComplete();
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
