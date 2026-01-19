import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';
import { queryKeys } from '../lib/queryKeys';
import { getPlanAndUsage, createExpenseLimitError } from '../lib/planLimits';
import { getCachedUserId } from '../lib/sharedAuth';
import { useUserId } from './useCurrentUser';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];

export function useExpenses() {
  const userId = useUserId();
  
  return useQuery({
    queryKey: userId ? queryKeys.expenses(userId) : ['expenses-loading'],
    queryFn: async () => {
      if (!userId) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // 60 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    placeholderData: (previousData) => previousData,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<ExpenseInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check plan limits before creating expense
      const planCheck = await getPlanAndUsage(supabase, user.id);
      
      if (!planCheck.canCreateExpenses) {
        throw createExpenseLimitError(planCheck);
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
        queryClient.invalidateQueries({ queryKey: ['entitlements', userId] });
      }
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ExpenseUpdate & { id: string }) => {
      // Remove user_id from updates to prevent RLS policy violations
      const { user_id, ...safeUpdates } = updates as any;
      
      const { data, error } = await supabase
        .from('expenses')
        .update(safeUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
        queryClient.invalidateQueries({ queryKey: ['entitlements', userId] });
      }
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const userId = getCachedUserId();
      if (!userId) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: async () => {
      const userId = getCachedUserId();
      if (userId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.expenses(userId) });
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard(userId) });
        queryClient.invalidateQueries({ queryKey: ['entitlements', userId] });
      }
    },
  });
}

// Upload receipt to Supabase Storage
export async function uploadReceipt(expenseId: string, file: File): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${expenseId}_receipt.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(fileName, file, {
      upsert: true,
    });

  if (uploadError) throw uploadError;

  return fileName;
}

// Get signed URL for receipt
export async function getReceiptUrl(receiptPath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('receipts')
    .createSignedUrl(receiptPath, 3600); // 1 hour expiry

  if (error) throw error;
  if (!data) throw new Error('Failed to generate signed URL');

  return data.signedUrl;
}

// Delete receipt from storage
export async function deleteReceipt(receiptPath: string): Promise<void> {
  const { error } = await supabase.storage
    .from('receipts')
    .remove([receiptPath]);

  if (error) throw error;
}
