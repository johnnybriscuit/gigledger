import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { coerceToValidCategory } from '../lib/categoryMapping';

export type ExportFilters = {
  startDate: string;
  endDate: string;
  includeTips: boolean;
  includeFees: boolean;
};

export type GigExport = {
  user_id: string;
  date: string;
  payer: string;
  city_state: string;
  gross_amount: number;
  per_diem: number;
  tips: number;
  fees: number;
  other_income: number;
  net_amount: number;
  notes: string | null;
};

export type ExpenseExport = {
  user_id: string;
  date: string;
  category: string;
  vendor: string | null;
  description: string;
  amount: number;
  receipt_url: string | null;
  notes: string | null;
  recurring_expense_id: string | null;
};

export type MileageExport = {
  user_id: string;
  date: string;
  origin: string;
  destination: string;
  purpose: string;
  miles: number;
  deduction_amount: number;
  notes: string | null;
};

export type PayerExport = {
  user_id: string;
  name: string;
  payer_type: string;
  contact_email: string | null;
  expect_1099: boolean;
  notes: string | null;
};

export type ScheduleCSummary = {
  line_name: string;
  amount: number;
};

/**
 * Fetch gigs for export
 */
export function useGigsExport(filters: ExportFilters) {
  return useQuery({
    queryKey: ['gigs-export', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('gigs')
        .select(`
          user_id,
          date,
          gross_amount,
          per_diem,
          tips,
          fees,
          other_income,
          net_amount,
          notes,
          city,
          state,
          payer_id,
          payers(name)
        `)
        .eq('user_id', user.id)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Transform data to match GigExport type
      return data.map((gig: any) => ({
        user_id: gig.user_id,
        date: gig.date,
        payer: gig.payers?.name || '',
        city_state: [gig.city, gig.state].filter(Boolean).join(', '),
        gross_amount: gig.gross_amount,
        per_diem: gig.per_diem,
        tips: gig.tips,
        fees: gig.fees,
        other_income: gig.other_income,
        net_amount: gig.net_amount,
        notes: gig.notes,
      })) as GigExport[];
    },
  });
}

/**
 * Fetch expenses for export
 */
export function useExpensesExport(filters: ExportFilters) {
  return useQuery({
    queryKey: ['expenses-export', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Cast category to text to bypass enum validation errors
      const { data, error } = await supabase
        .from('expenses')
        .select('user_id, date, category::text, vendor, description, amount, receipt_url, notes, recurring_expense_id')
        .eq('user_id', user.id)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Defensive guard: coerce any invalid categories to valid enum values
      return (data || []).map(expense => ({
        ...expense,
        category: coerceToValidCategory(expense.category),
      })) as ExpenseExport[];
    },
  });
}

/**
 * Fetch mileage for export
 */
export function useMileageExport(filters: ExportFilters) {
  return useQuery({
    queryKey: ['mileage-export', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('mileage')
        .select('user_id, date, start_location, end_location, purpose, miles, notes')
        .eq('user_id', user.id)
        .gte('date', filters.startDate)
        .lte('date', filters.endDate)
        .order('date', { ascending: false });

      if (error) throw error;
      
      // Transform and calculate deduction
      return data.map((m: any) => ({
        user_id: m.user_id,
        date: m.date,
        origin: m.start_location,
        destination: m.end_location,
        purpose: m.purpose,
        miles: m.miles,
        deduction_amount: Math.round(m.miles * 0.67 * 100) / 100,
        notes: m.notes,
      })) as MileageExport[];
    },
  });
}

/**
 * Fetch payers for export
 */
export function usePayersExport() {
  return useQuery({
    queryKey: ['payers-export'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('payers')
        .select('user_id, name, payer_type, contact_email, expect_1099, notes')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      return data as PayerExport[];
    },
  });
}

/**
 * Fetch Schedule C summary
 */
export function useScheduleCSummary(filters: ExportFilters) {
  return useQuery({
    queryKey: ['schedule-c-summary', filters],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await (supabase.rpc as any)('calculate_schedule_c_summary', {
        p_user_id: user.id,
        p_start_date: filters.startDate,
        p_end_date: filters.endDate,
        p_include_tips: filters.includeTips,
        p_include_fees: filters.includeFees,
      });

      if (error) throw error;
      return data as ScheduleCSummary[];
    },
  });
}

/**
 * Get all export data at once
 */
export function useAllExportData(filters: ExportFilters) {
  const gigs = useGigsExport(filters);
  const expenses = useExpensesExport(filters);
  const mileage = useMileageExport(filters);
  const payers = usePayersExport();
  const scheduleC = useScheduleCSummary(filters);

  return {
    gigs,
    expenses,
    mileage,
    payers,
    scheduleC,
    isLoading: gigs.isLoading || expenses.isLoading || mileage.isLoading || payers.isLoading || scheduleC.isLoading,
    isError: gigs.isError || expenses.isError || mileage.isError || payers.isError || scheduleC.isError,
  };
}
