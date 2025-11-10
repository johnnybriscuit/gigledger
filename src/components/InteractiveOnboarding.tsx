import React, { useState, useEffect } from 'react';
import { OnboardingTooltip } from './OnboardingTooltip';
import { useOnboarding } from '../hooks/useOnboarding';
import { usePayers } from '../hooks/usePayers';
import { useGigs } from '../hooks/useGigs';

interface InteractiveOnboardingProps {
  activeTab: string;
  onNavigateToTab: (tab: 'payers' | 'gigs' | 'expenses' | 'account') => void;
}

export function InteractiveOnboarding({
  activeTab,
  onNavigateToTab,
}: InteractiveOnboardingProps) {
  const { onboardingState, isLoading, updateStep, completeOnboarding } = useOnboarding();
  const { data: payers } = usePayers();
  const { data: gigs } = useGigs();

  const [currentTooltip, setCurrentTooltip] = useState<number>(0);

  // Don't show if onboarding is completed
  if (isLoading || onboardingState?.onboarding_completed) {
    return null;
  }

  const currentStep = onboardingState?.onboarding_step || 'welcome';
  const hasPayers = (payers?.length || 0) > 0;
  const hasGigs = (gigs?.length || 0) > 0;

  // Define all tooltip steps
  const tooltips = [
    // Step 1: Welcome
    {
      id: 'welcome',
      title: '🎵 Welcome to GigLedger!',
      message: 'Let\'s get you set up in just a few minutes. We\'ll walk you through adding your first payer and gig so you can start tracking your music income right away.',
      step: 1,
      totalSteps: 5,
      condition: currentStep === 'welcome',
      onNext: () => {
        updateStep.mutate('basics');
        setCurrentTooltip(1);
      },
    },
    // Step 2: Set up basics
    {
      id: 'basics',
      title: '⚙️ Set Up Your Profile',
      message: 'First, let\'s set your name and state. This helps us calculate accurate tax estimates for your location. Tap the Account tab at the bottom to get started.',
      step: 2,
      totalSteps: 5,
      condition: currentStep === 'basics',
      onNext: () => {
        onNavigateToTab('account');
        updateStep.mutate('payer');
        setCurrentTooltip(2);
      },
    },
    // Step 3: Add first payer
    {
      id: 'payer',
      title: '🏢 Add Your First Payer',
      message: hasPayers 
        ? 'Great! You\'ve added a payer. Now let\'s log your first gig with them.'
        : 'A payer is anyone who pays you for gigs - venues, clients, or platforms like Spotify. Tap the Payers tab to add your first one.',
      step: 3,
      totalSteps: 5,
      condition: currentStep === 'payer',
      onNext: () => {
        if (!hasPayers) {
          onNavigateToTab('payers');
        } else {
          updateStep.mutate('gig');
          setCurrentTooltip(3);
        }
      },
    },
    // Step 4: Add first gig
    {
      id: 'gig',
      title: '🎤 Log Your First Gig',
      message: hasGigs
        ? 'Awesome! You\'ve logged your first gig. You can also track expenses to maximize your tax deductions.'
        : 'Now let\'s add a gig! Include the date, payer, and how much you earned. Tap the Gigs tab to get started.',
      step: 4,
      totalSteps: 5,
      condition: currentStep === 'gig',
      onNext: () => {
        if (!hasGigs) {
          onNavigateToTab('gigs');
        } else {
          updateStep.mutate('expense');
          setCurrentTooltip(4);
        }
      },
    },
    // Step 5: Optional expenses
    {
      id: 'expense',
      title: '💰 Track Expenses (Optional)',
      message: 'Track business expenses like travel, equipment, and meals to reduce your tax bill. You can add these anytime from the Expenses tab.',
      step: 5,
      totalSteps: 5,
      condition: currentStep === 'expense',
      onNext: async () => {
        await completeOnboarding.mutateAsync();
        setCurrentTooltip(5);
      },
    },
  ];

  // Auto-advance when conditions are met
  useEffect(() => {
    if (currentStep === 'payer' && hasPayers && currentTooltip === 2) {
      // User added a payer, move to next step
      updateStep.mutate('gig');
      setCurrentTooltip(3);
    }
  }, [hasPayers, currentStep, currentTooltip]);

  useEffect(() => {
    if (currentStep === 'gig' && hasGigs && currentTooltip === 3) {
      // User added a gig, move to next step
      updateStep.mutate('expense');
      setCurrentTooltip(4);
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
