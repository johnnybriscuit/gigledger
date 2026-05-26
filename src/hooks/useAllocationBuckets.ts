import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';
import { useUserId } from './useCurrentUser';
import type { Database } from '../types/database.types';
import type { AllocationBucket } from '../types/allocation';
import { validateBucketPercentages } from '../utils/allocationEngine';

type DbAllocationBucket = Database['public']['Tables']['allocation_buckets']['Row'];

const CORE_BUCKET_TYPES: ReadonlyArray<string> = [
  'federal_tax',
  'state_tax',
  'retirement',
  'emergency_fund',
  'spendable',
];

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

  const buckets = bucketsQuery.data || [];

  const totalAllocatedPercent = useMemo(() => {
    const nonSpendable = buckets.filter(b => b.bucket_type !== 'spendable');
    const total = nonSpendable.reduce((sum, b) => sum + b.percentage, 0);
    return Math.round(total * 100) / 100;
  }, [buckets]);

  const spendablePercent = Math.round((100 - totalAllocatedPercent) * 100) / 100;

  const validation = useMemo(
    () => validateBucketPercentages(buckets as unknown as AllocationBucket[]),
    [buckets]
  );

  const isValid = validation.valid;
  const validationError = isValid
    ? ''
    : validation.difference > 0
      ? `Bucket percentages total ${validation.total}% (${validation.difference}% over 100%). Consider adjusting.`
      : `Bucket percentages total ${validation.total}% (${Math.abs(validation.difference)}% under 100%). Consider adjusting.`;

  const validatePercentages = (overrideBuckets?: DbAllocationBucket[]): BucketValidationWarning => {
    const bucketsToValidate = (overrideBuckets || buckets) as AllocationBucket[];
    const v = validateBucketPercentages(bucketsToValidate);

    if (!v.valid) {
      const message =
        v.difference > 0
          ? `Bucket percentages total ${v.total}% (${v.difference}% over 100%). Consider adjusting.`
          : `Bucket percentages total ${v.total}% (${Math.abs(v.difference)}% under 100%). Consider adjusting.`;

      return {
        hasWarning: true,
        message,
        total: v.total,
        difference: v.difference,
      };
    }

    return {
      hasWarning: false,
      message: '',
      total: v.total,
      difference: 0,
    };
  };

  return {
    buckets,
    isLoading: bucketsQuery.isLoading,
    error: bucketsQuery.error,

    createBucket: async (input: CreateBucketInput) => {
      if (CORE_BUCKET_TYPES.includes(input.bucket_type)) {
        const duplicate = buckets.find(b => b.bucket_type === input.bucket_type);
        if (duplicate) {
          throw new Error(
            `A ${input.bucket_type} bucket already exists. Only one of each core bucket type is allowed.`
          );
        }
      }
      return createMutation.mutateAsync(input);
    },

    updateBucket: (id: string, input: UpdateBucketInput) =>
      updateMutation.mutateAsync({ id, input }),

    deleteBucket: async (bucketId: string) => {
      const bucket = buckets.find(b => b.id === bucketId);
      if (bucket && CORE_BUCKET_TYPES.includes(bucket.bucket_type)) {
        throw new Error(
          `Cannot delete a ${bucket.bucket_type} bucket. Only goal and debt buckets can be removed.`
        );
      }
      return deleteMutation.mutateAsync(bucketId);
    },

    reorderBuckets: (orderedIds: string[]) =>
      reorderMutation.mutateAsync(
        orderedIds.map((id, index) => ({ id, sort_order: index }))
      ),

    totalAllocatedPercent,
    spendablePercent,
    isValid,
    validationError,
    validatePercentages,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isReordering: reorderMutation.isPending,
  };
}
