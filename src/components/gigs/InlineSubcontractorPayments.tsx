import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useSubcontractors } from '../../hooks/useSubcontractors';
import type { Database } from '../../types/database.types';
import { colors, radius, spacing, typography } from '../../styles/theme';

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
    onChange([...payments, newPayment]);
  };

  const updatePayment = (id: string, field: keyof InlineSubcontractorPayment, value: string) => {
    const updatedPayments = payments.map((payment) =>
      payment.id === id ? { ...payment, [field]: value } : payment
    );
    onChange(updatedPayments);
  };

  const selectSubcontractor = (paymentId: string, subcontractor: Subcontractor) => {
    const updatedPayments = payments.map((payment) =>
      payment.id === paymentId
        ? {
            ...payment,
            subcontractor_id: subcontractor.id,
            subcontractor_name: subcontractor.name,
          }
        : payment
    );
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

      {payments.map((payment) => {
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
                    placeholderTextColor={colors.text.subtle}
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
                  placeholderTextColor={colors.text.subtle}
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
    marginBottom: parseInt(spacing[5]),
  },
  header: {
    marginBottom: parseInt(spacing[3]),
  },
  sectionTitle: {
    fontSize: parseInt(typography.fontSize.body.size),
    fontWeight: typography.fontWeight.bold,
    color: colors.text.DEFAULT,
    marginBottom: 4,
  },
  helperText: {
    fontSize: parseInt(typography.fontSize.caption.size),
    color: colors.text.muted,
  },
  paymentRow: {
    flexDirection: 'row',
    marginBottom: parseInt(spacing[3]),
    padding: parseInt(spacing[3]),
    backgroundColor: colors.surface.muted,
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  paymentMain: {
    flex: 1,
  },
  subcontractorField: {
    marginBottom: parseInt(spacing[3]),
    position: 'relative',
    zIndex: 100,
  },
  subcontractorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.md),
    backgroundColor: colors.surface.DEFAULT,
  },
  subcontractorButtonEmpty: {
    borderColor: colors.danger.DEFAULT,
    borderWidth: 1,
  },
  subcontractorButtonText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.DEFAULT,
    flex: 1,
  },
  placeholderText: {
    color: colors.text.subtle,
  },
  dropdownIcon: {
    fontSize: parseInt(typography.fontSize.caption.size),
    color: colors.text.muted,
    marginLeft: parseInt(spacing[2]),
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    shadowColor: colors.overlay.DEFAULT,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 200,
    zIndex: 1000,
  },
  dropdownItem: {
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  dropdownItemText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.DEFAULT,
    fontWeight: typography.fontWeight.semibold,
  },
  dropdownItemSubtext: {
    fontSize: parseInt(typography.fontSize.caption.size),
    color: colors.text.muted,
    marginTop: 2,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border.DEFAULT,
  },
  addNewText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.brand.DEFAULT,
    fontWeight: typography.fontWeight.semibold,
  },
  amountField: {
    marginBottom: parseInt(spacing[3]),
  },
  inputLabel: {
    fontSize: parseInt(typography.fontSize.caption.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.text.muted,
    marginBottom: 6,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.md),
    paddingHorizontal: parseInt(spacing[3]),
    backgroundColor: colors.surface.DEFAULT,
  },
  currencySymbol: {
    fontSize: parseInt(typography.fontSize.body.size),
    color: colors.text.muted,
    marginRight: 4,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: parseInt(typography.fontSize.body.size),
    color: colors.text.DEFAULT,
  },
  noteField: {
    marginBottom: 0,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderRadius: parseInt(radius.md),
    paddingHorizontal: parseInt(spacing[3]),
    paddingVertical: 10,
    fontSize: parseInt(typography.fontSize.subtle.size),
    color: colors.text.DEFAULT,
    backgroundColor: colors.surface.DEFAULT,
  },
  removeButton: {
    marginLeft: parseInt(spacing[2]),
    padding: 4,
  },
  removeButtonText: {
    fontSize: 18,
    color: colors.danger.DEFAULT,
    fontWeight: typography.fontWeight.semibold,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: parseInt(spacing[4]),
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
    borderStyle: 'dashed',
    alignItems: 'center',
    backgroundColor: colors.surface.DEFAULT,
  },
  addButtonText: {
    fontSize: parseInt(typography.fontSize.subtle.size),
    fontWeight: typography.fontWeight.semibold,
    color: colors.brand.DEFAULT,
  },
});
