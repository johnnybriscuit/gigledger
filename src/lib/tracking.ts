interface TrackingParams {
  [key: string]: string | number | boolean | undefined;
}

export function track(eventName: string, params?: TrackingParams): void {
  if (typeof window === 'undefined') return;
  
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params
  });
  
  console.log('🔥 [Tracking]', eventName, params);
}

declare global {
  interface Window {
    dataLayer?: any[];
  }
}
