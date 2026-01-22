import React, { useEffect, useState } from 'react';
import Joyride, { CallBackProps, STATUS, Step, ACTIONS, EVENTS } from 'react-joyride';

interface DashboardTourProps {
  show: boolean;
  onComplete: () => void;
}

export const DashboardTour: React.FC<DashboardTourProps> = ({ show, onComplete }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Wait for DOM elements to be ready
  useEffect(() => {
    if (show) {
      const checkElements = () => {
        const navDashboard = document.querySelector('.nav-dashboard');
        const navPayers = document.querySelector('.nav-payers');
        
        if (navDashboard && navPayers) {
          console.log('✅ Tour elements ready');
          setIsReady(true);
        } else {
          console.log('⏳ Waiting for nav elements...', { navDashboard: !!navDashboard, navPayers: !!navPayers });
          setTimeout(checkElements, 100);
        }
      };
      
      setTimeout(checkElements, 500); // Initial delay to let page render
    } else {
      setIsReady(false);
      setStepIndex(0);
    }
  }, [show]);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2 style={{ marginBottom: '12px', fontSize: '20px' }}>🎉 Welcome to GigLedger!</h2>
          <p style={{ marginBottom: '8px', lineHeight: '1.6' }}>
            Let's take a quick tour so you know where everything is.
          </p>
          <p style={{ fontSize: '14px', color: '#6b7280' }}>
            This will take about 60 seconds.
          </p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
      hideFooter: false,
      spotlightClicks: false,
    },
    {
      target: '.nav-dashboard',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>📊 Dashboard</h3>
          <p style={{ lineHeight: '1.6' }}>
            Your financial command center. See your income, expenses, and tax estimates at a glance.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: '.nav-payers',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>📇 Contacts</h3>
          <p style={{ lineHeight: '1.6' }}>
            Manage clients, venues, and platforms. Link them to gigs for easy tracking.
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
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>🎸 Gigs</h3>
          <p style={{ lineHeight: '1.6' }}>
            Track all your performances and projects. This is where you log your income.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: '.nav-expenses',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>💰 Expenses</h3>
          <p style={{ lineHeight: '1.6' }}>
            Log business expenses to maximize your tax deductions.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: '.nav-mileage',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>🚗 Mileage</h3>
          <p style={{ lineHeight: '1.6', marginBottom: '12px' }}>
            Track drives to gigs. At $0.67/mile, this adds up to significant tax savings!
          </p>
          <div style={{ 
            backgroundColor: '#fef3c7', 
            padding: '10px', 
            borderRadius: '6px',
            fontSize: '14px'
          }}>
            💡 <strong>Tip:</strong> Add your home address in Account Settings for automatic tracking!
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: '.nav-invoices',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>📄 Invoices</h3>
          <p style={{ lineHeight: '1.6' }}>
            Create and send professional invoices to clients.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: '.nav-exports',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>📊 Exports</h3>
          <p style={{ lineHeight: '1.6' }}>
            Download reports for your accountant or tax software.
          </p>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
      spotlightPadding: 10,
    },
    {
      target: '.nav-account',
      content: (
        <div>
          <h3 style={{ marginBottom: '8px', fontSize: '18px' }}>⚙️ Account Settings</h3>
          <div style={{ 
            backgroundColor: '#dbeafe', 
            padding: '12px', 
            borderRadius: '6px',
            marginBottom: '10px',
            fontWeight: '600'
          }}>
            ⭐ Important: Add your home address here!
          </div>
          <p style={{ lineHeight: '1.6', fontSize: '14px' }}>
            This enables automatic mileage calculation when you add gigs.
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
          
          <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>
            Recommended next steps:
          </p>
          
          <ol style={{ 
            margin: '0 0 20px 0',
            paddingLeft: '24px',
            lineHeight: '2',
            fontSize: '15px'
          }}>
            <li>Go to <strong>Account Settings</strong> and add your home address</li>
            <li>Add your first <strong>contact</strong> (client, venue, or platform)</li>
            <li>Log your first <strong>gig</strong></li>
          </ol>
          
          <div style={{ 
            backgroundColor: '#f3f4f6', 
            padding: '14px', 
            borderRadius: '8px',
            fontSize: '13px',
            color: '#4b5563',
            lineHeight: '1.5'
          }}>
            💡 You can replay this tour anytime from <strong>Account → Help</strong>
          </div>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
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

    // Handle tour completion - check lifecycle complete or status finished/skipped
    if (
      lifecycle === 'complete' ||
      status === STATUS.FINISHED || 
      status === STATUS.SKIPPED ||
      action === ACTIONS.CLOSE ||
      action === ACTIONS.SKIP
    ) {
      console.log('✅ Tour completed:', { status, action, lifecycle });
      setStepIndex(0);
      setIsReady(false);
      onComplete();
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
        last: 'Done',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};
