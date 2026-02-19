/**
 * Account Setup Prompts
 * Joyride-style overlays for Edit Profile and Edit Tax Settings CTAs
 * Shows when user needs to complete these actions
 */

import React, { useState, useEffect } from 'react';
import Joyride, { Step, CallBackProps, STATUS, EVENTS, ACTIONS } from 'react-joyride';

interface AccountSetupPromptsProps {
  needsTaxSetup: boolean;
  needsHomeAddress: boolean;
  onComplete: () => void;
}

export function AccountSetupPrompts({ 
  needsTaxSetup, 
  needsHomeAddress,
  onComplete 
}: AccountSetupPromptsProps) {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    // Only run if user needs to complete at least one action
    if (needsTaxSetup || needsHomeAddress) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        setRun(true);
      }, 500);
    }
  }, [needsTaxSetup, needsHomeAddress]);

  const steps: Step[] = [];

  // Add Edit Profile step if needed
  if (needsHomeAddress) {
    steps.push({
      target: '.edit-profile-cta',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>✏️ Add Your Home Address</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '0' }}>
            Click <strong>Edit Profile</strong> to add your home address. This enables automatic mileage calculations from home to your gig venues.
          </p>
        </div>
      ),
      placement: 'left',
      disableBeacon: true,
      spotlightPadding: 8,
    });
  }

  // Add Edit Tax Settings step if needed
  if (needsTaxSetup) {
    steps.push({
      target: '.edit-tax-settings-cta',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>📊 Set Your State</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '0' }}>
            Click <strong>Edit Tax Settings</strong> to add your state of residence. This provides more accurate tax estimates based on your state's tax rates.
          </p>
        </div>
      ),
      placement: 'left',
      disableBeacon: true,
      spotlightPadding: 8,
    });
  }

  // If no steps, don't render
  if (steps.length === 0) {
    return null;
  }

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;

    console.log('🎯 AccountSetupPrompts callback:', { status, action, index, type });

    // Handle tour completion
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      console.log('✅ Tour completed, calling onComplete');
      setRun(false);
      onComplete();
      return;
    }

    // Handle close button
    if (action === ACTIONS.CLOSE) {
      console.log('❌ Tour closed');
      setRun(false);
      onComplete();
      return;
    }

    // Handle step progression
    if (type === EVENTS.STEP_AFTER) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      // If clicking next on the last step, finish the tour
      if (action === ACTIONS.NEXT && nextStepIndex >= steps.length) {
        console.log('✅ Last step completed');
        setRun(false);
        onComplete();
        return;
      }
      
      if (action === ACTIONS.NEXT && nextStepIndex < steps.length) {
        setStepIndex(nextStepIndex);
      } else if (action === ACTIONS.PREV && nextStepIndex >= 0) {
        setStepIndex(nextStepIndex);
      }
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#3b82f6',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 20,
        },
        tooltipContent: {
          padding: '8px 0',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Got it',
        next: 'Next',
        skip: 'Skip',
      }}
    />
  );
}
