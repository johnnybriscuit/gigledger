import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, useWindowDimensions, Platform } from 'react-native';
import { useInvoices } from '../hooks/useInvoices';
import { Invoice, InvoiceStatus, getStatusColor, getStatusLabel, formatCurrency } from '../types/invoice';

interface InvoiceListProps {
  onSelectInvoice?: (invoice: Invoice) => void;
  onCreateNew?: () => void;
}

export function InvoiceList({ onSelectInvoice, onCreateNew }: InvoiceListProps) {
  const { invoices, loading } = useInvoices();
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'due_date'>('date');
  const [tipDismissed, setTipDismissed] = useState(false);
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS === 'web' && width < 768;

  const isEmpty = invoices.length === 0;

  const filteredInvoices = useMemo(() => {
    let filtered = invoices;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.invoice_number.toLowerCase().includes(query) ||
        inv.client_name.toLowerCase().includes(query) ||
        inv.client_company?.toLowerCase().includes(query)
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.total_amount - a.total_amount;
        case 'due_date':
          return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        case 'date':
        default:
          return new Date(b.invoice_date).getTime() - new Date(a.invoice_date).getTime();
      }
    });

    return filtered;
  }, [invoices, statusFilter, searchQuery, sortBy]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: invoices.length,
      draft: 0,
      sent: 0,
      viewed: 0,
      partially_paid: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0
    };

    invoices.forEach(inv => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });

    return counts;
  }, [invoices]);

  const metrics = useMemo(() => {
    const unpaidInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && inv.status !== 'cancelled'
    );
    const totalOutstanding = unpaidInvoices.reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount), 0);
    
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
    const overdueAmount = overdueInvoices.reduce((sum, inv) => sum + (inv.balance_due || inv.total_amount), 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const paidThisMonth = invoices.filter(inv => 
      inv.status === 'paid' && 
      inv.paid_at && 
      new Date(inv.paid_at) >= thisMonth
    );
    const totalPaidThisMonth = paidThisMonth.reduce((sum, inv) => sum + inv.total_amount, 0);

    return {
      totalOutstanding,
      overdueAmount,
      totalPaidThisMonth,
    };
  }, [invoices]);

  const getStatusBadgeStyle = (status: InvoiceStatus) => {
    const color = getStatusColor(status);
    return {
      backgroundColor: `${color === 'gray' ? '#f3f4f6' : 
        color === 'blue' ? '#dbeafe' :
        color === 'purple' ? '#ede9fe' :
        color === 'yellow' ? '#fef3c7' :
        color === 'green' ? '#d1fae5' :
        color === 'red' ? '#fee2e2' : '#f3f4f6'}`,
      borderColor: `${color === 'gray' ? '#9ca3af' :
        color === 'blue' ? '#2563eb' :
        color === 'purple' ? '#7c3aed' :
        color === 'yellow' ? '#f59e0b' :
        color === 'green' ? '#059669' :
        color === 'red' ? '#dc2626' : '#9ca3af'}`
    };
  };

  const getStatusTextColor = (status: InvoiceStatus) => {
    const color = getStatusColor(status);
    return color === 'gray' ? '#4b5563' :
      color === 'blue' ? '#1e40af' :
      color === 'purple' ? '#6d28d9' :
      color === 'yellow' ? '#d97706' :
      color === 'green' ? '#047857' :
      color === 'red' ? '#b91c1c' : '#4b5563';
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.container}>
        <View style={[styles.emptyStateHero, isMobile && styles.emptyStateHeroMobile]}>
          <Text style={[styles.emptyStateTitle, isMobile && styles.emptyStateTitleMobile]}>
            Create your first invoice
          </Text>
          <Text style={[styles.emptyStateSubtitle, isMobile && styles.emptyStateSubtitleMobile]}>
            Track payments, send professional invoices, and get paid faster.
          </Text>
          {onCreateNew && (
            <TouchableOpacity 
              style={[styles.emptyStateCTA, isMobile && styles.emptyStateCTAMobile]} 
              onPress={onCreateNew}
            >
              <Text style={styles.emptyStateCTAText}>Create Invoice</Text>
            </TouchableOpacity>
          )}
          <View style={styles.reminderBox}>
            <Text style={styles.reminderText}>
              💡 <Text style={styles.reminderBold}>Tip:</Text> Configure payment methods in <Text style={styles.reminderBold}>Account → Payment Methods</Text> to include payment instructions on invoices.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!tipDismissed && (
        <View style={styles.compactTipBanner}>
          <Text style={styles.compactTipText}>
            💡 Add payment details in <Text style={styles.compactTipBold}>Account → Payment Methods</Text>
          </Text>
          <TouchableOpacity onPress={() => setTipDismissed(true)} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.compactMetricsStrip}>
        <View style={styles.compactMetric}>
          <Text style={styles.compactMetricLabel}>Outstanding</Text>
          <Text style={styles.compactMetricValue}>{formatCurrency(metrics.totalOutstanding)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.compactMetric}>
          <Text style={styles.compactMetricLabel}>Overdue</Text>
          <Text style={[styles.compactMetricValue, styles.compactMetricDanger]}>{formatCurrency(metrics.overdueAmount)}</Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.compactMetric}>
          <Text style={styles.compactMetricLabel}>Paid This Month</Text>
          <Text style={[styles.compactMetricValue, styles.compactMetricSuccess]}>{formatCurrency(metrics.totalPaidThisMonth)}</Text>
        </View>
      </View>

      <View style={styles.searchSortRow}>
        <TextInput
          style={styles.compactSearchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search invoices..."
          placeholderTextColor="#9ca3af"
        />
        <View style={styles.sortDropdown}>
          <TouchableOpacity
            style={[styles.sortOptionButton, sortBy === 'date' && styles.sortOptionActive]}
            onPress={() => setSortBy('date')}
          >
            <Text style={[styles.sortOptionText, sortBy === 'date' && styles.sortOptionTextActive]}>Date</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortOptionButton, sortBy === 'due_date' && styles.sortOptionActive]}
            onPress={() => setSortBy('due_date')}
          >
            <Text style={[styles.sortOptionText, sortBy === 'due_date' && styles.sortOptionTextActive]}>Due</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.sortOptionButton, sortBy === 'amount' && styles.sortOptionActive]}
            onPress={() => setSortBy('amount')}
          >
            <Text style={[styles.sortOptionText, sortBy === 'amount' && styles.sortOptionTextActive]}>Amt</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.compactFilterContainer}
        contentContainerStyle={styles.compactFilterContent}
      >
        <TouchableOpacity
          style={[styles.compactPill, statusFilter === 'all' && styles.compactPillActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.compactPillText, statusFilter === 'all' && styles.compactPillTextActive]}>
            All ({statusCounts.all})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.compactPill, statusFilter === 'sent' && styles.compactPillActive]}
          onPress={() => setStatusFilter('sent')}
        >
          <Text style={[styles.compactPillText, statusFilter === 'sent' && styles.compactPillTextActive]}>
            Sent ({statusCounts.sent})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.compactPill, statusFilter === 'overdue' && styles.compactPillActive]}
          onPress={() => setStatusFilter('overdue')}
        >
          <Text style={[styles.compactPillText, statusFilter === 'overdue' && styles.compactPillTextActive]}>
            Overdue ({statusCounts.overdue})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.compactPill, statusFilter === 'paid' && styles.compactPillActive]}
          onPress={() => setStatusFilter('paid')}
        >
          <Text style={[styles.compactPillText, statusFilter === 'paid' && styles.compactPillTextActive]}>
            Paid ({statusCounts.paid})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.compactPill, statusFilter === 'draft' && styles.compactPillActive]}
          onPress={() => setStatusFilter('draft')}
        >
          <Text style={[styles.compactPillText, statusFilter === 'draft' && styles.compactPillTextActive]}>
            Draft ({statusCounts.draft})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={styles.listWrapper}>
        <ScrollView 
          style={styles.listContainer}
          contentContainerStyle={styles.listContentContainer}
        >
          {filteredInvoices.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No invoices found</Text>
              {onCreateNew && (
                <TouchableOpacity style={styles.createButton} onPress={onCreateNew}>
                  <Text style={styles.createButtonText}>Create Your First Invoice</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredInvoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceCard}
                onPress={() => onSelectInvoice?.(invoice)}
              >
                <View style={styles.invoiceHeader}>
                  <View>
                    <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                    <Text style={styles.clientName}>{invoice.client_name}</Text>
                    {invoice.client_company && (
                      <Text style={styles.clientCompany}>{invoice.client_company}</Text>
                    )}
                  </View>
                  <View style={styles.invoiceHeaderRight}>
                    <Text style={styles.invoiceAmount}>{formatCurrency(invoice.total_amount)}</Text>
                    <View style={[styles.statusBadge, getStatusBadgeStyle(invoice.status)]}>
                      <Text style={[styles.statusText, { color: getStatusTextColor(invoice.status) }]}>
                        {getStatusLabel(invoice.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.invoiceDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice Date:</Text>
                    <Text style={styles.detailValue}>{new Date(invoice.invoice_date).toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
                    <Text style={[
                      styles.detailValue,
                      invoice.status === 'overdue' && styles.detailValueOverdue
                    ]}>
                      {new Date(invoice.due_date).toLocaleDateString()}
                    </Text>
                  </View>
                  {invoice.balance_due !== undefined && invoice.balance_due > 0 && invoice.status !== 'paid' && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Balance Due:</Text>
                      <Text style={[styles.detailValue, styles.balanceDue]}>
                        {formatCurrency(invoice.balance_due)}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactTipBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#eff6ff',
    padding: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 6,
  },
  compactTipText: {
    flex: 1,
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 16,
  },
  compactTipBold: {
    fontWeight: '600',
  },
  dismissButton: {
    padding: 4,
    marginLeft: 8,
  },
  dismissButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  compactMetricsStrip: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
  },
  compactMetric: {
    flex: 1,
    alignItems: 'center',
  },
  compactMetricLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginBottom: 4,
    textAlign: 'center',
  },
  compactMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  compactMetricDanger: {
    color: '#dc2626',
  },
  compactMetricSuccess: {
    color: '#059669',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 8,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  compactSearchInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  sortDropdown: {
    flexDirection: 'row',
    gap: 4,
  },
  sortOptionButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  sortOptionActive: {
    backgroundColor: '#eff6ff',
    borderColor: '#2563eb',
  },
  sortOptionText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  sortOptionTextActive: {
    color: '#2563eb',
    fontWeight: '600',
  },
  compactFilterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
    maxHeight: 40,
  },
  compactFilterContent: {
    paddingRight: 16,
  },
  compactPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginRight: 6,
  },
  compactPillActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  compactPillText: {
    fontSize: 13,
    color: '#374151',
  },
  compactPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listWrapper: {
    flex: 1,
    minHeight: 0,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  listContentContainer: {
    paddingBottom: 24,
  },
  emptyStateHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyStateHeroMobile: {
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  emptyStateTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateTitleMobile: {
    fontSize: 24,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    maxWidth: 500,
    lineHeight: 24,
  },
  emptyStateSubtitleMobile: {
    fontSize: 15,
    marginBottom: 24,
  },
  emptyStateCTA: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  emptyStateCTAMobile: {
    width: '100%',
    maxWidth: 400,
  },
  emptyStateCTAText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  invoiceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    color: '#374151',
    marginBottom: 2,
  },
  clientCompany: {
    fontSize: 13,
    color: '#6b7280',
  },
  invoiceHeaderRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDetails: {
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  detailValue: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  detailValueOverdue: {
    color: '#dc2626',
    fontWeight: '600',
  },
  balanceDue: {
    color: '#2563eb',
    fontWeight: '600',
  },
  reminderBox: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  reminderText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  reminderBold: {
    fontWeight: '600',
  },
});
