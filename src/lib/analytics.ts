/**
 * Analytics tracking utility for Google Tag Manager + GA4
 * 
 * This module provides a safe, SSR-compatible interface for tracking events
 * through Google Tag Manager's dataLayer.
 * 
 * IMPORTANT: Never send PII (personally identifiable information) through analytics:
 * - No emails, names, addresses, phone numbers
 * - No freeform user-generated content (notes, descriptions)
 * - Only send IDs, counts, types, and categorical data
 */

declare global {
  interface Window {
    dataLayer?: any[];
  }
}

/**
 * Safely push an event to the GTM dataLayer
 * Only runs in browser context (not during SSR)
 * 
 * @param eventName - The event name (e.g., 'sign_up', 'gig_created')
 * @param params - Event parameters (must not contain PII)
 */
export function track(eventName: string, params?: Record<string, any>): void {
  console.log('🔐 [Analytics] track called:', { eventName, params });
  
  // Only run in browser
  if (typeof window === 'undefined') {
    console.log('🔐 [Analytics] Not in browser - skipping track');
    return;
  }

  // Initialize dataLayer if it doesn't exist
  window.dataLayer = window.dataLayer || [];
  console.log('🔐 [Analytics] dataLayer initialized, pushing event');

  // Push event to dataLayer
  const eventData = {
    event: eventName,
    ...params,
  };
  
  window.dataLayer.push(eventData);
  console.log('🔐 [Analytics] Event pushed to dataLayer:', eventData);

  // Log in development for debugging
  if (__DEV__) {
    console.log('[Analytics]', eventName, params);
  }
}

/**
 * Check if GTM is loaded and ready
 */
function isGTMReady(): boolean {
  return typeof window !== 'undefined' && 
         !!window.dataLayer && 
         window.dataLayer.length > 0 && 
         window.dataLayer.some((item: any) => item.event === 'gtm.js');
}

/**
 * Safely push event with GTM ready check
 * Waits up to 2 seconds for GTM to load
 */
export function trackWithGTMCheck(eventName: string, params?: Record<string, any>): void {
  console.log('🔐 [Analytics] trackWithGTMCheck called:', { eventName, params });
  
  // Only run in browser
  if (typeof window === 'undefined') {
    console.log('🔐 [Analytics] Not in browser - skipping');
    return;
  }

  // If GTM is ready, track immediately
  if (isGTMReady()) {
    track(eventName, params);
    return;
  }

  // Otherwise, wait for GTM to load
  let attempts = 0;
  const maxAttempts = 20; // 2 seconds max wait
  const checkInterval = setInterval(() => {
    attempts++;
    
    if (isGTMReady()) {
      clearInterval(checkInterval);
      track(eventName, params);
    } else if (attempts >= maxAttempts) {
      clearInterval(checkInterval);
      console.warn('[Analytics] GTM not ready after 2 seconds, event not tracked:', eventName);
    }
  }, 100);
}

/**
 * Track page views (for SPA navigation)
 * Should be called on route changes
 */
export function trackPageView(path: string, title?: string): void {
  track('page_view', {
    page_path: path,
    page_title: title,
  });
}

// ============================================================================
// AUTH EVENTS
// ============================================================================

export function trackSignUp(method: 'google' | 'magic_link' | 'password'): void {
  trackWithGTMCheck('sign_up', { method });
}

export function trackLogin(method: 'google' | 'magic_link' | 'password'): void {
  console.log('🔐 [Analytics] trackLogin called with method:', method);
  console.log('🔐 [Analytics] window.dataLayer:', window.dataLayer);
  trackWithGTMCheck('login', { method });
}

export function trackLogout(): void {
  trackWithGTMCheck('logout');
}

export function trackOnboardingComplete(params: {
  activation_type: 'first_gig' | 'first_invoice' | 'first_action';
}): void {
  trackWithGTMCheck('onboarding_complete', params);
}

// ============================================================================
// GIG EVENTS
// ============================================================================

export function trackGigCreated(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('gig_created', {
    entity_type: 'gig',
    ...params
  });
}

export function trackGigUpdated(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('gig_updated', {
    entity_type: 'gig',
    ...params
  });
}

export function trackGigDeleted(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('gig_deleted', {
    entity_type: 'gig',
    ...params
  });
}

// ============================================================================
// EXPENSE EVENTS
// ============================================================================

export function trackExpenseCreated(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('expense_created', {
    entity_type: 'expense',
    ...params
  });
}

export function trackExpenseDeleted(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('expense_deleted', {
    entity_type: 'expense',
    ...params
  });
}

// ============================================================================
// MILEAGE EVENTS
// ============================================================================

export function trackMileageCreated(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('mileage_created', {
    entity_type: 'mileage',
    ...params
  });
}

export function trackMileageDeleted(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('mileage_deleted', {
    entity_type: 'mileage',
    ...params
  });
}

// ============================================================================
// INVOICE EVENTS
// ============================================================================

export function trackInvoiceCreated(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('invoice_created', {
    entity_type: 'invoice',
    ...params
  });
}

export function trackInvoiceSent(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('invoice_sent', {
    entity_type: 'invoice',
    ...params
  });
}

export function trackInvoiceMarkedPaid(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('invoice_marked_paid', {
    entity_type: 'invoice',
    ...params
  });
}

// ============================================================================
// EXPORT EVENTS
// ============================================================================

export function trackExportCreated(params: {
  export_type: string;
  source?: string;
}): void {
  trackWithGTMCheck('export_created', params);
}

// ============================================================================
// TOUR EVENTS
// ============================================================================

export function trackTourCreated(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('tour_created', {
    entity_type: 'tour',
    ...params
  });
}

export function trackGigsAssignedToTour(params: {
  count: number;
  source?: string;
}): void {
  trackWithGTMCheck('gigs_assigned_to_tour', params);
}

export function trackSettlementCreated(params: {
  entity_id: string;
  source?: string;
}): void {
  trackWithGTMCheck('settlement_created', {
    entity_type: 'settlement',
    ...params
  });
}
