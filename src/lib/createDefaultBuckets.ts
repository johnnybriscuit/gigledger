import { supabase } from './supabase';
import type { Database } from '../types/database.types';

type BucketInsert = Database['public']['Tables']['allocation_buckets']['Insert'];

const NO_STATE_TAX_STATES: ReadonlyArray<string> = [
  'TX', 'FL', 'WA', 'NV', 'WY', 'SD', 'AK',
];

/**
 * Creates the standard starting set of allocation buckets for a new user.
 * Safe to call from onboarding — returns early without throwing if the user
 * already has any buckets configured.
 *
 * State-tax logic:
 *   - null stateCode: falls back to 25% combined federal (same as no-state-tax path)
 *   - No-tax states (TX, FL, WA, NV, WY, SD, AK): federal_tax = 25%, no state bucket
 *   - All other states: federal_tax = 20%, state_tax = 5%
 * Fixed allocations: retirement = 10%, emergency_fund = 5%
 * Spendable = 100 − sum of above (always 60%)
 */
export async function createDefaultBuckets(
  userId: string,
  stateCode: string | null
): Promise<void> {
  const { data: existing, error: checkError } = await supabase
    .from('allocation_buckets')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (checkError) throw checkError;
  if (existing && existing.length > 0) return;

  const noStateTax = stateCode === null || NO_STATE_TAX_STATES.includes(stateCode.toUpperCase());
  const federalPercent = noStateTax ? 25 : 20;
  const stateTaxPercent = noStateTax ? 0 : 5;
  const retirementPercent = 10;
  const emergencyPercent = 5;
  const spendablePercent =
    100 - federalPercent - stateTaxPercent - retirementPercent - emergencyPercent;

  const buckets: BucketInsert[] = [];
  let sortOrder = 0;

  buckets.push({
    user_id: userId,
    name: 'Federal & SE Taxes',
    emoji: '🏛️',
    bucket_type: 'federal_tax',
    percentage: federalPercent,
    color: '#DC2626',
    sort_order: sortOrder++,
    is_active: true,
  });

  if (!noStateTax) {
    buckets.push({
      user_id: userId,
      name: 'State Taxes',
      emoji: '🏛️',
      bucket_type: 'state_tax',
      percentage: stateTaxPercent,
      color: '#EA580C',
      sort_order: sortOrder++,
      is_active: true,
    });
  }

  buckets.push(
    {
      user_id: userId,
      name: 'Retirement',
      emoji: '📈',
      bucket_type: 'retirement',
      percentage: retirementPercent,
      color: '#2563EB',
      sort_order: sortOrder++,
      is_active: true,
    },
    {
      user_id: userId,
      name: 'Emergency Fund',
      emoji: '🛟',
      bucket_type: 'emergency_fund',
      percentage: emergencyPercent,
      color: '#16A34A',
      sort_order: sortOrder++,
      is_active: true,
    },
    {
      user_id: userId,
      name: 'Yours to Spend',
      emoji: '✅',
      bucket_type: 'spendable',
      percentage: spendablePercent,
      color: '#2E86AB',
      sort_order: sortOrder++,
      is_active: true,
    }
  );

  const { error } = await supabase.from('allocation_buckets').insert(buckets);
  if (error) throw error;
}
