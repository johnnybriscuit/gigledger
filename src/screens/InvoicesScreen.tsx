import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { InvoiceList } from '../components/InvoiceList';
import { InvoiceForm } from '../components/InvoiceForm';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { InvoiceSettings } from '../components/InvoiceSettings';
import { RecordPaymentModal } from '../components/RecordPaymentModal';
import { SendInvoiceModal } from '../components/SendInvoiceModal';
import { PaywallModal } from '../components/PaywallModal';
import { UsageLimitBanner } from '../components/UsageLimitBanner';
import { StatsSummaryBar } from '../components/ui/StatsSummaryBar';
import { useInvoices } from '../hooks/useInvoices';
import { useEntitlements } from '../hooks/useEntitlements';
import { Invoice } from '../types/invoice';
import { downloadInvoiceHTML, printInvoice } from '../utils/generateInvoicePDF';
import { formatCurrency as formatCurrencyUtil } from '../utils/format';
import { dateRangeToStrings } from '../lib/dateRangeUtils';
import { useDateRange } from '../hooks/useDateRange';
import { DateRangeFilter } from '../components/DateRangeFilter';
import { confirmDialog, showAlert } from '../lib/dialog';
import { useInvoiceSettings } from '../hooks/useInvoiceSettings';
import { usePaymentMethodDetails } from '../hooks/usePaymentMethodDetails';
import { useUserId } from '../hooks/useCurrentUser';
import { colors } from '../styles/theme';

type ViewMode = 'list' | 'create' | 'edit' | 'view' | 'settings';

interface InvoicesScreenProps {
  onNavigateToAccount?: () => void;
  onNavigateToSubscription?: () => void;
}

const T = {
  bg: colors.surface.canvas,
  surfacePanel: colors.surface.DEFAULT,
  surface: colors.surface.elevated,
  border: colors.border.DEFAULT,
  borderMuted: colors.border.muted,
  textPrimary: colors.text.DEFAULT,
  textSecondary: colors.text.muted,
  textMuted: colors.text.subtle,
  textOnBrand: colors.brand.foreground,
  green: colors.success.DEFAULT,
  amber: colors.warning.DEFAULT,
  red: colors.danger.DEFAULT,
  redLight: colors.danger.muted,
  accent: colors.brand.DEFAULT,
};

export function InvoicesScreen({ onNavigateToAccount, onNavigateToSubscription }: InvoicesScreenProps = {}) {
  const userId = useUserId();
  const { settings, loading: settingsLoading, error: settingsError } = useInvoiceSettings();
  const { data: paymentMethods = [], error: paymentMethodsError } = usePaymentMethodDetails(userId || undefined);
  const { range: dateRange, customStart, customEnd, setRange, setCustomRange } = useDateRange();

  const queryDateRange = dateRange ? dateRangeToStrings(dateRange, customStart, customEnd) : null;
  const {
    invoices,
    loading: invoicesLoading,
    error: invoicesError,
    deleteInvoice,
    deletePayment,
    refetch: refetchInvoices,
  } = useInvoices(
    queryDateRange
      ? {
          startDate: queryDateRange.startDate,
          endDate: queryDateRange.endDate,
        }
      : undefined
  );

  const entitlements = useEntitlements();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [duplicatingInvoice, setDuplicatingInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPaywallModal, setShowPaywallModal] = useState(false);
  const [paywallReason, setPaywallReason] = useState<'invoice_limit' | 'export_limit'>('invoice_limit');

  const selectedInvoice = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId]
  );

  const invoiceMetrics = useMemo(() => {
    if (invoicesLoading) {
      return null;
    }

    const unpaidInvoices = invoices.filter((invoice) => !['paid', 'cancelled'].includes(invoice.status));
    const totalOutstanding = unpaidInvoices.reduce(
      (sum, invoice) => sum + (invoice.balance_due ?? invoice.total_amount),
      0
    );

    const overdueInvoices = invoices.filter((invoice) => invoice.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce(
      (sum, invoice) => sum + (invoice.balance_due ?? invoice.total_amount),
      0
    );

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const totalPaidThisMonth = invoices
      .filter((invoice) => invoice.status === 'paid' && invoice.paid_at && new Date(invoice.paid_at) >= thisMonth)
      .reduce((sum, invoice) => sum + invoice.total_amount, 0);

    return {
      totalOutstanding,
      overdueAmount,
      totalPaidThisMonth,
    };
  }, [invoices, invoicesLoading]);

  const formatSummaryCurrency = (amount: number) => formatCurrencyUtil(amount).replace(/\.00$/, '');
  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  const handleUpgradeClick = () => {
    if (onNavigateToSubscription) {
      onNavigateToSubscription();
      return;
    }

    if (Platform.OS === 'web') {
      const currentUrl = new URL(window.location.href);
      currentUrl.searchParams.set('tab', 'subscription');
      window.history.pushState({}, '', currentUrl.toString());
      window.dispatchEvent(new CustomEvent('tabChange', { detail: 'subscription' }));
    }
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoiceId(invoice.id);
    setViewMode('view');
  };

  const handleCreateNew = async () => {
    try {
      if (!settings) {
        const shouldSetup = await confirmDialog(
          'Setup Required',
          'Please set up your business information before creating invoices.\n\nWould you like to set up now?'
        );

        if (shouldSetup) {
          setViewMode('settings');
        }

        return;
      }

      if (entitlements.isLoading) {
        showAlert('Loading', 'Checking your plan limits. Please try again in a moment.');
        return;
      }

      if (!entitlements.can.createInvoice) {
        setPaywallReason('invoice_limit');
        setShowPaywallModal(true);
        return;
      }

      setSelectedInvoiceId(null);
      setDuplicatingInvoice(null);
      setViewMode('create');
    } catch (error) {
      console.error('Error starting invoice creation', error);
      showAlert('Error', "Couldn't start a new invoice. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!selectedInvoice) {
      return;
    }

    const confirmed = await confirmDialog(
      'Delete Invoice',
      `Are you sure you want to delete invoice ${selectedInvoice.invoice_number}? This action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteInvoice(selectedInvoice.id);
      setViewMode('list');
      setSelectedInvoiceId(null);
      showAlert('Success', 'Invoice deleted successfully');
    } catch (error) {
      console.error('Delete failed', error);
      showAlert('Error', 'Failed to delete invoice');
    }
  };

  const handleDownload = () => {
    if (Platform.OS !== 'web') {
      showAlert('Web only', 'Downloading invoice files is currently available on web.');
      return;
    }

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
    if (Platform.OS !== 'web') {
      showAlert('Web only', 'Printing invoices is currently available on web.');
      return;
    }

    if (selectedInvoice && settings) {
      printInvoice(selectedInvoice, settings, paymentMethods);
    }
  };

  const handleEmailSuccess = async () => {
    await refetchInvoices();
    setShowEmailModal(false);
    showAlert('Success', 'Invoice sent successfully');
  };

  const handleFormSuccess = () => {
    setViewMode('list');
    setSelectedInvoiceId(null);
    setDuplicatingInvoice(null);
  };

  const handlePaymentSuccess = () => {
    void refetchInvoices();
    setShowPaymentModal(false);
    setViewMode('list');
    setSelectedInvoiceId(null);
  };

  const handleDeletePayment = async (paymentId: string) => {
    try {
      await deletePayment(paymentId);
      setViewMode('list');
      setSelectedInvoiceId(null);
      showAlert('Success', 'Payment deleted successfully. Invoice status updated.');
    } catch (error: unknown) {
      showAlert('Error', getErrorMessage(error, 'Failed to delete payment'));
    }
  };

  if (settingsLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingTitle}>Loading invoices</Text>
        <Text style={styles.loadingSubtext}>Fetching your invoice settings and payment details.</Text>
      </View>
    );
  }

  if (settingsError || paymentMethodsError || invoicesError) {
    const message = (settingsError as Error | undefined)?.message
      ?? (paymentMethodsError as Error | undefined)?.message
      ?? (invoicesError as Error | undefined)?.message
      ?? 'Failed to load invoices';

    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorTitle}>Error loading invoices</Text>
        <Text style={styles.errorMessage}>{message}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {viewMode === 'list' && (
        <>
          <StatsSummaryBar
            items={[
              { label: 'TOTAL INVOICES', value: invoicesLoading ? '...' : invoices.length },
              {
                label: 'OUTSTANDING',
                value: invoiceMetrics ? formatSummaryCurrency(invoiceMetrics.totalOutstanding) : '...',
                valueColor: invoiceMetrics && invoiceMetrics.totalOutstanding > 0 ? T.amber : undefined,
              },
              {
                label: 'PAID THIS MONTH',
                value: invoiceMetrics ? formatSummaryCurrency(invoiceMetrics.totalPaidThisMonth) : '...',
                valueColor: invoiceMetrics && invoiceMetrics.totalPaidThisMonth > 0 ? T.green : undefined,
              },
            ]}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ALL INVOICES</Text>
            <View style={styles.headerActions}>
              <DateRangeFilter
                selected={dateRange}
                onSelect={setRange}
                customStart={customStart}
                customEnd={customEnd}
                onCustomRangeChange={setCustomRange}
              />
              <TouchableOpacity style={styles.btnGhost} onPress={() => setViewMode('settings')}>
                <Text style={styles.btnGhostText}>Settings</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnPrimary} onPress={handleCreateNew}>
                <Text style={styles.btnPrimaryText}>+ Invoice</Text>
              </TouchableOpacity>
            </View>
          </View>

          {!entitlements.isPro && entitlements.usage.invoicesCreatedCount !== undefined ? (
            <View style={styles.bannerWrapper}>
              <UsageLimitBanner
                label="invoices"
                usedCount={entitlements.usage.invoicesCreatedCount}
                limitCount={entitlements.limits.invoicesMax ?? 0}
                onUpgradePress={handleUpgradeClick}
              />
            </View>
          ) : null}

          <View style={styles.contentArea}>
            <InvoiceList
              invoices={invoices}
              loading={invoicesLoading}
              onSelectInvoice={handleSelectInvoice}
              onCreateNew={handleCreateNew}
            />
          </View>
        </>
      )}

      {viewMode === 'create' && (
        <>
          <View style={styles.detailHeader}>
            <TouchableOpacity
              onPress={() => {
                setViewMode('list');
                setDuplicatingInvoice(null);
              }}
            >
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>
              {duplicatingInvoice ? 'Repeat Invoice (Draft)' : 'Create Invoice'}
            </Text>
            <View style={styles.detailSpacer} />
          </View>
          <View style={styles.detailContent}>
            <InvoiceForm
              onSuccess={handleFormSuccess}
              onCancel={() => {
                setViewMode('list');
                setDuplicatingInvoice(null);
              }}
              onNavigateToAccount={onNavigateToAccount}
              duplicatingInvoice={duplicatingInvoice}
            />
          </View>
        </>
      )}

      {viewMode === 'edit' && selectedInvoice && (
        <>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setViewMode('view')}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Edit Invoice</Text>
            <View style={styles.detailSpacer} />
          </View>
          <View style={styles.detailContent}>
            <InvoiceForm
              invoiceId={selectedInvoice.id}
              onSuccess={handleFormSuccess}
              onCancel={() => setViewMode('view')}
              onNavigateToAccount={onNavigateToAccount}
            />
          </View>
        </>
      )}

      {viewMode === 'view' && selectedInvoice && settings && (
        <>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>{selectedInvoice.invoice_number}</Text>
            <View style={styles.detailSpacer} />
          </View>

          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.actionButton} onPress={() => setShowEmailModal(true)}>
              <Text style={styles.actionButtonText}>Email</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
              <Text style={styles.actionButtonText}>Export HTML</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>

            {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => setShowPaymentModal(true)}>
                <Text style={styles.actionButtonText}>Record Payment</Text>
              </TouchableOpacity>
            ) : null}

            {selectedInvoice.status === 'draft' ? (
              <TouchableOpacity style={styles.actionButton} onPress={() => setViewMode('edit')}>
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => {
                setDuplicatingInvoice(selectedInvoice);
                setViewMode('create');
              }}
            >
              <Text style={styles.actionButtonText}>Repeat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDelete}>
              <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailContent}>
            <InvoiceTemplate
              invoice={selectedInvoice}
              settings={settings}
              paymentMethodDetails={paymentMethods}
              onDeletePayment={handleDeletePayment}
            />
          </View>
        </>
      )}

      {viewMode === 'settings' && (
        <>
          <View style={styles.detailHeader}>
            <TouchableOpacity onPress={() => setViewMode('list')}>
              <Text style={styles.backButton}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.detailTitle}>Invoice Settings</Text>
            <View style={styles.detailSpacer} />
          </View>
          <View style={styles.detailContent}>
            <InvoiceSettings onSuccess={() => setViewMode('list')} />
          </View>
        </>
      )}

      {showPaymentModal && selectedInvoice ? (
        <RecordPaymentModal
          invoice={selectedInvoice}
          visible={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={handlePaymentSuccess}
        />
      ) : null}

      {showEmailModal && selectedInvoice ? (
        <SendInvoiceModal
          invoice={selectedInvoice}
          visible={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          onSuccess={handleEmailSuccess}
        />
      ) : null}

      {showPaywallModal ? (
        <PaywallModal
          visible={showPaywallModal}
          reason={paywallReason}
          onClose={() => setShowPaywallModal(false)}
          onUpgrade={() => {
            setShowPaywallModal(false);
            handleUpgradeClick();
          }}
          remainingCount={paywallReason === 'invoice_limit' ? entitlements.remaining.invoicesRemaining ?? undefined : undefined}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: T.bg,
    paddingHorizontal: 24,
    gap: 8,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
  },
  loadingSubtext: {
    fontSize: 14,
    color: T.textMuted,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: T.red,
  },
  errorMessage: {
    fontSize: 14,
    color: T.textMuted,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
    letterSpacing: 0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnGhost: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textPrimary,
  },
  btnPrimary: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: T.accent,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textOnBrand,
  },
  bannerWrapper: {
    marginHorizontal: 10,
    marginBottom: 12,
  },
  contentArea: {
    flex: 1,
    marginHorizontal: 10,
    marginBottom: 12,
    backgroundColor: T.surfacePanel,
    borderWidth: 1,
    borderColor: T.borderMuted,
    borderRadius: 16,
    overflow: 'hidden',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: T.surfacePanel,
    borderBottomWidth: 1,
    borderBottomColor: T.borderMuted,
  },
  detailTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
  },
  backButton: {
    fontSize: 15,
    fontWeight: '600',
    color: T.accent,
  },
  detailSpacer: {
    width: 56,
  },
  actionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.surfacePanel,
    borderBottomWidth: 1,
    borderBottomColor: T.borderMuted,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: T.accent,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textOnBrand,
  },
  deleteButton: {
    backgroundColor: T.redLight,
  },
  deleteButtonText: {
    color: T.red,
  },
  detailContent: {
    flex: 1,
    minHeight: 0,
  },
});
