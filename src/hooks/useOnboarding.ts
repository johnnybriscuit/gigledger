import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type OnboardingStep = 'welcome' | 'basics' | 'payer' | 'gig' | 'expense' | 'done';

export interface OnboardingState {
  onboarding_completed: boolean;
  onboarding_step: OnboardingStep;
}

/**
 * Hook to get and manage onboarding progress for the current user
 */
export function useOnboarding() {
  const queryClient = useQueryClient();

  // Fetch onboarding state
  const { data: onboardingState, isLoading } = useQuery<OnboardingState>({
    queryKey: ['onboarding'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('user_settings')
        .select('onboarding_completed, onboarding_step')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If no settings exist yet, create them
        if (error.code === 'PGRST116') {
          const { data: newSettings, error: insertError } = await supabase
            .from('user_settings')
            .insert({
              user_id: user.id,
              onboarding_completed: false,
              onboarding_step: 'welcome',
            })
            .select('onboarding_completed, onboarding_step')
            .single();

          if (insertError) throw insertError;
          return newSettings as OnboardingState;
        }
        throw error;
      }

      return data as OnboardingState;
    },
  });

  // Update onboarding step
  const updateStep = useMutation({
    mutationFn: async (step: OnboardingStep) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({ onboarding_step: step })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Complete onboarding
  const completeOnboarding = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({
          onboarding_completed: true,
          onboarding_step: 'done',
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  // Reset onboarding (for testing or user request)
  const resetOnboarding = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('user_settings')
        .update({
          onboarding_completed: false,
          onboarding_step: 'welcome',
        })
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding'] });
    },
  });

  return {
    onboardingState,
    isLoading,
    updateStep,
    completeOnboarding,
    resetOnboarding,
    // Helper computed values
    isCompleted: onboardingState?.onboarding_completed ?? false,
    currentStep: onboardingState?.onboarding_step ?? 'welcome',
  };
}
