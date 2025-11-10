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
import { useCreatePayer } from '../hooks/usePayers';

const PAYER_TYPES = ['Venue', 'Client', 'Platform', 'Agency', 'Other'] as const;

interface OnboardingAddPayerProps {
  onNext: (payerId: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function OnboardingAddPayer({ onNext, onSkip, onBack }: OnboardingAddPayerProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('Venue');
  const createPayer = useCreatePayer();

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a payer name');
      return;
    }

    try {
      const result = await createPayer.mutateAsync({
        name: name.trim(),
        type: type as any,
      });

      if (result) {
        onNext(result.id);
      }
    } catch (error: any) {
      console.error('[OnboardingAddPayer] Error creating payer:', error);
      Alert.alert('Error', error.message || 'Failed to create payer');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text style={styles.title}>Add your first payer</Text>
          <Text style={styles.subtitle}>
            A payer is anyone who pays you for your work - venues, clients, platforms like Spotify, etc.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Payer Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Blue Note Jazz Club"
              value={name}
              onChangeText={setName}
              editable={!createPayer.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeButtons}>
              {PAYER_TYPES.map((payerType) => (
                <TouchableOpacity
                  key={payerType}
                  style={[
                    styles.typeButton,
                    type === payerType && styles.typeButtonActive,
                  ]}
                  onPress={() => setType(payerType)}
                  disabled={createPayer.isPending}
                >
                  <Text style={[
                    styles.typeButtonText,
                    type === payerType && styles.typeButtonTextActive,
                  ]}>
                    {payerType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={createPayer.isPending}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          disabled={createPayer.isPending}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, createPayer.isPending && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={createPayer.isPending}
        >
          {createPayer.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.continueButtonText}>Continue</Text>
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
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  typeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#fff',
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
  continueButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
