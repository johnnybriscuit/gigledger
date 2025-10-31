import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database.types';

type Expense = Database['public']['Tables']['expenses']['Row'];
type ExpenseInsert = Database['public']['Tables']['expenses']['Insert'];
type ExpenseUpdate = Database['public']['Tables']['expenses']['Update'];

export function useExpenses() {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      return data as Expense[];
    },
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (expense: Omit<ExpenseInsert, 'user_id'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data as Expense;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
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
