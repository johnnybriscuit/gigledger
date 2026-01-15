import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Subcontractor = Database['public']['Tables']['subcontractors']['Row'];
type SubcontractorInsert = Database['public']['Tables']['subcontractors']['Insert'];
type SubcontractorUpdate = Database['public']['Tables']['subcontractors']['Update'];

export interface SubcontractorWithPayments extends Subcontractor {
  total_paid?: number;
  payment_count?: number;
}

// Fetch all subcontractors for the current user
export function useSubcontractors() {
  return useQuery({
    queryKey: ['subcontractors'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Subcontractor[];
    },
  });
}

// Create a new subcontractor
export function useCreateSubcontractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subcontractor: Omit<SubcontractorInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('subcontractors')
        .insert({
          ...subcontractor,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Subcontractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
    },
  });
}

// Update a subcontractor
export function useUpdateSubcontractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SubcontractorUpdate }) => {
      const { data, error } = await supabase
        .from('subcontractors')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Subcontractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
    },
  });
}

// Delete a subcontractor
export function useDeleteSubcontractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('subcontractors')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subcontractors'] });
      queryClient.invalidateQueries({ queryKey: ['gigs'] });
    },
  });
}

// Fetch subcontractor payments for a specific gig
export function useGigSubcontractorPayments(gigId: string | null) {
  return useQuery({
    queryKey: ['gig-subcontractor-payments', gigId],
    queryFn: async () => {
      if (!gigId) return [];

      const { data, error } = await supabase
        .from('gig_subcontractor_payments')
        .select(`
          *,
          subcontractor:subcontractors(*)
        `)
        .eq('gig_id', gigId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!gigId,
  });
}

// Get YTD totals for a subcontractor
export function useSubcontractorYTD(subcontractorId: string | null, year?: number) {
  return useQuery({
    queryKey: ['subcontractor-ytd', subcontractorId, year],
    queryFn: async () => {
      if (!subcontractorId) return null;

      const currentYear = year || new Date().getFullYear();
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;

      const { data, error } = await supabase
        .from('gig_subcontractor_payments')
        .select(`
          amount,
          gig:gigs!inner(date)
        `)
        .eq('subcontractor_id', subcontractorId)
        .gte('gig.date', startDate)
        .lte('gig.date', endDate);

      if (error) throw error;

      const total = data.reduce((sum, payment) => sum + payment.amount, 0);
      return {
        total,
        count: data.length,
        year: currentYear,
      };
    },
    enabled: !!subcontractorId,
  });
}
