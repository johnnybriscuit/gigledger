import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubcontractors } from '../../hooks/useSubcontractors';
import type { Database } from '../../types/database.types';

type Subcontractor = Database['public']['Tables']['subcontractors']['Row'];

export interface InlineSubcontractorPayment {
  id: string;
  subcontractor_id: string;
  subcontractor_name?: string;
  amount: string;
  note: string;
}

interface InlineSubcontractorPaymentsProps {
  payments: InlineSubcontractorPayment[];
  onChange: (payments: InlineSubcontractorPayment[]) => void;
  onAddSubcontractor?: () => void;
}

export function InlineSubcontractorPayments({ 
  payments, 
  onChange,
  onAddSubcontractor 
}: InlineSubcontractorPaymentsProps) {
  const { data: subcontractors } = useSubcontractors();
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  const addPayment = () => {
    const newPayment: InlineSubcontractorPayment = {
      id: `temp-${Date.now()}`,
      subcontractor_id: '',
      subcontractor_name: '',
      amount: '',
      note: '',
    };
    console.log('[InlineSubcontractorPayments] Adding payment:', newPayment);
    console.log('[InlineSubcontractorPayments] Current payments:', payments);
    const updatedPayments = [...payments, newPayment];
    console.log('[InlineSubcontractorPayments] Updated payments:', updatedPayments);
    onChange(updatedPayments);
  };

  const updatePayment = (id: string, field: keyof InlineSubcontractorPayment, value: string) => {
    console.log('[InlineSubcontractorPayments] Updating payment:', { id, field, value });
    const updatedPayments = payments.map((payment) =>
      payment.id === id ? { ...payment, [field]: value } : payment
    );
    console.log('[InlineSubcontractorPayments] Updated payments:', updatedPayments);
    onChange(updatedPayments);
  };

  const selectSubcontractor = (paymentId: string, subcontractor: Subcontractor) => {
    console.log('[InlineSubcontractorPayments] Selecting subcontractor:', { paymentId, subcontractor });
    const updatedPayments = payments.map((payment) =>
      payment.id === paymentId
        ? {
            ...payment,
            subcontractor_id: subcontractor.id,
            subcontractor_name: subcontractor.name,
          }
        : payment
    );
    console.log('[InlineSubcontractorPayments] Updated payments:', updatedPayments);
    onChange(updatedPayments);
    setShowDropdown(null);
  };

  const removePayment = (id: string) => {
    onChange(payments.filter((payment) => payment.id !== id));
  };

  const getSubcontractorName = (subcontractorId: string) => {
    const subcontractor = subcontractors?.find((s) => s.id === subcontractorId);
    return subcontractor?.name || '';
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Subcontractor Payments</Text>
        <Text style={styles.helperText}>Track payouts to bandmates/crew</Text>
      </View>

      {payments.map((payment, index) => {
        const subcontractorName = payment.subcontractor_name || getSubcontractorName(payment.subcontractor_id);

        return (
          <View key={payment.id} style={styles.paymentRow}>
            <View style={styles.paymentMain}>
              {/* Subcontractor Selector */}
              <View style={styles.subcontractorField}>
                <TouchableOpacity
                  style={[
                    styles.subcontractorButton,
                    !payment.subcontractor_id && styles.subcontractorButtonEmpty,
                  ]}
                  onPress={() => setShowDropdown(showDropdown === payment.id ? null : payment.id)}
                >
                  <Text
                    style={[
                      styles.subcontractorButtonText,
                      !payment.subcontractor_id && styles.placeholderText,
                    ]}
                  >
                    {subcontractorName || 'Select subcontractor'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>

                {showDropdown === payment.id && (
                  <View style={styles.dropdown}>
                    {subcontractors && subcontractors.length > 0 ? (
                      <>
                        {subcontractors.map((subcontractor) => (
                          <TouchableOpacity
                            key={subcontractor.id}
                            style={styles.dropdownItem}
                            onPress={() => selectSubcontractor(payment.id, subcontractor)}
                          >
                            <Text style={styles.dropdownItemText}>{subcontractor.name}</Text>
                            {subcontractor.role && (
                              <Text style={styles.dropdownItemSubtext}>{subcontractor.role}</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                        <View style={styles.dropdownDivider} />
                      </>
                    ) : null}
                    <TouchableOpacity
                      style={styles.dropdownItem}
                      onPress={() => {
                        setShowDropdown(null);
                        onAddSubcontractor?.();
                      }}
                    >
                      <Text style={styles.addNewText}>+ Add New Subcontractor</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Amount Field */}
              <View style={styles.amountField}>
                <Text style={styles.inputLabel}>Amount</Text>
                <View style={styles.amountInputWrapper}>
                  <Text style={styles.currencySymbol}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    value={payment.amount}
                    onChangeText={(text) => updatePayment(payment.id, 'amount', text)}
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Note Field */}
              <View style={styles.noteField}>
                <Text style={styles.inputLabel}>Note (optional)</Text>
                <TextInput
                  style={styles.noteInput}
                  value={payment.note}
                  onChangeText={(text) => updatePayment(payment.id, 'note', text)}
                  placeholder="e.g., 3-hour set"
                  placeholderTextColor="#9ca3af"
                />
              </View>
            </View>

            {/* Remove Button */}
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removePayment(payment.id)}
            >
              <Text style={styles.removeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      <TouchableOpacity style={styles.addButton} onPress={addPayment}>
        <Text style={styles.addButtonText}>+ Add Subcontractor Payment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  header: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  paymentMain: {
    flex: 1,
  },
  subcontractorField: {
    marginBottom: 12,
    position: 'relative',
    zIndex: 100,
  },
  subcontractorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#fff',
  },
  subcontractorButtonEmpty: {
    borderColor: '#f87171',
    borderWidth: 1,
  },
  subcontractorButtonText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  dropdownIcon: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 8,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  addNewText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  amountField: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  currencySymbol: {
    fontSize: 16,
    color: '#6b7280',
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: '#111827',
  },
  noteField: {
    marginBottom: 0,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#fff',
  },
  removeButton: {
    marginLeft: 8,
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
    color: '#ef4444',
    fontWeight: '600',
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
  },
});
