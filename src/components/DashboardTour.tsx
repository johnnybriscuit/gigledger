import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

const tourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>🎉 Welcome to GigLedger!</h2>
        <p style={{ marginBottom: '8px' }}>Let's take a quick tour so you know where everything is.</p>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>This will take about 60 seconds.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="dashboard"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>📊 Dashboard</h3>
        <p>Your financial command center. See your income, expenses, and tax estimates at a glance.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="payers"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>📇 Contacts</h3>
        <p>Manage clients, venues, platforms, and anyone you work with. Link them to gigs for easy tracking.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="gigs"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>🎸 Gigs</h3>
        <p>Track all your performances, projects, and jobs. This is where you log your income.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="expenses"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>💰 Expenses</h3>
        <p>Log business expenses like equipment, supplies, and subscriptions to maximize your tax deductions.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="mileage"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>🚗 Mileage</h3>
        <p style={{ marginBottom: '8px' }}>Track drives to gigs and business errands. At $0.67/mile, this adds up to significant tax savings!</p>
        <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '6px', marginTop: '12px' }}>
          <p style={{ fontSize: '14px', margin: 0 }}>💡 <strong>Pro Tip:</strong> Add your home address in Account Settings for automatic mileage tracking!</p>
        </div>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="invoices"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>📄 Invoices</h3>
        <p>Create and send professional invoices to clients. Track payments and stay organized.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="exports"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>📊 Exports</h3>
        <p>Download reports and summaries for your accountant or tax filing software.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="account"]',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>⚙️ Account Settings</h3>
        <div style={{ backgroundColor: '#dbeafe', padding: '12px', borderRadius: '6px', marginBottom: '12px' }}>
          <p style={{ margin: 0, fontWeight: '600' }}>⭐ Important: Add your home address here!</p>
        </div>
        <p style={{ marginBottom: '8px' }}>This enables automatic mileage calculation when you add gigs.</p>
        <p style={{ fontSize: '14px', color: '#6b7280' }}>You can also update your tax settings and preferences here.</p>
      </div>
    ),
    placement: 'right',
    disableBeacon: true,
  },
  {
    target: '.dashboard-summary',
    content: (
      <div style={{ textAlign: 'left' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px' }}>📈 Your Financial Summary</h3>
        <p>This shows your net profit, income, expenses, and estimated tax rate. It updates automatically as you add data.</p>
      </div>
    ),
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: 'body',
    content: (
      <div style={{ textAlign: 'left', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '48px' }}>✅</span>
          <h2 style={{ margin: '12px 0 8px 0' }}>You're Ready to Go!</h2>
        </div>
        <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '16px' }}>Recommended next steps:</p>
        <ol style={{ margin: '0 0 16px 0', padding: '0 0 0 20px', lineHeight: '1.8' }}>
          <li>Go to <strong>Account Settings</strong> and add your home address</li>
          <li>Add your first <strong>contact</strong> (client, venue, or platform)</li>
          <li>Log your first <strong>gig</strong></li>
        </ol>
        <div style={{ backgroundColor: '#f3f4f6', padding: '12px', borderRadius: '6px', fontSize: '14px', color: '#6b7280' }}>
          💡 You can replay this tour anytime from <strong>Account → Help</strong>
        </div>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
];

interface DashboardTourProps {
  show: boolean;
  onComplete: () => void;
}

export const DashboardTour: React.FC<DashboardTourProps> = ({ show, onComplete }) => {
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status, action, index, type } = data;
    
    // Debug logging
    console.log('🎯 Tour callback:', { status, action, index, type, totalSteps: tourSteps.length });
    
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      console.log('✅ Tour completed or skipped');
      onComplete();
    }
  };

  // Log when tour starts
  React.useEffect(() => {
    if (show) {
      console.log('🚀 Tour starting with', tourSteps.length, 'steps');
      console.log('🔍 Checking if target elements exist:');
      tourSteps.forEach((step, index) => {
        if (step.target !== 'body') {
          const element = document.querySelector(step.target as string);
          console.log(`  Step ${index + 1} (${step.target}):`, element ? '✅ Found' : '❌ Missing');
        }
      });
    }
  }, [show]);

  return (
    <Joyride
      steps={tourSteps}
      run={show}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      stepIndex={0}
      disableOverlayClose={false}
      spotlightClicks={false}
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981',
          textColor: '#1f2937',
          backgroundColor: '#ffffff',
          arrowColor: '#ffffff',
          overlayColor: 'rgba(0, 0, 0, 0.6)',
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
        },
        tooltipContainer: {
          textAlign: 'left',
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
          color: '#6b7280',
          fontSize: '14px',
        },
        tooltipTitle: {
          fontSize: '18px',
          marginBottom: '8px',
        },
        tooltipContent: {
          fontSize: '15px',
          lineHeight: '1.6',
        },
      }}
      locale={{
        back: '← Back',
        close: 'Close',
        last: 'Done ✓',
        next: 'Next →',
        skip: 'Skip Tour',
      }}
    />
  );
};
