/**
 * Tax Profile Onboarding Modal
 * Collects user's tax filing information for accurate tax calculations
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useUpsertTaxProfile } from '../hooks/useTaxProfile';
import { getMDCounties, stateHasIncomeTax, stateNeedsCounty } from '../tax/engine';
import type { TaxProfile } from '../tax/engine';
import type { StateCode, FilingStatus } from '../tax/config/2025';

interface TaxProfileOnboardingProps {
  visible: boolean;
  onComplete: () => void;
}

export function TaxProfileOnboarding({ visible, onComplete }: TaxProfileOnboardingProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<TaxProfile>>({
    filingStatus: 'single',
    state: 'TN',
    deductionMethod: 'standard',
    seIncome: true,
    nycResident: false,
    yonkersResident: false,
  });

  const upsertProfile = useUpsertTaxProfile();

  const handleComplete = async () => {
    if (!isProfileComplete()) return;

    try {
      await upsertProfile.mutateAsync(profile as TaxProfile);
      onComplete();
    } catch (error) {
      console.error('Failed to save tax profile:', error);
      alert('Failed to save tax profile. Please try again.');
    }
  };

  const isProfileComplete = (): boolean => {
    if (!profile.filingStatus || !profile.state || !profile.deductionMethod) {
      return false;
    }

    // MD requires county
    if (profile.state === 'MD' && !profile.county) {
      return false;
    }

    // Itemized requires amount
    if (profile.deductionMethod === 'itemized' && !profile.itemizedAmount) {
      return false;
    }

    return true;
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Filing Status</Text>
      <Text style={styles.stepSubtitle}>Select your tax filing status for 2025</Text>

      <View style={styles.optionsContainer}>
        {[
          { value: 'single', label: 'Single' },
          { value: 'married_joint', label: 'Married Filing Jointly' },
          { value: 'married_separate', label: 'Married Filing Separately' },
          { value: 'head', label: 'Head of Household' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              profile.filingStatus === option.value && styles.optionSelected,
            ]}
            onPress={() => setProfile({ ...profile, filingStatus: option.value as FilingStatus })}
          >
            <Text
              style={[
                styles.optionText,
                profile.filingStatus === option.value && styles.optionTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.button, !profile.filingStatus && styles.buttonDisabled]}
        onPress={() => setStep(2)}
        disabled={!profile.filingStatus}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>State of Residence</Text>
      <Text style={styles.stepSubtitle}>Where do you live?</Text>

      <View style={styles.optionsContainer}>
        {[
          { value: 'TN', label: 'Tennessee', note: 'No state income tax' },
          { value: 'TX', label: 'Texas', note: 'No state income tax' },
          { value: 'CA', label: 'California' },
          { value: 'NY', label: 'New York' },
          { value: 'MD', label: 'Maryland' },
        ].map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              profile.state === option.value && styles.optionSelected,
            ]}
            onPress={() => setProfile({ ...profile, state: option.value as StateCode })}
          >
            <View>
              <Text
                style={[
                  styles.optionText,
                  profile.state === option.value && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {option.note && (
                <Text style={styles.optionNote}>{option.note}</Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => setStep(1)}>
          <Text style={styles.buttonSecondaryText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !profile.state && styles.buttonDisabled]}
          onPress={() => setStep(3)}
          disabled={!profile.state}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => {
    const needsCounty = stateNeedsCounty(profile.state as StateCode);
    const isNY = profile.state === 'NY';

    return (
      <View style={styles.stepContainer}>
        <Text style={styles.stepTitle}>Local Tax Information</Text>
        <Text style={styles.stepSubtitle}>
          {needsCounty ? 'Select your county' : isNY ? 'NYC/Yonkers residency' : 'No local tax'}
        </Text>

        {needsCounty && (
          <View style={styles.optionsContainer}>
            <ScrollView style={styles.countyScroll}>
              {getMDCounties().map((county) => (
                <TouchableOpacity
                  key={county}
                  style={[
                    styles.option,
                    profile.county === county && styles.optionSelected,
                  ]}
                  onPress={() => setProfile({ ...profile, county })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      profile.county === county && styles.optionTextSelected,
                    ]}
                  >
                    {county}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {isNY && (
          <View style={styles.checkboxContainer}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setProfile({ ...profile, nycResident: !profile.nycResident })}
            >
              <View style={[styles.checkboxBox, profile.nycResident && styles.checkboxBoxChecked]}>
                {profile.nycResident && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I am a New York City resident</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setProfile({ ...profile, yonkersResident: !profile.yonkersResident })}
            >
              <View style={[styles.checkboxBox, profile.yonkersResident && styles.checkboxBoxChecked]}>
                {profile.yonkersResident && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>I am a Yonkers resident</Text>
            </TouchableOpacity>
          </View>
        )}

        {!needsCounty && !isNY && (
          <Text style={styles.infoText}>
            {profile.state === 'TN' || profile.state === 'TX'
              ? 'Great news! Your state has no income tax on wages.'
              : 'No additional local tax information needed.'}
          </Text>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.buttonSecondary} onPress={() => setStep(2)}>
            <Text style={styles.buttonSecondaryText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.button,
              needsCounty && !profile.county && styles.buttonDisabled,
            ]}
            onPress={() => setStep(4)}
            disabled={needsCounty && !profile.county}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Deduction Method</Text>
      <Text style={styles.stepSubtitle}>How will you deduct expenses?</Text>

      <View style={styles.optionsContainer}>
        <TouchableOpacity
          style={[
            styles.option,
            profile.deductionMethod === 'standard' && styles.optionSelected,
          ]}
          onPress={() => setProfile({ ...profile, deductionMethod: 'standard', itemizedAmount: undefined })}
        >
          <Text
            style={[
              styles.optionText,
              profile.deductionMethod === 'standard' && styles.optionTextSelected,
            ]}
          >
            Standard Deduction
          </Text>
          <Text style={styles.optionNote}>Most common for musicians</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.option,
            profile.deductionMethod === 'itemized' && styles.optionSelected,
          ]}
          onPress={() => setProfile({ ...profile, deductionMethod: 'itemized' })}
        >
          <Text
            style={[
              styles.optionText,
              profile.deductionMethod === 'itemized' && styles.optionTextSelected,
            ]}
          >
            Itemized Deduction
          </Text>
          <Text style={styles.optionNote}>If you have significant deductions</Text>
        </TouchableOpacity>
      </View>

      {profile.deductionMethod === 'itemized' && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Estimated Itemized Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="$25,000"
            keyboardType="numeric"
            value={profile.itemizedAmount?.toString() || ''}
            onChangeText={(text) => {
              const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
              setProfile({ ...profile, itemizedAmount: isNaN(amount) ? undefined : amount });
            }}
          />
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.buttonSecondary} onPress={() => setStep(3)}>
          <Text style={styles.buttonSecondaryText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, !isProfileComplete() && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={!isProfileComplete() || upsertProfile.isPending}
        >
          {upsertProfile.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Complete Setup</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Tax Profile Setup</Text>
          <Text style={styles.subtitle}>
            Help us calculate accurate tax estimates for your gigs
          </Text>
          <View style={styles.progressBar}>
            {[1, 2, 3, 4].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  s <= step && styles.progressDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
  },
  progressBar: {
    flexDirection: 'row',
    gap: 8,
  },
  progressDot: {
    flex: 1,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progressDotActive: {
    backgroundColor: '#2563eb',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
  },
  optionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  option: {
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
  },
  optionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  optionTextSelected: {
    color: '#2563eb',
  },
  optionNote: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  countyScroll: {
    maxHeight: 300,
  },
  checkboxContainer: {
    gap: 16,
    marginBottom: 24,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkboxBox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxBoxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkboxCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#111827',
  },
  infoText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonSecondaryText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
});
