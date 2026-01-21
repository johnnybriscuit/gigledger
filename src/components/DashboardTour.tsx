import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

const tourSteps: Step[] = [
  {
    target: 'body',
    content: (
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>🎉 Welcome to GigLedger!</h2>
        <p style={{ marginBottom: '8px' }}>Let's take a quick tour so you know where everything is.</p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>This will take about 60 seconds.</p>
      </div>
    ),
    placement: 'center',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="dashboard"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>📊 Dashboard</h3>
        <p>Your financial command center. See your income, expenses, and tax estimates at a glance.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-nav-id="payers"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>📇 Contacts</h3>
        <p>Manage clients, venues, platforms, and anyone you work with. Link them to gigs for easy tracking.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-nav-id="gigs"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>🎸 Gigs</h3>
        <p>Track all your performances, projects, and jobs. This is where you log your income.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-nav-id="expenses"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>💰 Expenses</h3>
        <p>Log business expenses like equipment, supplies, and subscriptions to maximize your tax deductions.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-nav-id="mileage"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>🚗 Mileage</h3>
        <p>Track drives to gigs and business errands. At $0.67/mile, this adds up to significant tax savings!</p>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '8px' }}>💡 Tip: Add your home address in settings for automatic mileage tracking.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-nav-id="invoices"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>📄 Invoices</h3>
        <p>Create and send professional invoices to clients. Track payments and stay organized.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-nav-id="exports"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>📊 Exports</h3>
        <p>Download reports and summaries for your accountant or tax filing software.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '[data-nav-id="account"]',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>⚙️ Account Settings</h3>
        <p style={{ marginBottom: '8px' }}><strong>Important:</strong> Add your home address here so we can automatically calculate mileage when you add gigs!</p>
        <p style={{ fontSize: '13px', color: '#6b7280' }}>You can also update your tax settings and preferences here.</p>
      </div>
    ),
    placement: 'right',
  },
  {
    target: '.dashboard-summary',
    content: (
      <div>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>📈 Your Financial Summary</h3>
        <p>This shows your net profit, income, expenses, and estimated tax rate. It updates automatically as you add data.</p>
      </div>
    ),
    placement: 'bottom',
  },
  {
    target: 'body',
    content: (
      <div>
        <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '12px' }}>✅ You're Ready to Go!</h2>
        <p style={{ fontWeight: '600', marginBottom: '8px' }}>Recommended next steps:</p>
        <ol style={{ marginLeft: '20px', marginTop: '8px', marginBottom: '12px', lineHeight: '1.6' }}>
          <li>Go to Account Settings and add your home address</li>
          <li>Add your first contact (client, venue, or platform)</li>
          <li>Log your first gig</li>
        </ol>
        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '12px' }}>You can replay this tour anytime from Account → Help.</p>
      </div>
    ),
    placement: 'center',
  },
];

interface DashboardTourProps {
  show: boolean;
  onComplete: () => void;
}

export const DashboardTour: React.FC<DashboardTourProps> = ({ show, onComplete }) => {
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      onComplete();
    }
  };

  return (
    <Joyride
      steps={tourSteps}
      run={show}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: '#10b981',
          zIndex: 10000,
          arrowColor: '#fff',
          backgroundColor: '#fff',
          textColor: '#1f2937',
        },
        tooltip: {
          borderRadius: 8,
          fontSize: 14,
        },
        buttonNext: {
          backgroundColor: '#10b981',
          borderRadius: 6,
          fontSize: 14,
          padding: '8px 16px',
        },
        buttonBack: {
          color: '#6b7280',
          marginRight: 8,
        },
        buttonSkip: {
          color: '#6b7280',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip Tour',
      }}
    />
  );
};
