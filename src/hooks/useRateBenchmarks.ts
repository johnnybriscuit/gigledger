import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RateBenchmark } from '../types/allocation';

export function useRateBenchmarks() {
  const { data: benchmarks = [], isLoading } = useQuery<RateBenchmark[]>({
    queryKey: ['rate-benchmarks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rate_benchmarks')
        .select('*')
        .order('gig_type');
      if (error) throw error;
      return data as RateBenchmark[];
    },
    staleTime: 24 * 60 * 60 * 1000, // 24 hours — benchmark data changes rarely
  });

  const getBenchmarkForType = (gigType: string): RateBenchmark | undefined =>
    benchmarks.find(b => b.gig_type === gigType);

  return { benchmarks, isLoading, getBenchmarkForType };
}
