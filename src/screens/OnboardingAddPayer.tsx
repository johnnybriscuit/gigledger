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
import { useResponsiveButtonText, BUTTON_TEXT } from '../hooks/useResponsiveButtonText';
import { PAYER_TYPES, type PayerType } from '../constants/payerTypes';

interface OnboardingAddPayerProps {
  onNext: (payerId: string, payerName: string) => void;
  onSkip: () => void;
  onBack: () => void;
}

export function OnboardingAddPayer({ onNext, onSkip, onBack }: OnboardingAddPayerProps) {
  const buttonText = useResponsiveButtonText(BUTTON_TEXT.SAVE_PAYER_CONTINUE);
  const [name, setName] = useState('');
  const [type, setType] = useState<PayerType>('Individual');
  const createPayer = useCreatePayer();

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter a payer name');
      return;
    }

    try {
      const result = await createPayer.mutateAsync({
        name: name.trim(),
        normalized_name: name.trim().toLowerCase(),
        payer_type: type as any,
      });

      if (result) {
        onNext(result.id, name.trim());
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
          <Text style={styles.step}>Step 5 of 6</Text>
          <Text style={styles.title}>Add Your First Client 🎤</Text>
          <Text style={styles.subtitle}>
            Who pays you? Add your most frequent client so Bozzy can track your income by payer.
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
            <Text style={styles.label}>Type *</Text>
            <View style={styles.typeButtons}>
              {PAYER_TYPES.map((payerType) => (
                <TouchableOpacity
                  key={payerType}
                  style={[styles.typeButton, type === payerType && styles.typeButtonActive]}
                  onPress={() => setType(payerType)}
                  disabled={createPayer.isPending}
                >
                  <Text style={[styles.typeButtonText, type === payerType && styles.typeButtonTextActive]}>
                    {payerType}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerContainer}>
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBack}
            disabled={createPayer.isPending}
          >
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.continueButton, createPayer.isPending && styles.buttonDisabled]}
            onPress={handleContinue}
            disabled={createPayer.isPending}
          >
            {createPayer.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.continueButtonText} numberOfLines={1} ellipsizeMode="tail">{buttonText}</Text>
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={styles.skipSetupLink}
          onPress={onSkip}
          disabled={createPayer.isPending}
        >
          <Text style={styles.skipSetupLinkText}>Skip setup — I'll do this later</Text>
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
  footerContainer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
    gap: 12,
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
  skipSetupLink: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipSetupLinkText: {
    fontSize: 14,
    color: '#9ca3af',
    textDecorationLine: 'underline',
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
