import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { InvoiceSettings } from '../types/invoice';

export function useInvoiceSettings() {
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error: fetchError } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      setSettings(data as any);
    } catch (err) {
      console.error('Error fetching invoice settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
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

      setSettings(data as any);
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

      setSettings(data as any);
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

      setSettings({
        ...settings,
        next_invoice_number: settings.next_invoice_number + 1
      });

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
