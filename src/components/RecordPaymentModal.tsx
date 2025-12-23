import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useInvoices } from '../hooks/useInvoices';
import { Invoice, PAYMENT_METHODS, formatCurrency } from '../types/invoice';

interface RecordPaymentModalProps {
  invoice: Invoice;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function RecordPaymentModal({ invoice, visible, onClose, onSuccess }: RecordPaymentModalProps) {
  const { recordPayment } = useInvoices();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: invoice.balance_due?.toString() || invoice.total_amount.toString(),
    payment_method: '',
    reference_number: '',
    notes: ''
  });

  const handleSave = async () => {
    if (!formData.payment_method) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    const balanceDue = invoice.balance_due ?? invoice.total_amount;
    if (amount > balanceDue) {
      Alert.alert('Error', `Payment amount cannot exceed balance due (${formatCurrency(balanceDue, invoice.currency)})`);
      return;
    }

    try {
      setSaving(true);
      await recordPayment(invoice.id, {
        payment_date: formData.payment_date,
        amount,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number || undefined,
        notes: formData.notes || undefined
      });

      Alert.alert('Success', 'Payment recorded successfully');
      onSuccess?.();
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to record payment');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setFormData({
      payment_date: new Date().toISOString().split('T')[0],
      amount: invoice.balance_due?.toString() || invoice.total_amount.toString(),
      payment_method: '',
      reference_number: '',
      notes: ''
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceInfoLabel}>Invoice: {invoice.invoice_number}</Text>
              <Text style={styles.invoiceInfoLabel}>Client: {invoice.client_name}</Text>
              <Text style={styles.balanceDueText}>
                Balance Due: {formatCurrency(invoice.balance_due ?? invoice.total_amount, invoice.currency)}
              </Text>
            </View>

            <Text style={styles.label}>Payment Date *</Text>
            <TextInput
              style={styles.input}
              value={formData.payment_date}
              onChangeText={(text) => setFormData({ ...formData, payment_date: text })}
              placeholder="YYYY-MM-DD"
            />

            <Text style={styles.label}>Amount *</Text>
            <TextInput
              style={styles.input}
              value={formData.amount}
              onChangeText={(text) => setFormData({ ...formData, amount: text })}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text style={styles.label}>Payment Method *</Text>
            <View style={styles.paymentMethodsGrid}>
              {PAYMENT_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    formData.payment_method === method && styles.paymentMethodButtonActive
                  ]}
                  onPress={() => setFormData({ ...formData, payment_method: method })}
                >
                  <Text style={[
                    styles.paymentMethodButtonText,
                    formData.payment_method === method && styles.paymentMethodButtonTextActive
                  ]}>
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Reference Number</Text>
            <TextInput
              style={styles.input}
              value={formData.reference_number}
              onChangeText={(text) => setFormData({ ...formData, reference_number: text })}
              placeholder="Check #, Transaction ID, etc."
            />

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Additional notes..."
              multiline
              numberOfLines={3}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Record Payment</Text>
              )}
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
    maxHeight: '90%',
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
    fontSize: 28,
    color: '#6b7280',
    fontWeight: '300',
  },
  modalBody: {
    padding: 20,
  },
  invoiceInfo: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  invoiceInfoLabel: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  balanceDueText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  paymentMethodButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  paymentMethodButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  paymentMethodButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  paymentMethodButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
