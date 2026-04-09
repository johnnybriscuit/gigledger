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
