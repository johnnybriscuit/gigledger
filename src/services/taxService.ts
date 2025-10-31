/**
 * Tax service for fetching state rates and user tax profiles
 */

import { supabase } from '../lib/supabase';
import type { StateRate } from '../lib/tax/withholding';
import { CURRENT_TAX_YEAR } from '../lib/tax/constants';

// In-memory cache for state rates
const stateRateCache = new Map<string, StateRate>();

export interface UserTaxProfile {
  stateCode: string | null;
  filingStatus: 'single' | 'married' | 'hoh';
}

/**
 * Get state tax rate from database (with caching)
 * 
 * @param stateCode - Two-letter state code (e.g., 'TN', 'CA')
 * @param year - Tax year (defaults to current year)
 * @returns State rate data or null if not found
 */
export async function getStateRate(
  stateCode: string,
  year: number = CURRENT_TAX_YEAR
): Promise<StateRate | null> {
  const cacheKey = `${stateCode}-${year}`;
  
  // Check cache first
  if (stateRateCache.has(cacheKey)) {
    return stateRateCache.get(cacheKey)!;
  }
  
  try {
    const { data, error } = await supabase
      .from('state_tax_rates')
      .select('*')
      .eq('state_code', stateCode.toUpperCase())
      .eq('effective_year', year)
      .single();
    
    if (error) {
      console.warn(`No tax rate found for ${stateCode} in ${year}:`, error.message);
      return null;
    }
    
    // Cache the result
    stateRateCache.set(cacheKey, data as StateRate);
    
    return data as StateRate;
  } catch (err) {
    console.error('Error fetching state rate:', err);
    return null;
  }
}

/**
 * Get current user's tax profile
 * 
 * @returns User's state code and filing status
 */
export async function getUserTaxProfile(): Promise<UserTaxProfile> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('state_code, filing_status')
      .eq('id', user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user tax profile:', error);
      return {
        stateCode: null,
        filingStatus: 'single',
      };
    }
    
    return {
      stateCode: data.state_code,
      filingStatus: (data.filing_status as 'single' | 'married' | 'hoh') || 'single',
    };
  } catch (err) {
    console.error('Error in getUserTaxProfile:', err);
    return {
      stateCode: null,
      filingStatus: 'single',
    };
  }
}

/**
 * Update user's tax profile
 * 
 * @param stateCode - Two-letter state code
 * @param filingStatus - Filing status
 */
export async function updateUserTaxProfile(
  stateCode: string,
  filingStatus: 'single' | 'married' | 'hoh'
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Not authenticated');
    }
    
    const { error } = await supabase
      .from('profiles')
      .update({
        state_code: stateCode.toUpperCase(),
        filing_status: filingStatus,
      })
      .eq('id', user.id);
    
    if (error) {
      throw error;
    }
  } catch (err) {
    console.error('Error updating user tax profile:', err);
    throw err;
  }
}

/**
 * Check if user has completed tax profile setup
 */
export async function hasCompletedTaxProfile(): Promise<boolean> {
  const profile = await getUserTaxProfile();
  return profile.stateCode !== null;
}

/**
 * Clear state rate cache (useful for testing or manual refresh)
 */
export function clearStateRateCache(): void {
  stateRateCache.clear();
}

/**
 * Preload common state rates into cache
 * Call this on app startup to improve performance
 */
export async function preloadCommonStateRates(
  states: string[] = ['CA', 'NY', 'TX', 'FL', 'IL'],
  year: number = CURRENT_TAX_YEAR
): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('state_tax_rates')
      .select('*')
      .in('state_code', states)
      .eq('effective_year', year);
    
    if (error) {
      console.warn('Error preloading state rates:', error);
      return;
    }
    
    // Cache all results
    data?.forEach((rate) => {
      const cacheKey = `${rate.state_code}-${rate.effective_year}`;
      stateRateCache.set(cacheKey, rate as StateRate);
    });
    
    console.log(`Preloaded ${data?.length || 0} state tax rates`);
  } catch (err) {
    console.error('Error in preloadCommonStateRates:', err);
  }
}
