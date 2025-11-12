/**
 * Tax Settings Section for Account Screen
 * Displays and allows editing of user's tax profile
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useTaxProfile, useUpsertTaxProfile } from '../hooks/useTaxProfile';
import { getMDCounties, getStateName } from '../tax/engine';
import type { TaxProfile } from '../tax/engine';
import type { StateCode, FilingStatus } from '../tax/config/2025';

const TAX_STATES: { code: StateCode; name: string }[] = [
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'CA', name: 'California' },
  { code: 'NY', name: 'New York' },
  { code: 'MD', name: 'Maryland' },
];

const FILING_STATUSES: { value: FilingStatus; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'married_joint', label: 'Married Filing Jointly' },
  { value: 'married_separate', label: 'Married Filing Separately' },
  { value: 'head', label: 'Head of Household' },
];

interface TaxSettingsSectionProps {
  isEditing?: boolean;
  onEditChange?: (editing: boolean) => void;
  hideEditButton?: boolean;
}

export function TaxSettingsSection({ 
  isEditing: externalIsEditing, 
  onEditChange,
  hideEditButton = false 
}: TaxSettingsSectionProps = {}) {
  const { data: currentProfile, isLoading } = useTaxProfile();
  const upsertProfile = useUpsertTaxProfile();
  
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  
  const setIsEditing = (editing: boolean) => {
    if (onEditChange) {
      onEditChange(editing);
    } else {
      setInternalIsEditing(editing);
    }
  };
  const [profile, setProfile] = useState<Partial<TaxProfile>>({
    filingStatus: 'single',
    state: 'TN',
    deductionMethod: 'standard',
    seIncome: true,
  });

  // Initialize form when profile loads
  useEffect(() => {
    if (currentProfile) {
      setProfile(currentProfile);
    }
  }, [currentProfile]);

  const handleSave = async () => {
    if (!profile.filingStatus || !profile.state || !profile.deductionMethod) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate MD requires county
    if (profile.state === 'MD' && !profile.county) {
      Alert.alert('Error', 'Please select a county for Maryland');
      return;
    }

    // Validate itemized requires amount
    if (profile.deductionMethod === 'itemized' && !profile.itemizedAmount) {
      Alert.alert('Error', 'Please enter itemized deduction amount');
      return;
    }

    try {
      await upsertProfile.mutateAsync(profile as TaxProfile);
      setIsEditing(false);
      Alert.alert('Success', 'Tax settings updated successfully');
    } catch (error) {
      console.error('Failed to save tax profile:', error);
      Alert.alert('Error', 'Failed to save tax settings');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (currentProfile) {
      setProfile(currentProfile);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tax Settings</Text>
        <View style={styles.card}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  const filingStatusLabel = FILING_STATUSES.find(s => s.value === profile.filingStatus)?.label;
  const stateName = profile.state ? getStateName(profile.state) : 'Not set';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Tax Settings</Text>
        {!isEditing && !hideEditButton && (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.card}>
        {/* Filing Status */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Filing Status</Text>
          {isEditing ? (
            <View style={styles.optionsContainer}>
              {FILING_STATUSES.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[
                    styles.option,
                    profile.filingStatus === status.value && styles.optionSelected,
                  ]}
                  onPress={() => setProfile({ ...profile, filingStatus: status.value })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      profile.filingStatus === status.value && styles.optionTextSelected,
                    ]}
                  >
                    {status.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.fieldValue}>{filingStatusLabel || 'Not set'}</Text>
          )}
        </View>

        {/* State */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>State of Residence</Text>
          {isEditing ? (
            <View style={styles.optionsContainer}>
              {TAX_STATES.map((state) => (
                <TouchableOpacity
                  key={state.code}
                  style={[
                    styles.option,
                    profile.state === state.code && styles.optionSelected,
                  ]}
                  onPress={() => setProfile({ ...profile, state: state.code, county: undefined })}
                >
                  <Text
                    style={[
                      styles.optionText,
                      profile.state === state.code && styles.optionTextSelected,
                    ]}
                  >
                    {state.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.fieldValue}>{stateName}</Text>
          )}
        </View>

        {/* County (MD only) */}
        {profile.state === 'MD' && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>County</Text>
            {isEditing ? (
              <ScrollView style={styles.countyScroll} nestedScrollEnabled>
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
            ) : (
              <Text style={styles.fieldValue}>{profile.county || 'Not set'}</Text>
            )}
          </View>
        )}

        {/* NYC/Yonkers (NY only) */}
        {profile.state === 'NY' && isEditing && (
          <View style={styles.field}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setProfile({ ...profile, nycResident: !profile.nycResident })}
            >
              <View style={[styles.checkboxBox, profile.nycResident && styles.checkboxBoxChecked]}>
                {profile.nycResident && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>NYC Resident</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setProfile({ ...profile, yonkersResident: !profile.yonkersResident })}
            >
              <View style={[styles.checkboxBox, profile.yonkersResident && styles.checkboxBoxChecked]}>
                {profile.yonkersResident && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Yonkers Resident</Text>
            </TouchableOpacity>
          </View>
        )}

        {profile.state === 'NY' && !isEditing && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Local Tax</Text>
            <Text style={styles.fieldValue}>
              {profile.nycResident && profile.yonkersResident
                ? 'NYC + Yonkers'
                : profile.nycResident
                ? 'NYC'
                : profile.yonkersResident
                ? 'Yonkers'
                : 'None'}
            </Text>
          </View>
        )}

        {/* Deduction Method */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Deduction Method</Text>
          {isEditing ? (
            <>
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
                </TouchableOpacity>
              </View>

              {profile.deductionMethod === 'itemized' && (
                <TextInput
                  style={styles.input}
                  placeholder="Itemized amount ($)"
                  keyboardType="numeric"
                  value={profile.itemizedAmount?.toString() || ''}
                  onChangeText={(text) => {
                    const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
                    setProfile({ ...profile, itemizedAmount: isNaN(amount) ? undefined : amount });
                  }}
                />
              )}
            </>
          ) : (
            <Text style={styles.fieldValue}>
              {profile.deductionMethod === 'itemized'
                ? `Itemized ($${profile.itemizedAmount?.toLocaleString() || '0'})`
                : 'Standard'}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        {isEditing && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.buttonSecondary]}
              onPress={handleCancel}
            >
              <Text style={styles.buttonSecondaryText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonPrimary]}
              onPress={handleSave}
              disabled={upsertProfile.isPending}
            >
              {upsertProfile.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.buttonPrimaryText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
  },
  editButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 8,
  },
  fieldValue: {
    fontSize: 16,
    color: '#111827',
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    padding: 12,
    backgroundColor: '#f9fafb',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 6,
  },
  optionSelected: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 14,
    color: '#374151',
  },
  optionTextSelected: {
    color: '#2563eb',
    fontWeight: '500',
  },
  countyScroll: {
    maxHeight: 200,
  },
  checkbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  checkboxBox: {
    width: 20,
    height: 20,
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
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#2563eb',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  buttonSecondaryText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
});
