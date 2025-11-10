import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useOnboarding } from '../hooks/useOnboarding';
import { usePayers } from '../hooks/usePayers';
import { useGigs } from '../hooks/useGigs';

interface OnboardingWizardProps {
  onComplete?: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const { onboardingState, isLoading, updateStep, completeOnboarding } = useOnboarding();
  const { data: payers } = usePayers();
  const { data: gigs } = useGigs();
  const [showAddPayer, setShowAddPayer] = useState(false);
  const [showAddGig, setShowAddGig] = useState(false);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // Don't show if onboarding is completed
  if (onboardingState?.onboarding_completed) {
    return null;
  }

  const currentStep = onboardingState?.onboarding_step || 'welcome';
  const hasPayers = (payers?.length || 0) > 0;
  const hasGigs = (gigs?.length || 0) > 0;

  const handleComplete = async () => {
    await completeOnboarding.mutateAsync();
    onComplete?.();
  };

  const steps = [
    { id: 'welcome', label: 'Welcome', completed: currentStep !== 'welcome' },
    { id: 'basics', label: 'Set Basics', completed: ['payer', 'gig', 'expense', 'done'].includes(currentStep) },
    { id: 'payer', label: 'Add Payer', completed: hasPayers || ['gig', 'expense', 'done'].includes(currentStep) },
    { id: 'gig', label: 'Add Gig', completed: hasGigs || ['expense', 'done'].includes(currentStep) },
    { id: 'expense', label: 'Add Expense (Optional)', completed: currentStep === 'done' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>🚀 Getting Started</Text>
          <TouchableOpacity onPress={handleComplete}>
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
                ) : step.id === currentStep ? (
                  <View style={styles.stepActiveCircle}>
                    <Text style={styles.stepNumber}>{index + 1}</Text>
                  </View>
                ) : (
                  <View style={styles.stepInactiveCircle}>
                    <Text style={styles.stepNumberInactive}>{index + 1}</Text>
                  </View>
                )}
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, step.completed && styles.stepLineCompleted]} />
                )}
              </View>
              <View style={styles.stepContent}>
                <Text style={[
                  styles.stepLabel,
                  step.completed && styles.stepLabelCompleted,
                  step.id === currentStep && styles.stepLabelActive,
                ]}>
                  {step.label}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* Current Step Content */}
        <View style={styles.stepContentContainer}>
          {currentStep === 'welcome' && (
            <View>
              <Text style={styles.stepTitle}>Welcome to GigLedger! 🎵</Text>
              <Text style={styles.stepDescription}>
                Track your music income, expenses, and get tax estimates all in one place.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => updateStep.mutate('basics')}
              >
                <Text style={styles.primaryButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'basics' && (
            <View>
              <Text style={styles.stepTitle}>Set Up Your Basics</Text>
              <Text style={styles.stepDescription}>
                Go to the Account tab to set your name and state for tax calculations.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => updateStep.mutate('payer')}
              >
                <Text style={styles.primaryButtonText}>Next: Add a Payer</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentStep === 'payer' && (
            <View>
              <Text style={styles.stepTitle}>Add Your First Payer</Text>
              <Text style={styles.stepDescription}>
                {hasPayers
                  ? '✓ Great! You\'ve added a payer. Now let\'s add your first gig.'
                  : 'Add a venue, client, or platform that pays you for gigs.'}
              </Text>
              {hasPayers ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => updateStep.mutate('gig')}
                >
                  <Text style={styles.primaryButtonText}>Next: Add a Gig</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => {
                    // Navigate to Payers tab
                    // This will be handled by the parent component
                    setShowAddPayer(true);
                  }}
                >
                  <Text style={styles.primaryButtonText}>Go to Payers Tab</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {currentStep === 'gig' && (
            <View>
              <Text style={styles.stepTitle}>Add Your First Gig</Text>
              <Text style={styles.stepDescription}>
                {hasGigs
                  ? '✓ Awesome! You\'ve logged your first gig. Want to add expenses?'
                  : 'Log a performance with date, payer, and payment details.'}
              </Text>
              {hasGigs ? (
                <View>
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => updateStep.mutate('expense')}
                  >
                    <Text style={styles.primaryButtonText}>Add Expenses (Optional)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleComplete}
                  >
                    <Text style={styles.secondaryButtonText}>Skip to Dashboard</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => setShowAddGig(true)}
                >
                  <Text style={styles.primaryButtonText}>Go to Gigs Tab</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {currentStep === 'expense' && (
            <View>
              <Text style={styles.stepTitle}>Add Expenses (Optional)</Text>
              <Text style={styles.stepDescription}>
                Track business expenses like travel, equipment, and meals to maximize your tax deductions.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleComplete}
              >
                <Text style={styles.primaryButtonText}>Complete Setup</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleComplete}
              >
                <Text style={styles.secondaryButtonText}>Skip for Now</Text>
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
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
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
    fontSize: 24,
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
    marginBottom: 20,
  },
  stepsContainer: {
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  stepIndicator: {
    alignItems: 'center',
    marginRight: 12,
  },
  stepCompletedCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepActiveCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepInactiveCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepNumber: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepNumberInactive: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepLine: {
    width: 2,
    height: 20,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  stepLineCompleted: {
    backgroundColor: '#10b981',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: 16,
    color: '#6b7280',
  },
  stepLabelCompleted: {
    color: '#10b981',
    textDecorationLine: 'line-through',
  },
  stepLabelActive: {
    color: '#111827',
    fontWeight: '600',
  },
  stepContentContainer: {
    paddingTop: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  stepDescription: {
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
    marginBottom: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  secondaryButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
});
