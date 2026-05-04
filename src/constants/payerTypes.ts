export const PAYER_TYPES = [
  'Venue',
  'Client',
  'Platform',
  'Agency',
  'Other',
  'Individual',
  'Corporation',
] as const;

export type PayerType = typeof PAYER_TYPES[number];

// Friendly display labels for payer types
export const PAYER_TYPE_LABELS: Record<PayerType, string> = {
  'Venue': 'Venue',
  'Client': 'Client',
  'Platform': 'App / Platform',
  'Agency': 'Booking Agent',
  'Other': 'Other',
  'Individual': 'Individual',
  'Corporation': 'Corporation',
};
