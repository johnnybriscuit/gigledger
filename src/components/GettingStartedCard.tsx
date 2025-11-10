import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useOnboarding } from '../hooks/useOnboarding';
import { usePayers } from '../hooks/usePayers';
import { useGigs } from '../hooks/useGigs';

interface GettingStartedCardProps {
  onNavigateToTab: (tab: 'payers' | 'gigs' | 'expenses' | 'account') => void;
}

export function GettingStartedCard({ onNavigateToTab }: GettingStartedCardProps) {
  const { onboardingState, isLoading, updateStep, completeOnboarding } = useOnboarding();
  const { data: payers } = usePayers();
  const { data: gigs } = useGigs();

  const hasPayers = (payers?.length || 0) > 0;
  const hasGigs = (gigs?.length || 0) > 0;

  // Auto-complete if user already has data
  useEffect(() => {
    if (hasPayers && hasGigs && !onboardingState?.onboarding_completed && !isLoading) {
      // User already has data, mark onboarding as complete
      completeOnboarding.mutate();
    }
  }, [hasPayers, hasGigs, onboardingState?.onboarding_completed, isLoading]);

  // Don't show if loading
  if (isLoading) {
    return null;
  }

  // Don't show if onboarding is completed
  if (onboardingState?.onboarding_completed) {
    return null;
  }

  const currentStep = onboardingState?.onboarding_step || 'welcome';

  const handleSkip = () => {
    completeOnboarding.mutate();
  };

  const handleAddPayer = () => {
    updateStep.mutate('payer');
    onNavigateToTab('payers');
  };

  const handleAddGig = () => {
    updateStep.mutate('gig');
    onNavigateToTab('gigs');
  };

  const steps = [
    { id: 'welcome', label: 'Welcome', completed: currentStep !== 'welcome' },
    { id: 'payer', label: 'Add Payer', completed: hasPayers },
    { id: 'gig', label: 'Add Gig', completed: hasGigs },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>🚀 Getting Started</Text>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.subtitle}>
          Let's set up your account in just a few steps
        </Text>

        {/* Progress Steps */}
        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepRow}>
              <View style={styles.stepIndicator}>
                {step.completed ? (
                  <View style={styles.stepCompletedCircle}>
                    <Text style={styles.checkmark}>✓</Text>
                  </View>
                ) : (
                  <View style={styles.stepInactiveCircle}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                step.completed && styles.stepLabelCompleted,
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Current Step Actions */}
        <View style={styles.actionsContainer}>
          {currentStep === 'welcome' && (
            <View>
              <Text style={styles.actionTitle}>Welcome to GigLedger! 🎵</Text>
              <Text style={styles.actionDescription}>
                Track your music income, expenses, and get tax estimates all in one place.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddPayer}
              >
                <Text style={styles.primaryButtonText}>Add Your First Payer</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'payer' && !hasPayers && (
            <View>
              <Text style={styles.actionTitle}>Add Your First Payer</Text>
              <Text style={styles.actionDescription}>
                A payer is anyone who pays you for gigs - venues, clients, or platforms.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddPayer}
              >
                <Text style={styles.primaryButtonText}>Go to Payers Tab</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'payer' && hasPayers && (
            <View>
              <Text style={styles.actionTitle}>✓ Payer Added!</Text>
              <Text style={styles.actionDescription}>
                Great! Now let's log your first gig.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddGig}
              >
                <Text style={styles.primaryButtonText}>Add Your First Gig</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'gig' && !hasGigs && (
            <View>
              <Text style={styles.actionTitle}>Log Your First Gig</Text>
              <Text style={styles.actionDescription}>
                Add a performance with date, payer, and payment details.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAddGig}
              >
                <Text style={styles.primaryButtonText}>Go to Gigs Tab</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'gig' && hasGigs && (
            <View>
              <Text style={styles.actionTitle}>🎉 You're All Set!</Text>
              <Text style={styles.actionDescription}>
                You've added your first payer and gig. Start tracking your music income!
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSkip}
              >
                <Text style={styles.primaryButtonText}>Complete Setup</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  skipText: {
    fontSize: 14,
    color: '#6b7280',
    textDecorationLine: 'underline',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  stepsContainer: {
    marginBottom: 20,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepIndicator: {
    marginRight: 12,
  },
  stepCompletedCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInactiveCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepNumber: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepLabel: {
    fontSize: 15,
    color: '#6b7280',
  },
  stepLabelCompleted: {
    color: '#10b981',
    fontWeight: '600',
  },
  actionsContainer: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
