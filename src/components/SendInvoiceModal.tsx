import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Invoice } from '../types/invoice';

interface SendInvoiceModalProps {
  invoice: Invoice;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SendInvoiceModal({ invoice, visible, onClose, onSuccess }: SendInvoiceModalProps) {
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState({
    recipientEmail: invoice.client_email || '',
    message: `Hi ${invoice.client_name},\n\nPlease find attached invoice ${invoice.invoice_number} for your review.\n\nThank you for your business!`
  });

  const handleSend = async () => {
    if (!formData.recipientEmail) {
      Alert.alert('Error', 'Please enter a recipient email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.recipientEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setSending(true);

      // Get user ID from auth
      const { supabase } = await import('../lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Not authenticated');
      }

      // Call Supabase Edge Function
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jvostkeswuhfwntbrfzl.supabase.co';
      const response = await fetch(`${supabaseUrl}/functions/v1/send-invoice-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          invoiceId: invoice.id,
          recipientEmail: formData.recipientEmail,
          message: formData.message
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Send invoice error:', errorData);
        
        // Check for Resend testing mode limitation
        if (errorData.message && errorData.message.includes('send testing emails to your own email')) {
          Alert.alert(
            'Email Service in Testing Mode',
            `The email service is currently in testing mode and can only send to verified addresses. For now, please manually send the invoice to ${formData.recipientEmail}.\n\nYou can download the invoice using the Download button.`,
            [{ text: 'OK' }]
          );
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to send invoice');
      }

      Alert.alert('Success', `Invoice sent to ${formData.recipientEmail}`);
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Error sending invoice:', error);
      const errorMessage = error.message || 'Failed to send invoice. Please try again.';
      
      // Check if it's an email service configuration issue
      if (errorMessage.includes('Email service not configured')) {
        Alert.alert(
          'Email Service Not Configured',
          'The email service is not yet set up. Please contact support or manually send the invoice to your client.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setFormData({
      recipientEmail: invoice.client_email || '',
      message: `Hi ${invoice.client_name},\n\nPlease find attached invoice ${invoice.invoice_number} for your review.\n\nThank you for your business!`
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
            <Text style={styles.modalTitle}>Send Invoice via Email</Text>
            <TouchableOpacity onPress={handleClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceInfoLabel}>Invoice: {invoice.invoice_number}</Text>
              <Text style={styles.invoiceInfoLabel}>Client: {invoice.client_name}</Text>
            </View>

            <Text style={styles.label}>Recipient Email *</Text>
            <TextInput
              style={styles.input}
              value={formData.recipientEmail}
              onChangeText={(text) => setFormData({ ...formData, recipientEmail: text })}
              placeholder="client@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.message}
              onChangeText={(text) => setFormData({ ...formData, message: text })}
              placeholder="Add a personal message..."
              multiline
              numberOfLines={6}
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                📧 The invoice will be sent as a professional email with a link to view and download the invoice.
              </Text>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sendButton, sending && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>Send Invoice</Text>
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
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
  sendButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
