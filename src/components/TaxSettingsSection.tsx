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
  Platform,
  Modal,
  Pressable,
} from 'react-native';
import { useTaxProfile, useUpsertTaxProfile } from '../hooks/useTaxProfile';
import { getMDCounties, getStateName } from '../tax/engine';
import type { TaxProfile } from '../tax/engine';
import type { StateCode, FilingStatus } from '../tax/config/2025';
import { useProfile, type BusinessStructure } from '../hooks/useProfile';
import { useSubscription } from '../hooks/useSubscription';
import { getResolvedPlan } from '../lib/businessStructure';
import { getSharedUserId } from '../lib/sharedAuth';

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

// ─── Cross-platform picker ───────────────────────────────────────────────────
interface PickerOption {
  value: string;
  label: string;
  disabled?: boolean;
}
interface NativePickerProps {
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}
function NativePicker({ value, options, onChange, placeholder }: NativePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find(o => o.value === value)?.label ?? placeholder ?? 'Select…';

  if (Platform.OS === 'web') {
    return (
      // @ts-ignore web-only
      <select
        style={pickerStyles.webSelect as any}
        value={value}
        onChange={(e: any) => onChange(e.target.value)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      <TouchableOpacity style={pickerStyles.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={pickerStyles.triggerText}>{selectedLabel}</Text>
        <Text style={pickerStyles.triggerChevron}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={pickerStyles.backdrop} onPress={() => setOpen(false)}>
          <View style={pickerStyles.sheet} onStartShouldSetResponder={() => true}>
            <View style={pickerStyles.sheetHandle} />
            <ScrollView style={pickerStyles.optionList} showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[pickerStyles.option, opt.value === value && pickerStyles.optionActive, opt.disabled && pickerStyles.optionDisabled]}
                  onPress={() => { if (!opt.disabled) { onChange(opt.value); setOpen(false); } }}
                  activeOpacity={0.7}
                >
                  <Text style={[pickerStyles.optionText, opt.value === value && pickerStyles.optionTextActive, opt.disabled && pickerStyles.optionTextDisabled]}>
                    {opt.label}
                  </Text>
                  {opt.value === value && <Text style={pickerStyles.checkmark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const pickerStyles = StyleSheet.create({
  webSelect: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#111827',
    width: '100%',
  } as any,
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  triggerText: { fontSize: 15, color: '#111827', flex: 1 },
  triggerChevron: { fontSize: 16, color: '#6b7280', marginLeft: 8 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 40,
    maxHeight: '70%' as any,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: '#E5E3DE',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 8,
  },
  optionList: { paddingHorizontal: 16 },
  option: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionActive: { backgroundColor: '#EEF2FF' },
  optionDisabled: { opacity: 0.4 },
  optionText: { fontSize: 15, color: '#1A1A1A', flex: 1 },
  optionTextActive: { color: '#2D5BE3', fontWeight: '700' },
  optionTextDisabled: { color: '#B0ADA8' },
  checkmark: { fontSize: 16, color: '#2D5BE3', fontWeight: '700' },
});
// ─────────────────────────────────────────────────────────────────────────────

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
  const [userId, setUserId] = useState<string | null>(null);
  
  useEffect(() => {
    getSharedUserId().then(setUserId);
  }, []);
  
  const { data: profile } = useProfile(userId || undefined);
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
      Alert.alert('Upgrade Required', 'S-Corp mode is only available on Bozzy Pro. Please upgrade your plan to use this business structure.');
      return;
    }

    try {
      await upsertProfile.mutateAsync(taxProfileForm as TaxProfile);
      
      if (userId && businessStructure !== profile?.business_structure) {
        const { supabase } = await import('../lib/supabase');
        const { error } = await supabase
          .from('profiles')
          .update({ business_structure: businessStructure })
          .eq('id', userId);
        
        if (error) {
          if (error.message?.includes('SCORP_REQUIRES_PRO')) {
            Alert.alert('Upgrade Required', 'S-Corp mode requires Bozzy Pro.');
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
              <NativePicker
                value={businessStructure}
                onChange={(val) => {
                  if (val === 'llc_scorp' && !isProPlan) return;
                  setBusinessStructure(val as BusinessStructure);
                }}
                options={[
                  { value: 'individual', label: 'Individual / Sole Proprietor' },
                  { value: 'llc_single_member', label: 'Single-Member LLC' },
                  { value: 'llc_scorp', label: `LLC taxed as S-Corp${!isProPlan ? ' (Pro only)' : ''}`, disabled: !isProPlan },
                  { value: 'llc_multi_member', label: 'Multi-Member LLC / Partnership' },
                ]}
              />
              
              {/* Contextual help text based on selected structure */}
              {businessStructure === 'individual' && (
                <Text style={styles.helpText}>
                  ℹ️ The default for most freelance musicians. Simple to manage. Self-employment tax applies and Bozzy estimates both income and SE tax.
                </Text>
              )}
              {businessStructure === 'llc_single_member' && (
                <Text style={styles.helpText}>
                  ℹ️ A legal LLC with one owner. Adds liability protection, but taxes usually work the same as an Individual. SE tax still applies; Bozzy treats this like Individual for estimates.
                </Text>
              )}
              {businessStructure === 'llc_scorp' && (
                <Text style={styles.infoNote}>
                  ℹ️ Advanced tax strategy. Often used when profit is high and you run payroll. In Bozzy Pro, we track income/expenses but do not estimate self-employment tax.
                </Text>
              )}
              {businessStructure === 'llc_multi_member' && (
                <Text style={styles.helpText}>
                  ℹ️ Typically used for band LLCs or shared businesses. Taxes are handled at the entity level; Bozzy focuses on tracking total income and expenses.
                </Text>
              )}
              
              {!isProPlan && (
                <Text style={styles.upgradeNote}>
                  💡 S-Corp mode is available on Bozzy Pro. S-Corp mode removes self-employment tax estimates and is designed for users running payroll through an S-Corp.
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
            <NativePicker
              value={taxProfileForm.filingStatus ?? ''}
              onChange={(val) => setTaxProfileForm({ ...taxProfileForm, filingStatus: val as FilingStatus })}
              options={FILING_STATUSES.map(s => ({ value: s.value, label: s.label }))}
            />
          ) : (
            <Text style={styles.fieldValue}>{filingStatusLabel || 'Not set'}</Text>
          )}
        </View>

        {/* State */}
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>State of Residence</Text>
          {isEditing ? (
            <NativePicker
              value={taxProfileForm.state ?? ''}
              onChange={(val) => setTaxProfileForm({ ...taxProfileForm, state: val as StateCode, county: undefined })}
              options={TAX_STATES.map(s => ({ value: s.code, label: s.name }))}
            />
          ) : (
            <Text style={styles.fieldValue}>{stateName}</Text>
          )}
        </View>

        {/* County (MD only) */}
        {taxProfileForm.state === 'MD' && (
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>County</Text>
            {isEditing ? (
              <NativePicker
                value={taxProfileForm.county || ''}
                onChange={(val) => setTaxProfileForm({ ...taxProfileForm, county: val })}
                placeholder="Select a county..."
                options={getMDCounties().map(c => ({ value: c, label: c }))}
              />
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
              <NativePicker
                value={taxProfileForm.deductionMethod ?? ''}
                onChange={(val) => {
                  setTaxProfileForm({
                    ...taxProfileForm,
                    deductionMethod: val as 'standard' | 'itemized',
                    itemizedAmount: val === 'standard' ? undefined : taxProfileForm.itemizedAmount,
                  });
                }}
                options={[
                  { value: 'standard', label: 'Standard Deduction' },
                  { value: 'itemized', label: 'Itemized Deduction' },
                ]}
              />

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
