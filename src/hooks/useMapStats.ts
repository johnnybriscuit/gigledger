/**
 * Hook for fetching map statistics
 * Aggregates gig data by region (US states or world countries)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DateRange } from './useDashboardData';
import { getStateName, getCountryName } from '../lib/maps/regionNames';

export type MapScope = 'US' | 'WORLD';

export interface RegionStats {
  label: string;            // 'California', 'Tennessee', 'Canada', etc.
  code: string;             // 'CA', 'TN' (states) or 'US','CA','GB' (countries)
  gigsCount: number;
  totalIncome: number;
  topPayers: string[];      // up to 3
  lastGigDate: string | null;
}

export type RegionStatsMap = Record<string, RegionStats>;

interface MapStatsParams {
  scope: MapScope;
  dateRange?: DateRange;
  customStart?: Date;
  customEnd?: Date;
}

export function useMapStats({ scope, dateRange = 'ytd', customStart, customEnd }: MapStatsParams) {
  return useQuery({
    queryKey: ['mapStats', scope, dateRange, customStart, customEnd],
    queryFn: async () => {
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

      // Fetch gigs with location data
      let query = supabase
        .from('gigs')
        .select(`
          id,
          date,
          country_code,
          state_code,
          gross_amount,
          tips,
          per_diem,
          other_income,
          fees,
          payer:payers(name)
        `)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0]);

      // Filter by scope
      if (scope === 'US') {
        query = query.eq('country_code', 'US').not('state_code', 'is', null);
      } else {
        query = query.not('country_code', 'is', null);
      }

      const { data: gigs, error } = await query;

      if (error) throw error;

      // Aggregate by region
      const statsMap: RegionStatsMap = {};

      (gigs || []).forEach((gig: any) => {
        const code = scope === 'US' ? gig.state_code : gig.country_code;
        if (!code) return;

        const income = 
          (gig.gross_amount || 0) +
          (gig.tips || 0) +
          (gig.per_diem || 0) +
          (gig.other_income || 0) -
          (gig.fees || 0);

        if (!statsMap[code]) {
          statsMap[code] = {
            code,
            label: scope === 'US' ? getStateName(code) : getCountryName(code),
            gigsCount: 0,
            totalIncome: 0,
            topPayers: [],
            lastGigDate: null,
          };
        }

        const stats = statsMap[code];
        stats.gigsCount++;
        stats.totalIncome += income;

        // Track payer
        const payerName = gig.payer?.name;
        if (payerName && !stats.topPayers.includes(payerName)) {
          stats.topPayers.push(payerName);
        }

        // Track last gig date
        if (!stats.lastGigDate || gig.date > stats.lastGigDate) {
          stats.lastGigDate = gig.date;
        }
      });

      // Limit top payers to 3
      Object.values(statsMap).forEach(stats => {
        stats.topPayers = stats.topPayers.slice(0, 3);
      });

      return statsMap;
    },
  });
}
