import type { Database } from './database.types';

export type TourRun = Database['public']['Tables']['tour_runs']['Row'];
export type TourRunInsert = Database['public']['Tables']['tour_runs']['Insert'];
export type TourRunUpdate = Database['public']['Tables']['tour_runs']['Update'];

export type Settlement = Database['public']['Tables']['settlements']['Row'];
export type SettlementInsert = Database['public']['Tables']['settlements']['Insert'];
export type SettlementUpdate = Database['public']['Tables']['settlements']['Update'];

export type AllocationMode = 'even' | 'custom' | 'weighted' | 'none';

export interface AllocationJson {
  [gigId: string]: number;
}

export interface TourWithGigs extends TourRun {
  gigs?: Array<{
    id: string;
    date: string;
    title: string | null;
    location: string | null;
    gross_amount: number;
    tips: number;
    per_diem: number | null;
    other_income: number | null;
    fees: number;
    payer: {
      id: string;
      name: string;
    } | null;
  }>;
  settlements?: Settlement[];
  tour_expenses?: Array<{
    id: string;
    amount: number;
    category: string;
    description: string;
    allocation_mode: AllocationMode;
    allocation_json: AllocationJson | null;
  }>;
}

export interface TourSummary {
  id: string;
  name: string;
  artist_name: string | null;
  start_date: string | null;
  end_date: string | null;
  gig_count: number;
  gross_total: number;
  expenses_total: number;
  net_total: number;
}

export interface TourFinancials {
  totals: {
    gross: number;
    expenses: number;
    net: number;
  };
  perGig: {
    [gigId: string]: {
      allocatedIncome: number;
      allocatedSharedExpenses: number;
      gigSpecificExpenses: number;
      net: number;
    };
  };
}

export interface GigAllocationPreview {
  gigId: string;
  gigTitle: string;
  gigDate: string;
  allocatedAmount: number;
  weight?: number;
}
