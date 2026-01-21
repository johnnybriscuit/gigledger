import React from 'react';
import Joyride, { Step, CallBackProps, STATUS } from 'react-joyride';

const tourSteps: Step[] = [
  {
    target: '.dashboard-summary',
    content: '👋 Welcome to your Dashboard! This shows your income, expenses, and tax estimates at a glance.',
    placement: 'bottom',
    disableBeacon: true,
  },
  {
    target: '[data-nav-id="payers"]',
    content: '📇 Contacts: Manage clients, venues, and platforms you work with.',
    placement: 'right',
  },
  {
    target: '[data-nav-id="gigs"]',
    content: '🎸 Gigs: Track all your performances and projects in one place.',
    placement: 'right',
  },
  {
    target: '[data-nav-id="expenses"]',
    content: '💰 Expenses: Log business expenses to maximize your deductions.',
    placement: 'right',
  },
  {
    target: '[data-nav-id="mileage"]',
    content: '🚗 Mileage: Track drives to gigs for valuable tax deductions.',
    placement: 'right',
  },
  {
    target: '[data-nav-id="invoices"]',
    content: '📄 Invoices: Create and send professional invoices to clients.',
    placement: 'right',
  },
  {
    target: '[data-nav-id="exports"]',
    content: '📊 Exports: Download reports for your accountant or tax filing.',
    placement: 'right',
  },
  {
    target: 'body',
    content: '🎉 You\'re all set! Start by adding a contact or logging your first gig.',
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
