/**
 * React Query Key Factory
 * 
 * Ensures all query keys include user.id to prevent cache bleeding between users.
 * 
 * CRITICAL: All query keys MUST include the user ID to ensure data isolation.
 * Without this, cached data from one user could be shown to another user.
 */

export const queryKeys = {
  // User profile
  profile: (userId: string) => ['profile', userId] as const,
  
  // Gigs
  gigs: (userId: string) => ['gigs', userId] as const,
  gig: (userId: string, gigId: string) => ['gigs', userId, gigId] as const,
  
  // Payers
  payers: (userId: string) => ['payers', userId] as const,
  payer: (userId: string, payerId: string) => ['payers', userId, payerId] as const,
  
  // Expenses
  expenses: (userId: string) => ['expenses', userId] as const,
  expense: (userId: string, expenseId: string) => ['expenses', userId, expenseId] as const,
  
  // Mileage
  mileage: (userId: string) => ['mileage', userId] as const,
  trip: (userId: string, tripId: string) => ['mileage', userId, tripId] as const,
  
  // Recurring expenses
  recurringExpenses: (userId: string) => ['recurring-expenses', userId] as const,
  recurringExpense: (userId: string, expenseId: string) => ['recurring-expenses', userId, expenseId] as const,
  
  // Dashboard
  dashboard: (userId: string, dateRange?: string) => 
    dateRange ? ['dashboard', userId, dateRange] as const : ['dashboard', userId] as const,
  
  // Map stats
  mapStats: (userId: string, scope: string, dateRange?: string) =>
    dateRange ? ['map-stats', userId, scope, dateRange] as const : ['map-stats', userId, scope] as const,
  
  // Subscription
  subscription: (userId: string) => ['subscription', userId] as const,
  
  // Tax profile
  taxProfile: (userId: string) => ['tax-profile', userId] as const,
  
  // Onboarding
  onboarding: (userId: string) => ['onboarding', userId] as const,
  
  // Exports
  exports: (userId: string, type?: string) =>
    type ? ['exports', userId, type] as const : ['exports', userId] as const,
  
  // Payment methods
  paymentMethods: (userId: string) => ['payment-methods', userId] as const,
} as const;

/**
 * Invalidate all queries for a specific user
 * Call this when user signs out or when you need to force refresh all data
 */
export function invalidateUserQueries(queryClient: any, userId: string) {
  // Invalidate all queries that start with any of our base keys and include this userId
  const baseKeys = [
    'profile',
    'gigs',
    'payers',
    'expenses',
    'mileage',
    'recurring-expenses',
    'dashboard',
    'map-stats',
    'subscription',
    'tax-profile',
    'onboarding',
    'exports',
  ];
  
  baseKeys.forEach(key => {
    queryClient.invalidateQueries({ queryKey: [key, userId] });
  });
}
