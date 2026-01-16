import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useCreatePayer, useUpdatePayer, type Payer } from '../hooks/usePayers';

interface PayerFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (payerId: string) => void;
  editingPayer?: Payer | null;
}

const PAYER_TYPES = ['Venue', 'Client', 'Platform', 'Agency', 'Other'] as const;

export function PayerFormModal({ visible, onClose, onSuccess, editingPayer }: PayerFormModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<string>('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [expect1099, setExpect1099] = useState(false);
  const [taxIdType, setTaxIdType] = useState<string>('');
  const [taxIdInput, setTaxIdInput] = useState('');

  const createPayer = useCreatePayer();
  const updatePayer = useUpdatePayer();

  useEffect(() => {
    if (editingPayer) {
      setName(editingPayer.name);
      setType(editingPayer.payer_type || '');
      setContactEmail(editingPayer.contact_email || '');
      setNotes(editingPayer.notes || '');
      setExpect1099(editingPayer.expect_1099 || false);
      setTaxIdType(editingPayer.tax_id_type || '');
      // Show masked value if last4 exists
      if (editingPayer.tax_id_last4) {
        setTaxIdInput(`••••••${editingPayer.tax_id_last4}`);
      } else {
        setTaxIdInput('');
      }
    } else {
      resetForm();
    }
  }, [editingPayer, visible]);

  const resetForm = () => {
    setName('');
    setType('');
    setContactEmail('');
    setNotes('');
    setExpect1099(false);
    setTaxIdType('');
    setTaxIdInput('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a payer name');
      return;
    }

    // Extract last 4 digits from tax ID input
    const digitsOnly = taxIdInput.replace(/[^0-9]/g, '');
    const last4 = digitsOnly.slice(-4);
    
    // Validate if tax ID type is selected but no valid last 4
    if (taxIdType && last4.length < 4) {
      Alert.alert('Error', 'Please enter at least the last 4 digits of the tax ID');
      return;
    }

    try {
      if (editingPayer) {
        await updatePayer.mutateAsync({
          id: editingPayer.id,
          name: name.trim(),
          payer_type: (type as any) || undefined,
          contact_email: contactEmail || undefined,
          notes: notes || undefined,
          expect_1099: expect1099,
          tax_id_type: taxIdType || undefined,
          tax_id_last4: (taxIdType && last4.length === 4) ? last4 : undefined,
        });
        Alert.alert('Success', 'Payer updated successfully');
      } else {
        const result = await createPayer.mutateAsync({
          name: name.trim(),
          payer_type: (type as any) || undefined,
          contact_email: contactEmail || undefined,
          notes: notes || undefined,
          expect_1099: expect1099,
          tax_id_type: taxIdType || undefined,
          tax_id_last4: (taxIdType && last4.length === 4) ? last4 : undefined,
        });
        
        // Call onSuccess with the new payer ID
        if (onSuccess && result) {
          onSuccess(result.id);
        }
      }
      
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save payer');
    }
  };

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
              <Text style={styles.label}>Payer Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="e.g., Blue Note Jazz Club"
                placeholderTextColor="#9ca3af"
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Expect 1099?</Text>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setExpect1099(!expect1099)}
              >
                <View style={[styles.checkbox, expect1099 && styles.checkboxChecked]}>
                  {expect1099 && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>
                  Will receive 1099 form from this payer
                </Text>
              </TouchableOpacity>
            </View>

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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Contact Email</Text>
              <TextInput
                style={styles.input}
                value={contactEmail}
                onChangeText={setContactEmail}
                placeholder="contact@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Add any notes about this payer..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
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
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#d1d5db',
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
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
});
