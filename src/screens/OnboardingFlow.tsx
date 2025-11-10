import React, { useState } from 'react';
import { OnboardingWelcome } from './OnboardingWelcome';
import { OnboardingAddPayer } from './OnboardingAddPayer';
import { OnboardingAddGig } from './OnboardingAddGig';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState(1);
  const [payerId, setPayerId] = useState<string | null>(null);

  const handleWelcomeNext = () => {
    setStep(2);
  };

  const handlePayerNext = (newPayerId: string) => {
    setPayerId(newPayerId);
    setStep(3);
  };

  const handleSkipToEnd = () => {
    onComplete();
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
      <OnboardingAddPayer
        onNext={handlePayerNext}
        onSkip={handleSkipToEnd}
        onBack={() => setStep(1)}
      />
    );
  }

  return (
    <OnboardingAddGig
      payerId={payerId}
      onComplete={onComplete}
      onSkip={handleSkipToEnd}
      onBack={() => setStep(2)}
    />
  );
}
