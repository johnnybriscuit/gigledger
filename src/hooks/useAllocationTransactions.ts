import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useUserId } from './useCurrentUser';
import type { Database } from '../types/database.types';
import type { AllocationTransaction, AllocationBucket, BucketYTDTotal } from '../types/allocation';
import { calculateAllocations } from '../utils/allocationEngine';

type DbAllocationTransaction = Database['public']['Tables']['allocation_transactions']['Row'];
type DbAllocationBucket = Database['public']['Tables']['allocation_buckets']['Row'];

export interface TransactionFilters {
  startDate?: string;
  endDate?: string;
  gigId?: string;
}

export interface CreateAllocationInput {
  gigId: string;
  grossAmount: number;
  gigDate?: string;
}

async function fetchTransactions(
  userId: string,
  filters?: TransactionFilters
): Promise<DbAllocationTransaction[]> {
  let query = supabase
    .from('allocation_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('transaction_date', { ascending: false });

  if (filters?.startDate) {
    query = query.gte('transaction_date', filters.startDate);
  }

  if (filters?.endDate) {
    query = query.lte('transaction_date', filters.endDate);
  }

  if (filters?.gigId) {
    query = query.eq('gig_id', filters.gigId);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function createAllocationForGig(
  userId: string,
  input: CreateAllocationInput
): Promise<DbAllocationTransaction[]> {
  const { data: buckets, error: bucketsError } = await supabase
    .from('allocation_buckets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (bucketsError) throw bucketsError;
  if (!buckets || buckets.length === 0) {
    throw new Error('No active allocation buckets found. Please set up your buckets first.');
  }

  // Deduplication guard: check which bucket_ids already have a record for this gig
  const { data: existing } = await supabase
    .from('allocation_transactions')
    .select('bucket_id')
    .eq('user_id', userId)
    .eq('gig_id', input.gigId);

  const existingBucketIds = new Set((existing ?? []).map(r => r.bucket_id));

  const allocations = calculateAllocations(input.grossAmount, buckets as unknown as AllocationBucket[]);

  const transactionsToInsert = allocations
    .filter(allocation => !existingBucketIds.has(allocation.bucket.id))
    .map(allocation => ({
      user_id: userId,
      gig_id: input.gigId,
      bucket_id: allocation.bucket.id,
      gross_amount: input.grossAmount,
      allocated_amount: allocation.allocatedAmount,
      percentage_used: allocation.percentage,
      transaction_date: input.gigDate ?? new Date().toISOString().split('T')[0],
    }));

  // Nothing new to insert — already fully allocated
  if (transactionsToInsert.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('allocation_transactions')
    .insert(transactionsToInsert)
    .select();

  if (error) throw error;
  return data || [];
}

async function getYTDTotals(userId: string, year?: number): Promise<BucketYTDTotal[]> {
  const currentYear = year || new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  const { data, error } = await supabase
    .from('allocation_transactions')
    .select('bucket_id, allocated_amount')
    .eq('user_id', userId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) throw error;

  const totals: Record<string, number> = {};
  
  (data || []).forEach(transaction => {
    if (!totals[transaction.bucket_id]) {
      totals[transaction.bucket_id] = 0;
    }
    totals[transaction.bucket_id] += transaction.allocated_amount;
  });

  return Object.entries(totals).map(([bucket_id, total]) => ({
    bucket_id,
    total: Math.round(total * 100) / 100,
  }));
}

async function getBucketBalance(
  userId: string,
  bucketId: string,
  year?: number
): Promise<number> {
  const currentYear = year || new Date().getFullYear();
  const startDate = `${currentYear}-01-01`;
  const endDate = `${currentYear}-12-31`;

  const { data, error } = await supabase
    .from('allocation_transactions')
    .select('allocated_amount')
    .eq('user_id', userId)
    .eq('bucket_id', bucketId)
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate);

  if (error) throw error;

  const total = (data || []).reduce((sum, t) => sum + t.allocated_amount, 0);
  return Math.round(total * 100) / 100;
}

export function useAllocationTransactions(filters?: TransactionFilters) {
  const userId = useUserId();
  const queryClient = useQueryClient();

  const transactionsQuery = useQuery({
    queryKey: queryKeys.allocationTransactions(userId!, filters),
    queryFn: () => fetchTransactions(userId!, filters),
    enabled: !!userId,
  });

  const ytdQuery = useQuery({
    queryKey: queryKeys.allocationYTD(userId!),
    queryFn: () => getYTDTotals(userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateAllocationInput) => createAllocationForGig(userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationTransactions(userId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationYTD(userId!) });
    },
  });

  const getBucketBalanceQuery = (bucketId: string, year?: number) => {
    return useQuery({
      queryKey: ['bucket-balance', userId, bucketId, year],
      queryFn: () => getBucketBalance(userId!, bucketId, year),
      enabled: !!userId && !!bucketId,
    });
  };

  const transactions = transactionsQuery.data || [];
  const ytdTotals = ytdQuery.data || [];

  return {
    transactions,
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,

    transactionsByGig: (gigId: string): DbAllocationTransaction[] =>
      transactions.filter(t => t.gig_id === gigId),

    ytdTotals,
    isLoadingYTD: ytdQuery.isLoading,

    ytdTotalByBucket: (bucketId: string): number => {
      const entry = ytdTotals.find(t => t.bucket_id === bucketId);
      return entry?.total ?? 0;
    },

    createAllocationsForGig: createMutation.mutateAsync,
    createAllocationForGig: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    getBucketBalance: (bucketId: string, year?: number) =>
      getBucketBalance(userId!, bucketId, year),
  };
}
