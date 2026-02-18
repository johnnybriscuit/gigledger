import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';

interface DashboardTourProps {
  show: boolean;
  onComplete: () => void;
  onNavigateToGigs?: () => void;
  onOpenAddGigModal?: () => void;
}

export const DashboardTour: React.FC<DashboardTourProps> = ({ show, onComplete, onNavigateToGigs, onOpenAddGigModal }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Wait for DOM elements to be ready
  useEffect(() => {
    if (show) {
      const checkElements = () => {
        const sidebar = document.querySelector('.sidebar');
        
        if (sidebar) {
          console.log('✅ Tour elements ready');
          setIsReady(true);
        } else {
          console.log('⏳ Waiting for sidebar...', { sidebar: !!sidebar });
          setTimeout(checkElements, 100);
        }
      };
      
      setTimeout(checkElements, 500); // Initial delay to let page render
    } else {
      setIsReady(false);
      setStepIndex(0);
    }
  }, [show]);

  const handleAddFirstGig = () => {
    console.log('🎯 Add First Gig clicked from tour');
    if (onNavigateToGigs) {
      onNavigateToGigs();
    }
    if (onOpenAddGigModal) {
      // Small delay to ensure navigation completes
      setTimeout(() => {
        onOpenAddGigModal();
      }, 300);
    }
    onComplete();
  };

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2 style={{ marginBottom: '12px', fontSize: '20px' }}>🎉 Welcome to Bozzy!</h2>
          <p style={{ marginBottom: '8px', lineHeight: '1.6' }}>
            Let's take a quick tour so you know where everything is.
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            This will only take 30 seconds.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      hideFooter: false,
      spotlightClicks: false,
    },
    {
      target: '.sidebar',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>� Your Navigation</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>
            Everything you need is in the sidebar: <strong>Dashboard</strong> for your overview, <strong>Contacts</strong> for clients and venues, <strong>Gigs</strong> for income tracking, <strong>Expenses</strong> and <strong>Mileage</strong> for deductions, <strong>Invoices</strong> for billing, and <strong>Exports</strong> for tax time.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: '.nav-gigs',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>🎸 Start with Gigs</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '8px' }}>
            Logging gigs is the most important action. It powers your income tracking, tax estimates, and everything else in the app.
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280', fontStyle: 'italic' }}>
            Click "+ Add Gig" to get started!
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: 'body',
      content: (
        <div style={{ maxWidth: '420px' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>✅</div>
            <h2 style={{ margin: '0 0 4px 0', fontSize: '22px' }}>You're Ready to Go!</h2>
          </div>
          
          <p style={{ lineHeight: '1.6', marginBottom: '16px', fontSize: '15px' }}>
            The best way to learn is by doing. Start by adding your first gig!
          </p>
          
          <div style={{ 
            backgroundColor: '#f3f4f6', 
            padding: '14px', 
            borderRadius: '8px',
            fontSize: '13px',
            color: '#4b5563',
            lineHeight: '1.5',
            marginTop: '16px'
          }}>
            💡 You can replay this tour anytime from <strong>Account → Help</strong>
          </div>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      locale: {
        last: 'Add your first gig',
      },
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type, lifecycle } = data;

    console.log('🎯 Tour event:', { 
      status, 
      action, 
      index, 
      type, 
      lifecycle,
      stepIndex 
    });

    // Handle tour completion - only close on final step or explicit close/skip actions
    const isLastStep = index === steps.length - 1;
    const shouldClose = 
      status === STATUS.FINISHED || 
      status === STATUS.SKIPPED ||
      action === ACTIONS.SKIP ||
      action === 'close' ||
      (lifecycle === 'complete' && isLastStep);
    
    if (shouldClose) {
      console.log('✅ Tour completed:', { status, action, lifecycle, index, isLastStep });
      setStepIndex(0);
      setIsReady(false);
      
      // If user clicked "Add your first gig" on final step, navigate and open modal
      if (isLastStep && action === ACTIONS.NEXT) {
        handleAddFirstGig();
      } else {
        onComplete();
      }
      return; // Exit early to prevent further processing
    }

    // Handle step progression
    if (type === EVENTS.STEP_AFTER || type === EVENTS.TARGET_NOT_FOUND) {
      const nextStepIndex = index + (action === ACTIONS.PREV ? -1 : 1);
      
      if (action === ACTIONS.NEXT && nextStepIndex < steps.length) {
        setStepIndex(nextStepIndex);
      } else if (action === ACTIONS.PREV && nextStepIndex >= 0) {
        setStepIndex(nextStepIndex);
      }
    }

    // Handle errors
    if (type === EVENTS.TARGET_NOT_FOUND) {
      console.warn('⚠️ Target not found for step:', index);
      setStepIndex(index + 1);
    }
  };

  // Don't render until elements are ready
  if (!isReady) {
    console.log('⏳ Tour waiting for elements...');
    return null;
  }

  return (
    <Joyride
      steps={steps}
      run={show}
      stepIndex={stepIndex}
      continuous
      showProgress
      showSkipButton
      disableOverlayClose={false}
      disableCloseOnEsc={false}
      spotlightClicks={false}
      scrollToFirstStep
      scrollOffset={100}
      callback={handleJoyrideCallback}
      floaterProps={{
        disableAnimation: false,
      }}
      styles={{
        options: {
          primaryColor: '#10b981',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.65)',
          zIndex: 10000,
          width: undefined,
        },
        tooltip: {
          borderRadius: 12,
          padding: 24,
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: '8px 0',
        },
        buttonNext: {
          backgroundColor: '#10b981',
          borderRadius: 8,
          padding: '10px 20px',
          fontSize: '15px',
          fontWeight: '600',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 12,
          fontSize: '15px',
        },
        buttonSkip: {
          color: '#9ca3af',
          fontSize: '14px',
        },
        spotlight: {
          borderRadius: 8,
        },
      }}
      locale={{
        back: '← Back',
        close: 'Close',
        last: steps[stepIndex]?.locale?.last || 'Done',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};
