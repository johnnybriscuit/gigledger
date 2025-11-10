import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useCreateGig } from '../hooks/useGigs';
import { supabase } from '../lib/supabase';

interface OnboardingAddGigProps {
  payerId: string | null;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function OnboardingAddGig({ payerId, onComplete, onSkip, onBack }: OnboardingAddGigProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const createGig = useCreateGig();

  const handleComplete = async () => {
    if (!payerId) {
      Alert.alert('Error', 'No payer selected. Please go back and add a payer first.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a gig title');
      return;
    }

    if (!grossAmount || parseFloat(grossAmount) <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid amount');
      return;
    }

    try {
      await createGig.mutateAsync({
        payer_id: payerId,
        date,
        title: title.trim(),
        gross_amount: parseFloat(grossAmount),
        tips: 0,
        fees: 0,
        per_diem: 0,
        other_income: 0,
        net_amount: parseFloat(grossAmount),
        paid: false,
        taxes_withheld: false,
      });

      // Mark onboarding as complete
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id);
      }

      onComplete();
    } catch (error: any) {
      console.error('[OnboardingAddGig] Error creating gig:', error);
      Alert.alert('Error', error.message || 'Failed to create gig');
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as complete even if skipped
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id);
      }
      onSkip();
    } catch (error) {
      console.error('[OnboardingAddGig] Error marking onboarding complete:', error);
      onSkip(); // Skip anyway
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Add your first gig</Text>
          <Text style={styles.subtitle}>
            Track your income from this gig. You can add expenses and more details later.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gig Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Friday Night Show"
              value={title}
              onChangeText={setTitle}
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Amount Earned *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={grossAmount}
              onChangeText={setGrossAmount}
              keyboardType="decimal-pad"
              editable={!createGig.isPending}
            />
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={createGig.isPending}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={createGig.isPending}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.completeButton, createGig.isPending && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={createGig.isPending}
        >
          {createGig.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.completeButtonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 32,
  },
  step: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
