/**
 * Aggregated Invoices Data Hook
 * 
 * PERFORMANCE OPTIMIZATION: Fetches all invoices page data in a single query
 * instead of 5+ separate queries. This eliminates network waterfalls and
 * reduces total requests.
 * 
 * Expected Impact: 60-70% reduction in load time (8.12s → ~3-4s)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useUserId } from './useCurrentUser';

interface InvoicesDataAggregated {
  invoices: any[];
  settings: any;
  entitlements: any;
  paymentMethods: any[];
}

/**
 * Fetch all invoices page data in parallel with a single hook call
 * Uses Promise.all to execute all queries simultaneously
 */
export function useInvoicesDataAggregated() {
  const userId = useUserId();

  return useQuery({
    queryKey: ['invoices_aggregated', userId],
    queryFn: async (): Promise<InvoicesDataAggregated> => {
      if (!userId) throw new Error('Not authenticated');

      // Execute all queries in parallel
      const [invoicesResult, settingsResult, subscriptionResult, paymentMethodsResult] = await Promise.all([
        // Invoices with line items and payments
        supabase
          .from('invoices' as any)
          .select(`
            id,
            invoice_number,
            client_id,
            client_name,
            client_email,
            client_company,
            client_address,
            invoice_date,
            due_date,
            status,
            total_amount,
            tax_rate,
            discount_amount,
            notes,
            private_notes,
            payment_terms,
            accepted_payment_methods,
            created_at,
            updated_at,
            line_items:invoice_line_items(id, description, quantity, rate),
            payments:invoice_payments(id, amount, payment_date, payment_method)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
        
        // Invoice settings
        supabase
          .from('invoice_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        
        // Subscription for entitlements
        supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        
        // Payment method details
        supabase
          .from('payment_method_details' as any)
          .select('*')
          .eq('user_id', userId),
      ]);

      // Check for errors
      if (invoicesResult.error) throw invoicesResult.error;
      if (settingsResult.error && settingsResult.error.code !== 'PGRST116') throw settingsResult.error;
      if (subscriptionResult.error && subscriptionResult.error.code !== 'PGRST116') throw subscriptionResult.error;
      if (paymentMethodsResult.error) throw paymentMethodsResult.error;

      // Calculate total_paid and balance_due for each invoice
      const invoicesWithCalculations = (invoicesResult.data || []).map((invoice: any) => {
        const totalPaid = invoice.payments?.reduce((sum: number, p: any) => sum + parseFloat(p.amount), 0) || 0;
        return {
          ...invoice,
          total_paid: totalPaid,
          balance_due: parseFloat(invoice.total_amount) - totalPaid
        };
      });

      return {
        invoices: invoicesWithCalculations,
        settings: settingsResult.data,
        entitlements: subscriptionResult.data,
        paymentMethods: paymentMethodsResult.data || [],
      };
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
    placeholderData: (previousData) => previousData,
    refetchOnWindowFocus: false,
  });
}
