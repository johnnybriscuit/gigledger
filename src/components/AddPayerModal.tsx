import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { useCreatePayer, useUpdatePayer } from '../hooks/usePayers';
import { payerSchema, type PayerFormData } from '../lib/validations';
import { PAYER_TYPES, type PayerType } from '../constants/payerTypes';

interface AddPayerModalProps {
  visible: boolean;
  onClose: () => void;
  editingPayer?: any;
}

export function AddPayerModal({ visible, onClose, editingPayer }: AddPayerModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<PayerType>('Individual');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [expect1099, setExpect1099] = useState(false);
  const [taxIdType, setTaxIdType] = useState<string>('');
  const [taxIdInput, setTaxIdInput] = useState('');
  const [taxTreatment, setTaxTreatment] = useState<'w2' | 'contractor_1099' | 'other'>('contractor_1099');
  const [w2EmployerName, setW2EmployerName] = useState('');
  const [w2EmployerEinLast4, setW2EmployerEinLast4] = useState('');
  const [payrollProvider, setPayrollProvider] = useState('');
  const [payrollContactEmail, setPayrollContactEmail] = useState('');
  const [showW2Details, setShowW2Details] = useState(false);

  const createPayer = useCreatePayer();
  const updatePayer = useUpdatePayer();

  useEffect(() => {
    if (editingPayer) {
      setName(editingPayer.name || '');
      setType(editingPayer.payer_type || editingPayer.type || 'Individual');
      setContactEmail(editingPayer.contact_email || '');
      setNotes(editingPayer.notes || '');
      
      const treatment = editingPayer.tax_treatment || 
        (editingPayer.expect_1099 ? 'contractor_1099' : 'other');
      setTaxTreatment(treatment as 'w2' | 'contractor_1099' | 'other');
      
      setExpect1099(editingPayer.expect_1099 || false);
      setTaxIdType(editingPayer.tax_id_type || '');
      
      if (editingPayer.tax_id_last4) {
        setTaxIdInput(`••••••${editingPayer.tax_id_last4}`);
      } else {
        setTaxIdInput('');
      }
      
      setW2EmployerName(editingPayer.w2_employer_name || '');
      setW2EmployerEinLast4(editingPayer.w2_employer_ein_last4 || '');
      setPayrollProvider(editingPayer.payroll_provider || '');
      setPayrollContactEmail(editingPayer.payroll_contact_email || '');
      setShowW2Details(!!editingPayer.w2_employer_name || !!editingPayer.payroll_provider);
    } else {
      resetForm();
    }
  }, [editingPayer, visible]);

  const resetForm = () => {
    setName('');
    setType('Individual');
    setContactEmail('');
    setNotes('');
    setExpect1099(false);
    setTaxIdType('');
    setTaxIdInput('');
    setTaxTreatment('contractor_1099');
    setW2EmployerName('');
    setW2EmployerEinLast4('');
    setPayrollProvider('');
    setPayrollContactEmail('');
    setShowW2Details(false);
  };

  const handleSubmit = async () => {
    try {
      // Extract last 4 digits from tax ID input
      const digitsOnly = taxIdInput.replace(/[^0-9]/g, '');
      const last4 = digitsOnly.slice(-4);
      
      // Validate if tax ID type is selected but no valid last 4
      if (taxIdType && last4.length < 4) {
        Alert.alert('Error', 'Please enter at least the last 4 digits of the tax ID');
        return;
      }

      const formData: PayerFormData = {
        name,
        type,
        contact_email: contactEmail || undefined,
        notes: notes || undefined,
        expect_1099: expect1099,
        tax_id_type: (taxIdType as 'ssn' | 'ein') || undefined,
        tax_id_last4: (taxIdType && last4.length === 4) ? last4 : undefined,
        tax_treatment: taxTreatment,
        w2_employer_name: (taxTreatment === 'w2' && w2EmployerName) ? w2EmployerName : undefined,
        w2_employer_ein_last4: (taxTreatment === 'w2' && w2EmployerEinLast4) ? w2EmployerEinLast4 : undefined,
        payroll_provider: (taxTreatment === 'w2' && payrollProvider) ? payrollProvider : undefined,
        payroll_contact_email: (taxTreatment === 'w2' && payrollContactEmail) ? payrollContactEmail : undefined,
      };

      const validated = payerSchema.parse(formData);

      // Map 'type' from validation to 'payer_type' for database
      const { type: payer_type, ...rest } = validated;
      const dbData = { payer_type, normalized_name: name.trim().toLowerCase(), ...rest };

      if (editingPayer) {
        await updatePayer.mutateAsync({
          id: editingPayer.id,
          ...dbData,
        });
      } else {
        await createPayer.mutateAsync(dbData);
      }

      resetForm();
      onClose();
    } catch (error: any) {
      if (error.errors) {
        // Zod validation error
        Alert.alert('Validation Error', error.errors[0].message);
      } else {
        Alert.alert('Error', error.message || 'Failed to save payer');
      }
    }
  };

  const TypeButton = ({ value, label }: { value: PayerType; label: string }) => (
    <TouchableOpacity
      style={[
        styles.typeButton,
        type === value && styles.typeButtonActive,
      ]}
      onPress={() => setType(value)}
    >
      <Text style={[
        styles.typeButtonText,
        type === value && styles.typeButtonTextActive,
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingPayer ? 'Edit Payer' : 'Add New Payer'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter payer name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeButtons}>
                {PAYER_TYPES.map((t) => (
                  <TypeButton key={t} value={t} label={t} />
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax Treatment *</Text>
              <View style={styles.taxTreatmentButtons}>
                <TouchableOpacity
                  style={[
                    styles.taxTreatmentButton,
                    taxTreatment === 'w2' && styles.taxTreatmentButtonActive,
                  ]}
                  onPress={() => setTaxTreatment('w2')}
                >
                  <Text style={[
                    styles.taxTreatmentButtonText,
                    taxTreatment === 'w2' && styles.taxTreatmentButtonTextActive,
                  ]}>W-2 (Payroll)</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.taxTreatmentButton,
                    taxTreatment === 'contractor_1099' && styles.taxTreatmentButtonActive,
                  ]}
                  onPress={() => setTaxTreatment('contractor_1099')}
                >
                  <Text style={[
                    styles.taxTreatmentButtonText,
                    taxTreatment === 'contractor_1099' && styles.taxTreatmentButtonTextActive,
                  ]}>1099 / Contractor</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.taxTreatmentButton,
                    taxTreatment === 'other' && styles.taxTreatmentButtonActive,
                  ]}
                  onPress={() => setTaxTreatment('other')}
                >
                  <Text style={[
                    styles.taxTreatmentButtonText,
                    taxTreatment === 'other' && styles.taxTreatmentButtonTextActive,
                  ]}>Other / Mixed</Text>
                </TouchableOpacity>
              </View>
            </View>

            {taxTreatment === 'contractor_1099' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tax ID Type (Optional)</Text>
                  <Text style={styles.helperText}>For 1099 reconciliation</Text>
                  <View style={styles.taxIdTypeButtons}>
                <TouchableOpacity
                  style={[
                    styles.taxIdTypeButton,
                    taxIdType === 'ssn' && styles.taxIdTypeButtonActive,
                  ]}
                  onPress={() => setTaxIdType('ssn')}
                >
                  <Text style={[
                    styles.taxIdTypeButtonText,
                    taxIdType === 'ssn' && styles.taxIdTypeButtonTextActive,
                  ]}>SSN</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.taxIdTypeButton,
                    taxIdType === 'ein' && styles.taxIdTypeButtonActive,
                  ]}
                  onPress={() => setTaxIdType('ein')}
                >
                  <Text style={[
                    styles.taxIdTypeButtonText,
                    taxIdType === 'ein' && styles.taxIdTypeButtonTextActive,
                  ]}>EIN</Text>
                </TouchableOpacity>
                {taxIdType && (
                  <TouchableOpacity
                    style={styles.clearTaxIdButton}
                    onPress={() => {
                      setTaxIdType('');
                      setTaxIdInput('');
                    }}
                  >
                    <Text style={styles.clearTaxIdText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

                {taxIdType && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>{taxIdType.toUpperCase()}</Text>
                    <Text style={styles.helperText}>
                      {editingPayer?.tax_id_last4 
                        ? 'We only store the last 4 digits. Enter full ID to replace.'
                        : 'Enter full ID - we\'ll only store the last 4 digits for security'}
                    </Text>
                    <TextInput
                      style={styles.input}
                      value={taxIdInput}
                      onChangeText={setTaxIdInput}
                      placeholder={taxIdType === 'ssn' ? 'XXX-XX-XXXX' : 'XX-XXXXXXX'}
                      placeholderTextColor="#9ca3af"
                      keyboardType="number-pad"
                      autoCapitalize="none"
                    />
                  </View>
                )}
              </>
            )}

            {taxTreatment === 'w2' && (
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.accordionHeader}
                  onPress={() => setShowW2Details(!showW2Details)}
                >
                  <Text style={styles.accordionTitle}>W-2 Details (Optional)</Text>
                  <Text style={styles.accordionIcon}>{showW2Details ? '▼' : '▶'}</Text>
                </TouchableOpacity>
                {showW2Details && (
                  <View style={styles.accordionContent}>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Employer Name</Text>
                      <TextInput
                        style={styles.input}
                        value={w2EmployerName}
                        onChangeText={setW2EmployerName}
                        placeholder="Official employer name on W-2"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Employer EIN (Last 4 digits)</Text>
                      <TextInput
                        style={styles.input}
                        value={w2EmployerEinLast4}
                        onChangeText={setW2EmployerEinLast4}
                        placeholder="1234"
                        placeholderTextColor="#9ca3af"
                        keyboardType="number-pad"
                        maxLength={4}
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Payroll Provider</Text>
                      <TextInput
                        style={styles.input}
                        value={payrollProvider}
                        onChangeText={setPayrollProvider}
                        placeholder="e.g., ADP, Paychex, Gusto"
                        placeholderTextColor="#9ca3af"
                      />
                    </View>
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Payroll Contact Email</Text>
                      <TextInput
                        style={styles.input}
                        value={payrollContactEmail}
                        onChangeText={setPayrollContactEmail}
                        placeholder="payroll@example.com"
                        placeholderTextColor="#9ca3af"
                        keyboardType="email-address"
                        autoCapitalize="none"
                      />
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Email (Optional)</Text>
              <TextInput
                style={styles.input}
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="email@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add notes about this payer..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              style={styles.submitButton} 
              onPress={handleSubmit}
              disabled={createPayer.isPending || updatePayer.isPending}
            >
              <Text style={styles.submitButtonText} numberOfLines={1} ellipsizeMode="tail">
                {createPayer.isPending || updatePayer.isPending
                  ? 'Saving...'
                  : editingPayer
                  ? 'Update'
                  : 'Add'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: '#6b7280',
  },
  form: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
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
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: -4,
    marginBottom: 4,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  taxIdTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  taxIdTypeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  taxIdTypeButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  taxIdTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  taxIdTypeButtonTextActive: {
    color: '#fff',
  },
  clearTaxIdButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
  },
  clearTaxIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ef4444',
  },
  taxTreatmentButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taxTreatmentButton: {
    flex: 1,
    minWidth: 100,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  taxTreatmentButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  taxTreatmentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  taxTreatmentButtonTextActive: {
    color: '#fff',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  accordionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  accordionIcon: {
    fontSize: 12,
    color: '#6b7280',
  },
  accordionContent: {
    marginTop: 12,
    paddingLeft: 8,
  },
});
