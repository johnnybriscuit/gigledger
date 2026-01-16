/**
 * Hook to provide responsive button text based on screen width
 * Shortens long CTA labels on mobile devices
 */

import { useWindowDimensions } from 'react-native';

// Mobile breakpoint - iPhone SE width is 375, iPhone 13/14 is 390
const MOBILE_BREAKPOINT = 600;

interface ButtonTextOptions {
  full: string;
  mobile: string;
}

export function useResponsiveButtonText(options: ButtonTextOptions): string {
  const { width } = useWindowDimensions();
  const isMobile = width < MOBILE_BREAKPOINT;
  
  return isMobile ? options.mobile : options.full;
}

// Common button text mappings
export const BUTTON_TEXT = {
  SAVE_GIG_DASHBOARD: {
    full: 'Save gig & go to your dashboard',
    mobile: 'Save & continue',
  },
  SAVE_PAYER_CONTINUE: {
    full: 'Save payer & continue',
    mobile: 'Save & continue',
  },
  SAVE_CONTINUE: {
    full: 'Save & Continue',
    mobile: 'Save',
  },
  UPDATE_PAYER: {
    full: 'Update Payer',
    mobile: 'Update',
  },
  UPDATE_SUBCONTRACTOR: {
    full: 'Update Subcontractor',
    mobile: 'Update',
  },
  ADD_SUBCONTRACTOR: {
    full: 'Add Subcontractor',
    mobile: 'Add',
  },
  UPDATE_GIG: {
    full: 'Update Gig',
    mobile: 'Update',
  },
  SAVE_GIG: {
    full: 'Save Gig',
    mobile: 'Save',
  },
  UPDATE_EXPENSE: {
    full: 'Update Expense',
    mobile: 'Update',
  },
  ADD_EXPENSE: {
    full: 'Add Expense',
    mobile: 'Add',
  },
  UPDATE_TRIP: {
    full: 'Update Trip',
    mobile: 'Update',
  },
  ADD_TRIP: {
    full: 'Add Trip',
    mobile: 'Add',
  },
};
