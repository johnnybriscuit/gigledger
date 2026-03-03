/**
 * Hook for fetching gigs in a specific state with location data
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DateRange } from './useDashboardData';

export interface GigWithLocation {
  id: string;
  date: string;
  city: string | null;
  state_code: string;
  venue: string | null;
  notes: string | null;
  gross_amount: number;
  tips: number;
  per_diem: number;
  other_income: number;
  fees: number;
  payer?: {
    name: string;
  };
}

interface UseStateGigsParams {
  stateCode: string | null;
  dateRange?: DateRange;
  customStart?: Date;
  customEnd?: Date;
  payerId?: string | null;
}

export function useStateGigs({ stateCode, dateRange = 'ytd', customStart, customEnd, payerId }: UseStateGigsParams) {
  return useQuery({
    queryKey: ['stateGigs', stateCode, dateRange, customStart, customEnd, payerId],
    queryFn: async () => {
      if (!stateCode) return [];

      // Calculate date range
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      if (dateRange === 'custom' && customStart && customEnd) {
        startDate = customStart;
        endDate = customEnd;
      } else {
        switch (dateRange) {
          case 'ytd':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          case 'last30':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          case 'last90':
            startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            break;
          case 'lastYear':
            startDate = new Date(now.getFullYear() - 1, 0, 1);
            endDate = new Date(now.getFullYear() - 1, 11, 31);
            break;
          default:
            startDate = new Date(now.getFullYear(), 0, 1);
        }
      }

      // Fetch gigs for this state
      let query = supabase
        .from('gigs')
        .select(`
          id,
          date,
          city,
          state_code,
          notes,
          gross_amount,
          tips,
          per_diem,
          other_income,
          fees,
          payer:payers(name)
        `)
        .eq('state_code', stateCode)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      // Filter by payer if specified
      if (payerId) {
        query = query.eq('payer_id', payerId);
      }

      const { data: gigs, error } = await query;

      if (error) throw error;

      return (gigs || []) as GigWithLocation[];
    },
    enabled: !!stateCode,
  });
}
