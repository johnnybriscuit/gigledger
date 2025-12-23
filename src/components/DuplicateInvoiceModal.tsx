import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useInvoices } from '../hooks/useInvoices';
import { useInvoiceSettings } from '../hooks/useInvoiceSettings';
import { Invoice } from '../types/invoice';

interface DuplicateInvoiceModalProps {
  invoice: Invoice;
  visible: boolean;
  onClose: () => void;
  onSuccess?: (newInvoiceId: string) => void;
}

export function DuplicateInvoiceModal({ invoice, visible, onClose, onSuccess }: DuplicateInvoiceModalProps) {
  const { duplicateInvoice, createInvoice } = useInvoices();
  const { getNextInvoiceNumber } = useInvoiceSettings();
  const [duplicating, setDuplicating] = useState(false);

  const handleDuplicate = async () => {
    try {
      setDuplicating(true);

      const formData = await duplicateInvoice(invoice.id);
      const newInvoiceNumber = await getNextInvoiceNumber();
      const newInvoice = await createInvoice(formData, newInvoiceNumber);

      Alert.alert('Success', `Invoice duplicated as ${newInvoiceNumber}`);
      onSuccess?.(newInvoice.id);
      onClose();
    } catch (error) {
      console.error('Error duplicating invoice:', error);
      Alert.alert('Error', 'Failed to duplicate invoice');
    } finally {
      setDuplicating(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Duplicate Invoice?</Text>
          
          <Text style={styles.modalText}>
            This will create a new draft invoice with the same line items and client information as:
          </Text>

          <View style={styles.invoiceInfo}>
            <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
            <Text style={styles.clientName}>{invoice.client_name}</Text>
            <Text style={styles.amount}>${invoice.total_amount.toFixed(2)}</Text>
          </View>

          <Text style={styles.noteText}>
            The new invoice will have today's date and a new invoice number.
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={onClose}
              disabled={duplicating}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.duplicateButton, duplicating && styles.duplicateButtonDisabled]}
              onPress={handleDuplicate}
              disabled={duplicating}
            >
              {duplicating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.duplicateButtonText}>Duplicate Invoice</Text>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 16,
  },
  invoiceInfo: {
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  noteText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
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
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  duplicateButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  duplicateButtonDisabled: {
    opacity: 0.6,
  },
  duplicateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
