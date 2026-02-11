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

      // FETCH ALL EXPENSES - NO FILTERS TO DEBUG
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

      if (error) throw error;
      
      console.log('📊 [FETCH] Total expenses in DB:', data?.length);
      
      // Show ALL expenses with their is_draft status
      const allExpenses = data?.map(e => ({
        desc: e.description?.substring(0, 40),
        is_draft: e.is_draft,
        id: e.id.substring(0, 8)
      }));
      console.log('📊 [FETCH] ALL EXPENSES:', allExpenses);
      
      // Count by is_draft status
      const draftCount = data?.filter(e => e.is_draft === true).length || 0;
      const nonDraftCount = data?.filter(e => e.is_draft === false).length || 0;
      const nullCount = data?.filter(e => e.is_draft === null).length || 0;
      console.log('📊 [FETCH] Draft status breakdown:', {
        'is_draft=true': draftCount,
        'is_draft=false': nonDraftCount,
        'is_draft=null': nullCount
      });
      
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
  const { data: { user }, error: userErr } = await supabase.auth.getUser();
  if (userErr || !user?.id) throw new Error('Not authenticated');

  const userId = user.id;
  
  // Create safe filename (replace spaces and special chars with underscores)
  const safeName = (file.name || 'receipt')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  // Object key: userId/expenseId/timestamp_filename
  const objectKey = `${userId}/${expenseId}/${Date.now()}_${safeName}`;
  
  console.log('[uploadReceipt] Uploading to key:', objectKey);

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(objectKey, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: true,
    });

  if (uploadError) {
    console.error('[uploadReceipt] Upload failed:', uploadError);
    throw uploadError;
  }

  console.log('[uploadReceipt] Upload successful');
  return objectKey;
}

// Create draft expense for receipt-first flow
export async function createDraftExpense(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const today = new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      user_id: user.id,
      date: today,
      category: 'Other',
      description: '(Draft - scanning receipt...)',
      amount: 0,
      is_draft: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

// Delete draft expense (on cancel)
export async function deleteDraftExpense(expenseId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Delete receipt from storage first
  const { data: expense } = await supabase
    .from('expenses')
    .select('receipt_storage_path')
    .eq('id', expenseId)
    .eq('user_id', user.id)
    .single();

  if (expense?.receipt_storage_path) {
    await supabase.storage
      .from('receipts')
      .remove([expense.receipt_storage_path]);
  }

  // Delete expense
  await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId)
    .eq('user_id', user.id);
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
