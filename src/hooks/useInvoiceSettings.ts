import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { InvoiceSettings } from '../types/invoice';
import { useUserId } from './useCurrentUser';

export function useInvoiceSettings() {
  const queryClient = useQueryClient();
  const userId = useUserId();

  const { data: settings = null, isLoading: loading, error } = useQuery({
    queryKey: ['invoice_settings', userId],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      return data as InvoiceSettings | null;
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - settings rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
    placeholderData: (previousData) => previousData,
    // refetchOnMount defaults to true, which respects staleTime
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const fetchSettings = async () => {
    return queryClient.invalidateQueries({ queryKey: ['invoice_settings', userId] });
  };

  const createSettings = async (settingsData: Partial<InvoiceSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: insertError } = await supabase
        .from('invoice_settings')
        .insert({
          user_id: user.id,
          ...settingsData as any
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Invalidate query to refetch settings
      await fetchSettings();
      return data;
    } catch (err) {
      console.error('Error creating invoice settings:', err);
      throw err;
    }
  };

  const updateSettings = async (settingsData: Partial<InvoiceSettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: updateError } = await supabase
        .from('invoice_settings')
        .update(settingsData as any)
        .eq('user_id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      // Invalidate query to refetch settings
      await fetchSettings();
      return data;
    } catch (err) {
      console.error('Error updating invoice settings:', err);
      throw err;
    }
  };

  const getNextInvoiceNumber = async (): Promise<string> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const maxRetries = 5;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const { data: latestSettings, error: settingsError } = await supabase
          .from('invoice_settings')
          .select('invoice_prefix, next_invoice_number')
          .eq('user_id', user.id)
          .single();

        if (settingsError || !latestSettings) {
          throw settingsError ?? new Error('Invoice settings not initialized');
        }

        const nextNumber = latestSettings.next_invoice_number;
        const invoiceNumber = `${latestSettings.invoice_prefix}${new Date().getFullYear()}-${String(nextNumber).padStart(3, '0')}`;

        const { data: updatedRows, error: updateError } = await supabase
          .from('invoice_settings')
          .update({ next_invoice_number: nextNumber + 1 })
          .eq('user_id', user.id)
          .eq('next_invoice_number', nextNumber)
          .select('next_invoice_number');

        if (updateError) {
          throw updateError;
        }

        if (updatedRows && updatedRows.length > 0) {
          await fetchSettings();
          return invoiceNumber;
        }
      }

      throw new Error('Could not reserve invoice number. Please try again.');
    } catch (err) {
      console.error('Error getting next invoice number:', err);
      throw err;
    }
  };

  return {
    settings,
    loading,
    error,
    createSettings,
    updateSettings,
    getNextInvoiceNumber,
    refetch: fetchSettings
  };
}
