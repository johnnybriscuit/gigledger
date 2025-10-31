/**
 * Onboarding screen to collect user's tax information
 * - State of residence
 * - Filing status
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { updateUserTaxProfile } from '../services/taxService';

// All US states + DC
const US_STATES = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'DC', name: 'District of Columbia' },
];

const FILING_STATUSES = [
  { value: 'single', label: 'Single', description: 'Filing as a single individual' },
  { value: 'married', label: 'Married Filing Jointly', description: 'Filing jointly with spouse' },
  { code: 'hoh', label: 'Head of Household', description: 'Unmarried with qualifying dependents' },
];

interface OnboardingTaxInfoProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingTaxInfo({ onComplete, onSkip }: OnboardingTaxInfoProps) {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedFilingStatus, setSelectedFilingStatus] = useState<'single' | 'married' | 'hoh'>('single');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const filteredStates = US_STATES.filter(
    (s) =>
      s.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const handleSave = async () => {
    if (!selectedState) {
      Alert.alert('Required', 'Please select your state of residence');
      return;
    }

    try {
      setSaving(true);
      await updateUserTaxProfile(selectedState, selectedFilingStatus);
      Alert.alert('Success', 'Tax information saved successfully');
      onComplete();
    } catch (err) {
      Alert.alert('Error', 'Failed to save tax information. Please try again.');
      console.error('Error saving tax profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const selectedStateName = US_STATES.find((s) => s.code === selectedState)?.name;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Tax Information</Text>
        <Text style={styles.subtitle}>
          Help us calculate accurate tax withholding estimates for your gigs
        </Text>

        {/* State Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>State of Residence *</Text>
          <Text style={styles.sectionDescription}>
            Where do you file your state income taxes?
          </Text>
          <TouchableOpacity
            style={styles.selectButton}
            onPress={() => setShowStatePicker(true)}
          >
            <Text style={[styles.selectButtonText, !selectedState && styles.placeholder]}>
              {selectedStateName || 'Select your state'}
            </Text>
            <Text style={styles.selectButtonIcon}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Filing Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filing Status *</Text>
          <Text style={styles.sectionDescription}>
            Your expected tax filing status for this year
          </Text>
          <View style={styles.radioGroup}>
            {FILING_STATUSES.map((status) => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.radioOption,
                  selectedFilingStatus === status.value && styles.radioOptionSelected,
                ]}
                onPress={() => setSelectedFilingStatus(status.value as 'single' | 'married' | 'hoh')}
              >
                <View style={styles.radioCircle}>
                  {selectedFilingStatus === status.value && <View style={styles.radioCircleInner} />}
                </View>
                <View style={styles.radioLabel}>
                  <Text style={styles.radioLabelText}>{status.label}</Text>
                  <Text style={styles.radioLabelDescription}>{status.description}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            ℹ️ These estimates are for planning purposes only and do not constitute tax advice.
            Consult a tax professional for personalized guidance.
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSave}
            disabled={saving || !selectedState}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>Save & Continue</Text>
            )}
          </TouchableOpacity>

          {onSkip && (
            <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
              <Text style={styles.skipButtonText}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* State Picker Modal */}
      {showStatePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Text style={styles.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.stateList}>
              {filteredStates.map((state) => (
                <TouchableOpacity
                  key={state.code}
                  style={styles.stateOption}
                  onPress={() => {
                    setSelectedState(state.code);
                    setShowStatePicker(false);
                    setStateSearch('');
                  }}
                >
                  <Text
                    style={[
                      styles.stateOptionText,
                      selectedState === state.code && styles.stateOptionTextSelected,
                    ]}
                  >
                    {state.name} ({state.code})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
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
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    lineHeight: 24,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  selectButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#111827',
  },
  placeholder: {
    color: '#9ca3af',
  },
  selectButtonIcon: {
    fontSize: 14,
    color: '#6b7280',
  },
  radioGroup: {
    gap: 12,
  },
  radioOption: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3b82f6',
  },
  radioLabel: {
    flex: 1,
  },
  radioLabelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  radioLabelDescription: {
    fontSize: 13,
    color: '#6b7280',
  },
  disclaimer: {
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#78350f',
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  skipButton: {
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  modalClose: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3b82f6',
  },
  stateList: {
    maxHeight: 400,
  },
  stateOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  stateOptionText: {
    fontSize: 16,
    color: '#374151',
  },
  stateOptionTextSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
});
