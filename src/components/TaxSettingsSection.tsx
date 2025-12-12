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
import { useProfile, type BusinessStructure } from '../hooks/useProfile';
import { useSubscription } from '../hooks/useSubscription';
import { getResolvedPlan } from '../lib/businessStructure';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

const TAX_STATES: { code: StateCode; name: string }[] = [
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
  onNavigateToBusinessStructures?: () => void;
}

export function TaxSettingsSection({ 
  isEditing: externalIsEditing, 
  onEditChange,
  hideEditButton = false,
  onNavigateToBusinessStructures
}: TaxSettingsSectionProps = {}) {
  const { data: currentProfile, isLoading } = useTaxProfile();
  const upsertProfile = useUpsertTaxProfile();
  
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
  
  const { data: profile } = useProfile(user?.id);
  const { data: subscription } = useSubscription();
  
  const plan = getResolvedPlan({
    subscriptionTier: subscription?.tier,
    subscriptionStatus: subscription?.status,
  });
  
  const isProPlan = plan === 'pro';
  
  const [internalIsEditing, setInternalIsEditing] = useState(false);
  const isEditing = externalIsEditing !== undefined ? externalIsEditing : internalIsEditing;
  
  const setIsEditing = (editing: boolean) => {
    if (onEditChange) {
      onEditChange(editing);
    } else {
      setInternalIsEditing(editing);
    }
  };
  const [taxProfileForm, setTaxProfileForm] = useState<Partial<TaxProfile>>({
    filingStatus: 'single',
    state: 'TN',
    deductionMethod: 'standard',
    seIncome: true,
  });
  
  const [businessStructure, setBusinessStructure] = useState<BusinessStructure>('individual');

  // Initialize form when profile loads
  useEffect(() => {
    if (currentProfile) {
      setTaxProfileForm(currentProfile);
    }
    if (profile) {
      setBusinessStructure(profile.business_structure || 'individual');
    }
  }, [currentProfile, profile]);

  const handleSave = async () => {
    if (!taxProfileForm.filingStatus || !taxProfileForm.state || !taxProfileForm.deductionMethod) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate MD requires county
    if (taxProfileForm.state === 'MD' && !taxProfileForm.county) {
      Alert.alert('Error', 'Please select a county for Maryland');
      return;
    }

    // Validate itemized requires amount
    if (taxProfileForm.deductionMethod === 'itemized' && !taxProfileForm.itemizedAmount) {
      Alert.alert('Error', 'Please enter itemized deduction amount');
      return;
    }
    
    if (businessStructure === 'llc_scorp' && !isProPlan) {
      Alert.alert('Upgrade Required', 'S-Corp mode is only available on GigLedger Pro. Please upgrade your plan to use this business structure.');
      return;
    }

    try {
      await upsertProfile.mutateAsync(taxProfileForm as TaxProfile);
      
      if (user?.id && businessStructure !== profile?.business_structure) {
        const { error } = await supabase
          .from('profiles')
          .update({ business_structure: businessStructure })
          .eq('id', user.id);
        
        if (error) {
          if (error.message?.includes('SCORP_REQUIRES_PRO')) {
            Alert.alert('Upgrade Required', 'S-Corp mode requires GigLedger Pro.');
            return;
          }
          throw error;
        }
      }
      
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
      setTaxProfileForm(currentProfile);
    }
    if (profile) {
      setBusinessStructure(profile.business_structure || 'individual');
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

  const filingStatusLabel = FILING_STATUSES.find(s => s.value === taxProfileForm.filingStatus)?.label;
  const stateName = taxProfileForm.state ? getStateName(taxProfileForm.state) : 'Not set';
  
  const businessStructureLabel = {
    individual: 'Individual / Sole Proprietor',
    llc_single_member: 'Single-Member LLC',
    llc_scorp: 'LLC taxed as S-Corp',
    llc_multi_member: 'Multi-Member LLC / Partnership',
  }[businessStructure];

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
        {/* Business Structure */}
        <View style={styles.field}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>Business Structure</Text>
            {onNavigateToBusinessStructures && (
              <TouchableOpacity onPress={onNavigateToBusinessStructures}>
                <Text style={styles.learnMoreLink}>Learn more</Text>
              </TouchableOpacity>
            )}
          </View>
          {isEditing ? (
            <>
              <select
                style={styles.select}
                value={businessStructure}
                onChange={(e: any) => {
                  const value = e.target.value as BusinessStructure;
                  if (value === 'llc_scorp' && !isProPlan) {
                    return;
                  }
                  setBusinessStructure(value);
                }}
              >
                <option value="individual">Individual / Sole Proprietor</option>
                <option value="llc_single_member">Single-Member LLC</option>
                <option value="llc_scorp" disabled={!isProPlan}>LLC taxed as S-Corp{!isProPlan ? ' (Pro only)' : ''}</option>
                <option value="llc_multi_member">Multi-Member LLC / Partnership</option>
              </select>
              
              {/* Contextual help text based on selected structure */}
              {businessStructure === 'individual' && (
                <Text style={styles.helpText}>
                  ℹ️ The default for most freelance musicians. Simple to manage. Self-employment tax applies and GigLedger estimates both income and SE tax.
                </Text>
              )}
              {businessStructure === 'llc_single_member' && (
                <Text style={styles.helpText}>
                  ℹ️ A legal LLC with one owner. Adds liability protection, but taxes usually work the same as an Individual. SE tax still applies; GigLedger treats this like Individual for estimates.
                </Text>
              )}
              {businessStructure === 'llc_scorp' && (
                <Text style={styles.infoNote}>
                  ℹ️ Advanced tax strategy. Often used when profit is high and you run payroll. In GigLedger Pro, we track income/expenses but do not estimate self-employment tax.
                </Text>
              )}
              {businessStructure === 'llc_multi_member' && (
                <Text style={styles.helpText}>
                  ℹ️ Typically used for band LLCs or shared businesses. Taxes are handled at the entity level; GigLedger focuses on tracking total income and expenses.
                </Text>
              )}
              
              {!isProPlan && (
                <Text style={styles.upgradeNote}>
                  💡 S-Corp mode is available on GigLedger Pro. S-Corp mode removes self-employment tax estimates and is designed for users running payroll through an S-Corp.
                </Text>
              )}
            </>
          ) : (
            <Text style={styles.fieldValue}>{businessStructureLabel}</Text>
          )}
        </View>

        {/* Filing Status */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Filing Status</Text>
          {isEditing ? (
            <select
              style={styles.select}
              value={taxProfileForm.filingStatus}
              onChange={(e: any) => setTaxProfileForm({ ...taxProfileForm, filingStatus: e.target.value as FilingStatus })}
            >
              {FILING_STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          ) : (
            <Text style={styles.fieldValue}>{filingStatusLabel || 'Not set'}</Text>
          )}
        </View>

        {/* State */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>State of Residence</Text>
          {isEditing ? (
            <select
              style={styles.select}
              value={taxProfileForm.state}
              onChange={(e: any) => setTaxProfileForm({ ...taxProfileForm, state: e.target.value as StateCode, county: undefined })}
            >
              {TAX_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          ) : (
            <Text style={styles.fieldValue}>{stateName}</Text>
          )}
        </View>

        {/* County (MD only) */}
        {taxProfileForm.state === 'MD' && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>County</Text>
            {isEditing ? (
              <select
                style={styles.select}
                value={taxProfileForm.county || ''}
                onChange={(e: any) => setTaxProfileForm({ ...taxProfileForm, county: e.target.value })}
              >
                <option value="">Select a county...</option>
                {getMDCounties().map((county) => (
                  <option key={county} value={county}>
                    {county}
                  </option>
                ))}
              </select>
            ) : (
              <Text style={styles.fieldValue}>{taxProfileForm.county || 'Not set'}</Text>
            )}
          </View>
        )}

        {/* NYC/Yonkers (NY only) */}
        {taxProfileForm.state === 'NY' && isEditing && (
          <View style={styles.field}>
            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setTaxProfileForm({ ...taxProfileForm, nycResident: !taxProfileForm.nycResident })}
            >
              <View style={[styles.checkboxBox, taxProfileForm.nycResident && styles.checkboxBoxChecked]}>
                {taxProfileForm.nycResident && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>NYC Resident</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.checkbox}
              onPress={() => setTaxProfileForm({ ...taxProfileForm, yonkersResident: !taxProfileForm.yonkersResident })}
            >
              <View style={[styles.checkboxBox, taxProfileForm.yonkersResident && styles.checkboxBoxChecked]}>
                {taxProfileForm.yonkersResident && <Text style={styles.checkboxCheck}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Yonkers Resident</Text>
            </TouchableOpacity>
          </View>
        )}

        {taxProfileForm.state === 'NY' && !isEditing && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Local Tax</Text>
            <Text style={styles.fieldValue}>
              {taxProfileForm.nycResident && taxProfileForm.yonkersResident
                ? 'NYC + Yonkers'
                : taxProfileForm.nycResident
                ? 'NYC'
                : taxProfileForm.yonkersResident
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
              <select
                style={styles.select}
                value={taxProfileForm.deductionMethod}
                onChange={(e: any) => {
                  const method = e.target.value;
                  setTaxProfileForm({ 
                    ...taxProfileForm, 
                    deductionMethod: method,
                    itemizedAmount: method === 'standard' ? undefined : taxProfileForm.itemizedAmount
                  });
                }}
              >
                <option value="standard">Standard Deduction</option>
                <option value="itemized">Itemized Deduction</option>
              </select>

              {taxProfileForm.deductionMethod === 'itemized' && (
                <TextInput
                  style={styles.input}
                  placeholder="Itemized amount ($)"
                  keyboardType="numeric"
                  value={taxProfileForm.itemizedAmount?.toString() || ''}
                  onChangeText={(text) => {
                    const amount = parseFloat(text.replace(/[^0-9.]/g, ''));
                    setTaxProfileForm({ ...taxProfileForm, itemizedAmount: isNaN(amount) ? undefined : amount });
                  }}
                />
              )}
            </>
          ) : (
            <Text style={styles.fieldValue}>
              {taxProfileForm.deductionMethod === 'itemized'
                ? `Itemized ($${taxProfileForm.itemizedAmount?.toLocaleString() || '0'})`
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
  select: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    width: '100%',
  } as any,
  upgradeNote: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoNote: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#1565C0',
  },
  helpText: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
    fontSize: 14,
    lineHeight: 20,
    color: '#4B5563',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  learnMoreLink: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
});
