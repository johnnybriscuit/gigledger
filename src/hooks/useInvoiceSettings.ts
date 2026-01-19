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
    refetchOnMount: false, // Don't refetch if we have fresh cached data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const fetchSettings = async () => {
    queryClient.invalidateQueries({ queryKey: ['invoice_settings', userId] });
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

      if (!settings) {
        throw new Error('Invoice settings not initialized');
      }

      const invoiceNumber = `${settings.invoice_prefix}${new Date().getFullYear()}-${String(settings.next_invoice_number).padStart(3, '0')}`;

      await supabase
        .from('invoice_settings')
        .update({ next_invoice_number: settings.next_invoice_number + 1 })
        .eq('user_id', user.id);

      // Invalidate query to refetch settings
      await fetchSettings();

      return invoiceNumber;
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
