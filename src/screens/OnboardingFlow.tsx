import React, { useState } from 'react';
import { Platform } from 'react-native';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingBusinessStructure } from './OnboardingBusinessStructure';
import { OnboardingAddPayer } from './OnboardingAddPayer';
import { OnboardingAddGig } from './OnboardingAddGig';
import { useQueryClient } from '@tanstack/react-query';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [payerId, setPayerId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const handleWelcomeNext = () => {
    setStep(2);
  };

  const handleBusinessStructureNext = () => {
    setStep(3);
  };

  const handlePayerNext = (newPayerId: string) => {
    setPayerId(newPayerId);
    setStep(4);
  };

  const handleComplete = () => {
    // Set flag to show toast on dashboard
    if (Platform.OS === 'web') {
      sessionStorage.setItem('onboarding_just_completed', 'true');
    }
    
    // Invalidate all queries to ensure fresh data loads
    queryClient.invalidateQueries();
    
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

  if (step === 2) {
    return (
      <OnboardingBusinessStructure
        onNext={handleBusinessStructureNext}
        onSkip={handleBusinessStructureNext}
        onBack={() => setStep(1)}
      />
    );
  }

  if (step === 3) {
    return (
      <OnboardingAddPayer
        onNext={handlePayerNext}
        onSkip={handleSkipToEnd}
        onBack={() => setStep(2)}
      />
    );
  }

  return (
    <OnboardingAddGig
      payerId={payerId}
      onComplete={handleComplete}
      onSkip={handleSkipToEnd}
      onBack={() => setStep(3)}
    />
  );
}
