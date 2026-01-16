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
import { useCreateSubcontractor, useUpdateSubcontractor } from '../hooks/useSubcontractors';
import type { Database } from '../types/database.types';

type Subcontractor = Database['public']['Tables']['subcontractors']['Row'];

interface SubcontractorFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (subcontractorId: string) => void;
  editingSubcontractor?: Subcontractor | null;
}

const TAX_ID_TYPES = [
  { value: 'ssn', label: 'SSN' },
  { value: 'ein', label: 'EIN' },
] as const;

export function SubcontractorFormModal({ 
  visible, 
  onClose, 
  onSuccess, 
  editingSubcontractor 
}: SubcontractorFormModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [taxIdType, setTaxIdType] = useState<string>('');
  const [taxIdLast4, setTaxIdLast4] = useState('');

  const createSubcontractor = useCreateSubcontractor();
  const updateSubcontractor = useUpdateSubcontractor();

  useEffect(() => {
    if (editingSubcontractor) {
      setName(editingSubcontractor.name);
      setRole(editingSubcontractor.role || '');
      setEmail(editingSubcontractor.email || '');
      setPhone(editingSubcontractor.phone || '');
      setAddress(editingSubcontractor.address || '');
      setTaxIdType(editingSubcontractor.tax_id_type || '');
      setTaxIdLast4(editingSubcontractor.tax_id_last4 || '');
    } else {
      resetForm();
    }
  }, [editingSubcontractor, visible]);

  const resetForm = () => {
    setName('');
    setRole('');
    setEmail('');
    setPhone('');
    setAddress('');
    setTaxIdType('');
    setTaxIdLast4('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    // Validate tax ID last 4 if provided
    if (taxIdLast4 && !/^\d{4}$/.test(taxIdLast4)) {
      Alert.alert('Error', 'Tax ID last 4 must be exactly 4 digits');
      return;
    }

    try {
      if (editingSubcontractor) {
        await updateSubcontractor.mutateAsync({
          id: editingSubcontractor.id,
          updates: {
            name: name.trim(),
            role: role.trim() || undefined,
            email: email.trim() || undefined,
            phone: phone.trim() || undefined,
            address: address.trim() || undefined,
            tax_id_type: taxIdType || undefined,
            tax_id_last4: taxIdLast4 || undefined,
          },
        });
        Alert.alert('Success', 'Subcontractor updated successfully');
      } else {
        const result = await createSubcontractor.mutateAsync({
          name: name.trim(),
          role: role.trim() || undefined,
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
          tax_id_type: taxIdType || undefined,
          tax_id_last4: taxIdLast4 || undefined,
        });
        
        if (onSuccess && result) {
          onSuccess(result.id);
        }
      }
      
      resetForm();
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save subcontractor');
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
              {editingSubcontractor ? 'Edit Subcontractor' : 'Add New Subcontractor'}
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
                placeholder="e.g., John Smith"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Role/Title</Text>
              <TextInput
                style={styles.input}
                value={role}
                onChangeText={setRole}
                placeholder="e.g., Drummer, Sound Engineer"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="123 Main St, City, ST 12345"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax ID Type (Optional)</Text>
              <Text style={styles.helperText}>For year-end 1099 reporting</Text>
              <View style={styles.taxIdTypeButtons}>
                {TAX_ID_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.taxIdTypeButton,
                      taxIdType === type.value && styles.taxIdTypeButtonActive,
                    ]}
                    onPress={() => setTaxIdType(type.value)}
                  >
                    <Text style={[
                      styles.taxIdTypeButtonText,
                      taxIdType === type.value && styles.taxIdTypeButtonTextActive,
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {taxIdType && (
                  <TouchableOpacity
                    style={styles.clearButton}
                    onPress={() => {
                      setTaxIdType('');
                      setTaxIdLast4('');
                    }}
                  >
                    <Text style={styles.clearButtonText}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {taxIdType && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Last 4 Digits</Text>
                <Text style={styles.helperText}>
                  We only store the last 4 digits for security
                </Text>
                <TextInput
                  style={styles.input}
                  value={taxIdLast4}
                  onChangeText={(text) => setTaxIdLast4(text.replace(/\D/g, '').slice(0, 4))}
                  placeholder="1234"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={4}
                />
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={createSubcontractor.isPending || updateSubcontractor.isPending}
            >
              <Text style={styles.submitButtonText} numberOfLines={1} ellipsizeMode="tail">
                {editingSubcontractor ? 'Update' : 'Add'}
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
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
    paddingHorizontal: 20,
    paddingTop: 20,
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
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 20,
  },
  taxIdTypeButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  taxIdTypeButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
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
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  clearButtonText: {
    fontSize: 14,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
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
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
