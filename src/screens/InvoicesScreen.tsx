import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { InvoiceList } from '../components/InvoiceList';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { InvoiceSettings } from '../components/InvoiceSettings';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { SendInvoiceModal } from '../components/SendInvoiceModal';
import { DuplicateInvoiceModal } from '../components/DuplicateInvoiceModal';
import { PaywallModal } from '../components/PaywallModal';
import { UsageLimitBanner } from '../components/UsageLimitBanner';
import { useInvoiceSettings } from '../hooks/useInvoiceSettings';
import { useInvoices } from '../hooks/useInvoices';
import { usePaymentMethodDetails } from '../hooks/usePaymentMethodDetails';
import { useEntitlements } from '../hooks/useEntitlements';
import { Invoice } from '../types/invoice';
import { downloadInvoiceHTML, printInvoice } from '../utils/generateInvoicePDF';
import { supabase } from '../lib/supabase';
import { useQuery } from '@tanstack/react-query';

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'settings';

interface InvoicesScreenProps {
  onNavigateToAccount?: () => void;
  onNavigateToSubscription?: () => void;
}

export function InvoicesScreen({ onNavigateToAccount, onNavigateToSubscription }: InvoicesScreenProps = {}) {
  const { settings, loading: settingsLoading } = useInvoiceSettings();
  const { updateInvoiceStatus, deleteInvoice, deletePayment } = useInvoices();
  const entitlements = useEntitlements();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'invoice_limit' | 'export_limit'>('invoice_limit');

  // Fetch user and payment method details for invoice export
  const { data: user } = useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });
  const { data: paymentMethods = [] } = usePaymentMethodDetails(user?.id);

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewMode('view');
  };

  const handleCreateNew = () => {
    console.log('🔵 Create Invoice clicked');
    console.log('🔵 Settings:', !!settings);
    console.log('🔵 Entitlements:', entitlements);
    console.log('🔵 Can create invoice:', entitlements.can.createInvoice);
    console.log('🔵 Is loading:', entitlements.isLoading);
    
    try {
      if (!settings) {
        console.log('🔵 Settings not loaded, prompting user to set up');
        // Use window.confirm for web compatibility
        const shouldSetup = window.confirm(
          'Setup Required\n\nPlease set up your business information before creating invoices.\n\nWould you like to set up now?'
        );
        if (shouldSetup) {
          setViewMode('settings');
        }
        return;
      }
      
      // If still loading entitlements, show feedback
      if (entitlements.isLoading) {
        console.log('🔵 Entitlements still loading');
        window.alert('Loading...\n\nChecking your plan limits. Please try again in a moment.');
        return;
      }
      
      // Check invoice limit
      if (!entitlements.can.createInvoice) {
        console.log('🔵 Invoice limit reached, showing paywall');
        setPaywallReason('invoice_limit');
        setShowPaywallModal(true);
        return;
      }
      
      console.log('🔵 Opening invoice create form');
      setSelectedInvoice(null);
      setViewMode('create');
    } catch (error) {
      console.error('🔴 Error in handleCreateNew:', error);
      window.alert('Error\n\nCouldn\'t start a new invoice. Please try again.');
    }
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
    if (!entitlements.can.exportData) {
      setPaywallReason('export_limit');
      setShowPaywallModal(true);
      return;
    }
    if (selectedInvoice && settings) {
      downloadInvoiceHTML(selectedInvoice, settings, paymentMethods);
    }
  };

  const handlePrint = () => {
    if (selectedInvoice && settings) {
      printInvoice(selectedInvoice, settings, paymentMethods);
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

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayment(paymentId);
      // Navigate back to list so user can see updated invoice status
      setViewMode('list');
      setSelectedInvoice(null);
      window.alert('Payment deleted successfully. Invoice status updated.');
    } catch (error: any) {
      window.alert(error.message || 'Failed to delete payment');
    }
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
          
          {/* Usage Banner - only show for Free plan users */}
          {!entitlements.isPro && entitlements.usage.invoicesCreatedCount !== undefined && (
            <View style={styles.bannerContainer}>
              <UsageLimitBanner
                label="invoices"
                usedCount={entitlements.usage.invoicesCreatedCount}
                limitCount={3}
                onUpgradePress={() => {
                  if (onNavigateToSubscription) {
                    onNavigateToSubscription();
                  }
                }}
              />
            </View>
          )}
          
          <InvoiceList
            onSelectInvoice={handleSelectInvoice}
            onCreateNew={handleCreateNew}
          />
          
          {/* Paywall Modal - shown at list level */}
          {showPaywallModal && (
            <PaywallModal
              visible={showPaywallModal}
              reason={paywallReason}
              onClose={() => setShowPaywallModal(false)}
              onUpgrade={() => {
                setShowPaywallModal(false);
                if (onNavigateToSubscription) {
                  onNavigateToSubscription();
                }
              }}
              remainingCount={paywallReason === 'invoice_limit' ? entitlements.remaining.invoicesRemaining ?? undefined : undefined}
            />
          )}
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
            onNavigateToAccount={onNavigateToAccount}
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
            onNavigateToAccount={onNavigateToAccount}
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

          <InvoiceTemplate 
            invoice={selectedInvoice} 
            settings={settings} 
            onDeletePayment={handleDeletePayment}
          />

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

          {showPaywallModal && (
            <PaywallModal
              visible={showPaywallModal}
              reason={paywallReason}
              onClose={() => setShowPaywallModal(false)}
              onUpgrade={() => {
                setShowPaywallModal(false);
                if (onNavigateToSubscription) {
                  onNavigateToSubscription();
                }
              }}
              remainingCount={paywallReason === 'invoice_limit' ? entitlements.remaining.invoicesRemaining ?? undefined : undefined}
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
          <InvoiceSettings onSuccess={() => setViewMode('list')} />
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
  remainingText: {
    fontSize: 13,
    color: '#6b7280',
    marginRight: 12,
  },
  bannerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
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
