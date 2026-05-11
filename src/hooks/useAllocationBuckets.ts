import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useUserId } from './useCurrentUser';
import type { Database } from '../types/database.types';
import type { AllocationBucket } from '../types/allocation';
import { validateBucketPercentages } from '../utils/allocationEngine';

type DbAllocationBucket = Database['public']['Tables']['allocation_buckets']['Row'];

export interface CreateBucketInput {
  name: string;
  emoji: string;
  bucket_type: AllocationBucket['bucket_type'];
  percentage: number;
  color?: string;
  goal_amount?: number | null;
  goal_name?: string | null;
  goal_date?: string | null;
  sort_order?: number;
}

export interface UpdateBucketInput {
  name?: string;
  emoji?: string;
  percentage?: number;
  color?: string;
  goal_amount?: number | null;
  goal_name?: string | null;
  goal_date?: string | null;
  sort_order?: number;
  is_active?: boolean;
}

export interface ReorderBucketInput {
  id: string;
  sort_order: number;
}

export interface BucketValidationWarning {
  hasWarning: boolean;
  message: string;
  total: number;
  difference: number;
}

async function fetchBuckets(userId: string): Promise<DbAllocationBucket[]> {
  const { data, error } = await supabase
    .from('allocation_buckets')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function createBucket(
  userId: string,
  input: CreateBucketInput
): Promise<DbAllocationBucket> {
  const { data, error } = await supabase
    .from('allocation_buckets')
    .insert({
      user_id: userId,
      name: input.name,
      emoji: input.emoji,
      bucket_type: input.bucket_type,
      percentage: input.percentage,
      color: input.color || '#2E86AB',
      goal_amount: input.goal_amount || null,
      goal_name: input.goal_name || null,
      goal_date: input.goal_date || null,
      sort_order: input.sort_order ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function updateBucket(
  bucketId: string,
  userId: string,
  input: UpdateBucketInput
): Promise<DbAllocationBucket> {
  const { data, error } = await supabase
    .from('allocation_buckets')
    .update({
      ...input,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bucketId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteBucket(bucketId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('allocation_buckets')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bucketId)
    .eq('user_id', userId);

  if (error) throw error;
}

async function reorderBuckets(
  userId: string,
  reorders: ReorderBucketInput[]
): Promise<void> {
  const updates = reorders.map(({ id, sort_order }) =>
    supabase
      .from('allocation_buckets')
      .update({
        sort_order,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId)
  );

  const results = await Promise.all(updates);
  const errors = results.filter(r => r.error);
  
  if (errors.length > 0) {
    throw errors[0].error;
  }
}

export function useAllocationBuckets() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  const bucketsQuery = useQuery({
    queryKey: queryKeys.allocationBuckets(userId!),
    queryFn: () => fetchBuckets(userId!),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: (input: CreateBucketInput) => createBucket(userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationBuckets(userId!) });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBucketInput }) =>
      updateBucket(id, userId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationBuckets(userId!) });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (bucketId: string) => deleteBucket(bucketId, userId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationBuckets(userId!) });
    },
  });

  const reorderMutation = useMutation({
    mutationFn: (reorders: ReorderBucketInput[]) => reorderBuckets(userId!, reorders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.allocationBuckets(userId!) });
    },
  });

  const validatePercentages = (buckets?: DbAllocationBucket[]): BucketValidationWarning => {
    const bucketsToValidate = (buckets || bucketsQuery.data || []) as AllocationBucket[];
    const validation = validateBucketPercentages(bucketsToValidate);

    if (!validation.valid) {
      const message =
        validation.difference > 0
          ? `Bucket percentages total ${validation.total}% (${validation.difference}% over 100%). Consider adjusting.`
          : `Bucket percentages total ${validation.total}% (${Math.abs(validation.difference)}% under 100%). Consider adjusting.`;

      return {
        hasWarning: true,
        message,
        total: validation.total,
        difference: validation.difference,
      };
    }

    return {
      hasWarning: false,
      message: '',
      total: validation.total,
      difference: 0,
    };
  };

  return {
    buckets: bucketsQuery.data || [],
    isLoading: bucketsQuery.isLoading,
    error: bucketsQuery.error,
    createBucket: createMutation.mutateAsync,
    updateBucket: (id: string, input: UpdateBucketInput) =>
      updateMutation.mutateAsync({ id, input }),
    deleteBucket: deleteMutation.mutateAsync,
    reorderBuckets: reorderMutation.mutateAsync,
    validatePercentages,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
}
