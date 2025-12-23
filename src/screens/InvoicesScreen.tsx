import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { InvoiceList } from '../components/InvoiceList';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { InvoiceSettings } from '../components/InvoiceSettings';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { SendInvoiceModal } from '../components/SendInvoiceModal';
import { DuplicateInvoiceModal } from '../components/DuplicateInvoiceModal';
import { useInvoiceSettings } from '../hooks/useInvoiceSettings';
import { useInvoices } from '../hooks/useInvoices';
import { Invoice } from '../types/invoice';
import { downloadInvoiceHTML, printInvoice } from '../utils/generateInvoicePDF';

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'settings';

export function InvoicesScreen() {
  const { settings, loading: settingsLoading } = useInvoiceSettings();
  const { updateInvoiceStatus, deleteInvoice } = useInvoices();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewMode('view');
  };

  const handleCreateNew = () => {
    if (!settings) {
      Alert.alert(
        'Setup Required',
        'Please set up your business information before creating invoices.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Setup Now', onPress: () => setViewMode('settings') }
        ]
      );
      return;
    }
    setSelectedInvoice(null);
    setViewMode('create');
  };

  const handleEdit = () => {
    setViewMode('edit');
  };

  const handleDelete = async () => {
    console.log('🗑️ Delete button clicked');
    if (!selectedInvoice) {
      console.log('❌ No invoice selected');
      return;
    }
    console.log('Selected invoice:', selectedInvoice.id, selectedInvoice.invoice_number);

    // Use window.confirm for web compatibility
    const confirmed = window.confirm(
      `Are you sure you want to delete invoice ${selectedInvoice.invoice_number}? This action cannot be undone.`
    );

    if (!confirmed) {
      console.log('Delete cancelled');
      return;
    }

    console.log('Delete confirmed, calling deleteInvoice...');
    try {
      await deleteInvoice(selectedInvoice.id);
      console.log('✓ Delete successful, updating UI');
      setViewMode('list');
      setSelectedInvoice(null);
      window.alert('Invoice deleted successfully');
    } catch (error) {
      console.error('❌ Delete failed:', error);
      window.alert('Failed to delete invoice');
    }
  };

  const handleSend = () => {
    setShowEmailModal(true);
  };

  const handleDownload = () => {
    if (selectedInvoice && settings) {
      downloadInvoiceHTML(selectedInvoice, settings);
    }
  };

  const handlePrint = () => {
    if (selectedInvoice && settings) {
      printInvoice(selectedInvoice, settings);
    }
  };

  const handleMarkPaid = () => {
    setShowPaymentModal(true);
  };

  const handleEmailSuccess = () => {
    setShowEmailModal(false);
    Alert.alert('Success', 'Invoice sent successfully');
  };

  const handleDuplicate = () => {
    setShowDuplicateModal(true);
  };

  const handleDuplicateSuccess = (newInvoiceId: string) => {
    setShowDuplicateModal(false);
    setViewMode('list');
  };

  const handleFormSuccess = () => {
    setViewMode('list');
    setSelectedInvoice(null);
  };

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setViewMode('list');
    setSelectedInvoice(null);
  };

  if (settingsLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {viewMode === 'list' && (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Invoices</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.createHeaderButton}
                onPress={handleCreateNew}
              >
                <Text style={styles.createHeaderButtonText}>+ Create Invoice</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.settingsButton}
                onPress={() => setViewMode('settings')}
              >
                <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
              </TouchableOpacity>
            </View>
          </View>
          <InvoiceList
            onSelectInvoice={handleSelectInvoice}
            onCreateNew={handleCreateNew}
          />
        </>
      )}

      {viewMode === 'create' && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Create Invoice</Text>
            <View style={{ width: 60 }} />
          </View>
          <InvoiceForm
            onSuccess={handleFormSuccess}
            onCancel={() => setViewMode('list')}
          />
        </>
      )}

      {viewMode === 'edit' && selectedInvoice && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setViewMode('view')}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Edit Invoice</Text>
            <View style={{ width: 60 }} />
          </View>
          <InvoiceForm
            invoiceId={selectedInvoice.id}
            onSuccess={handleFormSuccess}
            onCancel={() => setViewMode('view')}
          />
        </>
      )}

      {viewMode === 'view' && selectedInvoice && settings && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{selectedInvoice.invoice_number}</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionButton} onPress={handleSend}>
              <Text style={styles.actionButtonText}>📤 Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
              <Text style={styles.actionButtonText}>📥 Download</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
              <Text style={styles.actionButtonText}>🖨️ Print</Text>
            </TouchableOpacity>

            {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
              <TouchableOpacity style={styles.actionButton} onPress={handleMarkPaid}>
                <Text style={styles.actionButtonText}>💰 Record Payment</Text>
              </TouchableOpacity>
            )}

            {selectedInvoice.status === 'draft' && (
              <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                <Text style={styles.actionButtonText}>✏️ Edit</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.actionButton} onPress={handleDuplicate}>
              <Text style={styles.actionButtonText}>📋 Duplicate</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>🗑️ Delete</Text>
            </TouchableOpacity>
          </View>

          <InvoiceTemplate invoice={selectedInvoice} settings={settings} />

          {showPaymentModal && (
            <RecordPaymentModal
              invoice={selectedInvoice}
              visible={showPaymentModal}
              onClose={() => setShowPaymentModal(false)}
              onSuccess={handlePaymentSuccess}
            />
          )}

          {showEmailModal && (
            <SendInvoiceModal
              invoice={selectedInvoice}
              visible={showEmailModal}
              onClose={() => setShowEmailModal(false)}
              onSuccess={handleEmailSuccess}
            />
          )}

          {showDuplicateModal && (
            <DuplicateInvoiceModal
              invoice={selectedInvoice}
              visible={showDuplicateModal}
              onClose={() => setShowDuplicateModal(false)}
              onSuccess={handleDuplicateSuccess}
            />
          )}
        </>
      )}

      {viewMode === 'settings' && (
        <>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Invoice Settings</Text>
            <View style={{ width: 60 }} />
          </View>
          <InvoiceSettings />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  backButton: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  createHeaderButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#2563eb',
  },
  createHeaderButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  settingsButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6',
  },
  settingsButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2563eb',
  },
  actionButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    color: '#dc2626',
  },
});
