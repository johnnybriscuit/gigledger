import React, { useState, useEffect } from 'react';
import { OnboardingTooltip } from './OnboardingTooltip';
import { useOnboarding } from '../hooks/useOnboarding';
import { usePayers } from '../hooks/usePayers';
import { useGigs } from '../hooks/useGigs';

interface InteractiveOnboardingProps {
  activeTab: string;
  onNavigateToTab: (tab: 'payers' | 'gigs' | 'expenses' | 'account') => void;
  showTaxOnboarding?: boolean;
}

export function InteractiveOnboarding({
  activeTab,
  onNavigateToTab,
  showTaxOnboarding = false,
}: InteractiveOnboardingProps) {
  const { onboardingState, isLoading, updateStep, completeOnboarding } = useOnboarding();
  const { data: payers } = usePayers();
  const { data: gigs } = useGigs();

  const [currentTooltip, setCurrentTooltip] = useState<number>(0);

  // Don't show if onboarding is completed or tax onboarding is showing
  if (isLoading || onboardingState?.onboarding_completed || showTaxOnboarding) {
    return null;
  }

  const currentStep = onboardingState?.onboarding_step || 'welcome';
  const hasPayers = (payers?.length || 0) > 0;
  const hasGigs = (gigs?.length || 0) > 0;

  // Define all tooltip steps
  const tooltips = [
    // Step 1: Welcome (after tax profile is complete)
    {
      id: 'welcome',
      title: '🎵 You\'re All Set Up!',
      message: 'Great! Now let\'s add your first payer and gig so you can start tracking your music income.',
      step: 1,
      totalSteps: 3,
      condition: currentStep === 'welcome',
      onNext: () => {
        updateStep.mutate('payer');
        setCurrentTooltip(1);
      },
    },
    // Step 2: Add first payer
    {
      id: 'payer',
      title: '🏢 Add Your First Payer',
      message: hasPayers 
        ? 'Great! You\'ve added a payer. Now let\'s log your first gig with them.'
        : 'A payer is anyone who pays you for gigs - venues, clients, or platforms like Spotify. Click "Add Payer" below to get started.',
      step: 2,
      totalSteps: 3,
      condition: currentStep === 'payer',
      onNext: () => {
        if (!hasPayers) {
          onNavigateToTab('payers');
        } else {
          updateStep.mutate('gig');
          setCurrentTooltip(2);
        }
      },
    },
    // Step 3: Add first gig
    {
      id: 'gig',
      title: '🎤 Log Your First Gig',
      message: hasGigs
        ? 'Perfect! You\'ve logged your first gig. You\'re ready to start tracking your music income! 🎉'
        : 'Now let\'s add a gig! Include the date, payer, and how much you earned.',
      step: 3,
      totalSteps: 3,
      condition: currentStep === 'gig',
      onNext: async () => {
        if (!hasGigs) {
          onNavigateToTab('gigs');
        } else {
          await completeOnboarding.mutateAsync();
          setCurrentTooltip(3);
        }
      },
    },
  ];

  // Auto-advance when conditions are met
  useEffect(() => {
    if (currentStep === 'payer' && hasPayers && currentTooltip === 1) {
      // User added a payer, move to next step
      updateStep.mutate('gig');
      setCurrentTooltip(2);
    }
  }, [hasPayers, currentStep, currentTooltip]);

  useEffect(() => {
    if (currentStep === 'gig' && hasGigs && currentTooltip === 2) {
      // User added a gig, complete onboarding
      completeOnboarding.mutate();
      setCurrentTooltip(3);
    }
  }, [hasGigs, currentStep, currentTooltip]);

  const activeTooltip = tooltips.find(t => t.condition);

  if (!activeTooltip) return null;

  const handleSkip = async () => {
    await completeOnboarding.mutateAsync();
  };

  return (
    <OnboardingTooltip
      visible={true}
      title={activeTooltip.title}
      message={activeTooltip.message}
      step={activeTooltip.step}
      totalSteps={activeTooltip.totalSteps}
      onNext={activeTooltip.onNext}
      onSkip={handleSkip}
      position="center"
    />
  );
}
