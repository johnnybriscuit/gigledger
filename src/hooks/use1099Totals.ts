/**
 * Hook for fetching subcontractor 1099-NEC totals by year
 * Uses the subcontractor_1099_totals view for efficient aggregation
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Subcontractor1099Total {
  user_id: string;
  subcontractor_id: string;
  name: string;
  legal_name: string | null;
  email: string | null;
  edelivery_email: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  tax_id_type: string | null;
  tax_id_last4: string | null;
  w9_status: string;
  w9_document_url: string | null;
  edelivery_consent: boolean;
  last_1099_email_sent_at: string | null;
  tax_year: number;
  gig_count: number;
  total_paid: number;
  requires_1099: boolean;
}

export function use1099Totals(taxYear: number) {
  return useQuery({
    queryKey: ['subcontractor-1099-totals', taxYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_1099_totals' as any)
        .select('*')
        .eq('tax_year', taxYear)
        .order('total_paid', { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as Subcontractor1099Total[];
    },
  });
}

export function use1099TotalForSubcontractor(subcontractorId: string, taxYear: number) {
  return useQuery({
    queryKey: ['subcontractor-1099-total', subcontractorId, taxYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcontractor_1099_totals' as any)
        .select('*')
        .eq('subcontractor_id', subcontractorId)
        .eq('tax_year', taxYear)
        .single();

      if (error) {
        // If no data found, return null (no payments this year)
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data as unknown as Subcontractor1099Total;
    },
  });
}

/**
 * Helper to check if subcontractor has missing info for 1099 preparation
 */
export function getMissingInfoWarnings(subcontractor: Subcontractor1099Total): string[] {
  const warnings: string[] = [];

  if (!subcontractor.address_line1) {
    warnings.push('Missing address');
  }
  if (!subcontractor.city) {
    warnings.push('Missing city');
  }
  if (!subcontractor.state) {
    warnings.push('Missing state');
  }
  if (!subcontractor.postal_code) {
    warnings.push('Missing postal code');
  }
  if (!subcontractor.tax_id_last4) {
    warnings.push('Missing TIN (last 4)');
  }
  if (subcontractor.w9_status !== 'received') {
    warnings.push('W-9 not received');
  }
  if (!subcontractor.email && !subcontractor.edelivery_email) {
    warnings.push('Missing email');
  }

  return warnings;
}

/**
 * Helper to get effective email for 1099 delivery
 */
export function getEffective1099Email(subcontractor: Subcontractor1099Total): string | null {
  return subcontractor.edelivery_email || subcontractor.email || null;
}

/**
 * Helper to check if 1099 can be emailed
 */
export function canEmail1099(subcontractor: Subcontractor1099Total): boolean {
  return subcontractor.edelivery_consent && !!getEffective1099Email(subcontractor);
}
