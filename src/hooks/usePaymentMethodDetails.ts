/**
 * React Query hooks for payment method details management
 * Supports V1 methods: Venmo, Zelle, PayPal, Cash App
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export type PaymentMethod = 'venmo' | 'zelle' | 'paypal' | 'cashapp';

export interface PaymentMethodDetail {
  id: string;
  user_id: string;
  method: PaymentMethod;
  details: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethodDetailInput {
  method: PaymentMethod;
  details: string;
  enabled: boolean;
}

/**
 * Fetch all payment method details for a user
 */
export function usePaymentMethodDetails(userId?: string) {
  return useQuery({
    queryKey: userId ? queryKeys.paymentMethods(userId) : ['payment-methods-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('No user ID provided');

      const { data, error } = await supabase
        .from('payment_method_details' as any)
        .select('*')
        .eq('user_id', userId)
        .order('method', { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as PaymentMethodDetail[];
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Upsert a payment method detail (insert or update)
 */
export function useUpsertPaymentMethodDetail(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: PaymentMethodDetailInput) => {
      const { data, error } = await supabase
        .from('payment_method_details' as any)
        .upsert(
          {
            user_id: userId,
            method: input.method,
            details: input.details,
            enabled: input.enabled,
          },
          {
            onConflict: 'user_id,method',
          }
        )
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PaymentMethodDetail;
    },
    onSuccess: () => {
      // Invalidate payment methods cache
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods(userId) });
    },
  });
}

/**
 * Toggle enabled status for a payment method
 */
export function useTogglePaymentMethodEnabled(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ method, enabled }: { method: PaymentMethod; enabled: boolean }) => {
      const { data, error } = await supabase
        .from('payment_method_details' as any)
        .update({ enabled })
        .eq('user_id', userId)
        .eq('method', method)
        .select()
        .single();

      if (error) throw error;
      return data as unknown as PaymentMethodDetail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods(userId) });
    },
  });
}

/**
 * Delete a payment method detail
 */
export function useDeletePaymentMethodDetail(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (method: PaymentMethod) => {
      const { error } = await supabase
        .from('payment_method_details' as any)
        .delete()
        .eq('user_id', userId)
        .eq('method', method);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentMethods(userId) });
    },
  });
}
