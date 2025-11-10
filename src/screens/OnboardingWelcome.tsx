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
import { supabase } from '../lib/supabase';

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'District of Columbia' },
];

const FILING_STATUSES = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married Filing Jointly' },
  { value: 'hoh', label: 'Head of Household' },
];

interface OnboardingWelcomeProps {
  onNext: () => void;
  onSkip: () => void;
}

export function OnboardingWelcome({ onNext, onSkip }: OnboardingWelcomeProps) {
  const [fullName, setFullName] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [filingStatus, setFilingStatus] = useState<'single' | 'married' | 'hoh'>('single');
  const [loading, setLoading] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);

  const handleContinue = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name Required', 'Please enter your full name');
      return;
    }

    if (!stateCode) {
      Alert.alert('State Required', 'Please select your state of residence');
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          state_code: stateCode,
          filing_status: filingStatus,
        })
        .eq('id', user.id);

      if (error) throw error;

      onNext();
    } catch (error: any) {
      console.error('[OnboardingWelcome] Error saving profile:', error);
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 1 of 3</Text>
          <Text style={styles.title}>Welcome to GigLedger! 🎵</Text>
          <Text style={styles.subtitle}>
            Track your music income, expenses, and taxes all in one place. Let's get you set up.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., John Smith"
              value={fullName}
              onChangeText={setFullName}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>State of Residence *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowStatePicker(!showStatePicker)}
              disabled={loading}
            >
              <Text style={[styles.pickerButtonText, !stateCode && styles.placeholderText]}>
                {stateCode ? US_STATES.find(s => s.code === stateCode)?.name : 'Select state'}
              </Text>
              <Text style={styles.pickerButtonIcon}>▼</Text>
            </TouchableOpacity>
            {showStatePicker && (
              <ScrollView style={styles.pickerList}>
                {US_STATES.map((state) => (
                  <TouchableOpacity
                    key={state.code}
                    style={styles.pickerItem}
                    onPress={() => {
                      setStateCode(state.code);
                      setShowStatePicker(false);
                    }}
                  >
                    <Text style={styles.pickerItemText}>{state.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Filing Status *</Text>
            <View style={styles.radioGroup}>
              {FILING_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={styles.radioButton}
                  onPress={() => setFilingStatus(status.value as any)}
                  disabled={loading}
                >
                  <View style={[styles.radio, filingStatus === status.value && styles.radioChecked]}>
                    {filingStatus === status.value && <View style={styles.radioDot} />}
                  </View>
                  <Text style={styles.radioLabel}>{status.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={onSkip}
          disabled={loading}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
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
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
  },
  pickerButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholderText: {
    color: '#9ca3af',
  },
  pickerButtonIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
  pickerList: {
    maxHeight: 200,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginTop: 4,
  },
  pickerItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  pickerItemText: {
    fontSize: 14,
    color: '#111827',
  },
  radioGroup: {
    gap: 12,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioChecked: {
    borderColor: '#3b82f6',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    fontSize: 14,
    color: '#374151',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
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
