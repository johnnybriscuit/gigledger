import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useInvoices } from '../hooks/useInvoices';
import { formatCurrency } from '../types/invoice';
import { colors } from '../styles/theme';

interface InvoiceDashboardWidgetProps {
  onNavigateToInvoices?: () => void;
}

export function InvoiceDashboardWidget({ onNavigateToInvoices }: InvoiceDashboardWidgetProps) {
  const { invoices, loading } = useInvoices();

  const metrics = useMemo(() => {
    const unpaidInvoices = invoices.filter(inv => 
      inv.status !== 'paid' && inv.status !== 'cancelled' && inv.status !== 'draft'
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

    const recentInvoices = invoices
      .filter(inv => inv.status !== 'cancelled')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 3);

    return {
      totalOutstanding,
      overdueAmount,
      totalPaidThisMonth,
      unpaidCount: unpaidInvoices.length,
      overdueCount: overdueInvoices.length,
      recentInvoices
    };
  }, [invoices]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoices</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.brand.DEFAULT} />
        </View>
      </View>
    );
  }

  if (invoices.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Invoices</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No invoices yet</Text>
          <TouchableOpacity style={styles.createButton} onPress={onNavigateToInvoices}>
            <Text style={styles.createButtonText}>Create Invoice</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Invoices</Text>
        <TouchableOpacity onPress={onNavigateToInvoices}>
          <Text style={styles.viewAllButton}>View All →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Outstanding</Text>
          <Text style={styles.metricValue}>{formatCurrency(metrics.totalOutstanding)}</Text>
          <Text style={styles.metricSubtext}>{metrics.unpaidCount} invoices</Text>
        </View>

        {metrics.overdueCount > 0 && (
          <View style={[styles.metricCard, styles.overdueCard]}>
            <Text style={styles.metricLabel}>Overdue</Text>
            <Text style={[styles.metricValue, styles.overdueValue]}>
              {formatCurrency(metrics.overdueAmount)}
            </Text>
            <Text style={styles.metricSubtext}>{metrics.overdueCount} invoices</Text>
          </View>
        )}

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Paid This Month</Text>
          <Text style={[styles.metricValue, styles.paidValue]}>
            {formatCurrency(metrics.totalPaidThisMonth)}
          </Text>
        </View>
      </View>

      {metrics.recentInvoices.length > 0 && (
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Invoices</Text>
          {metrics.recentInvoices.map((invoice) => (
            <View key={invoice.id} style={styles.invoiceRow}>
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceNumber}>{invoice.invoice_number}</Text>
                <Text style={styles.clientName}>{invoice.client_name}</Text>
              </View>
              <View style={styles.invoiceRight}>
                <Text style={styles.invoiceAmount}>
                  {formatCurrency(invoice.total_amount)}
                </Text>
                <View style={[styles.statusBadge, getStatusStyle(invoice.status)]}>
                  <Text style={[styles.statusText, getStatusTextStyle(invoice.status)]}>
                    {getStatusLabel(invoice.status)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.viewAllFullButton} onPress={onNavigateToInvoices}>
        <Text style={styles.viewAllFullButtonText}>View All Invoices</Text>
      </TouchableOpacity>
    </View>
  );
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Draft',
    sent: 'Sent',
    viewed: 'Viewed',
    partially_paid: 'Partial',
    paid: 'Paid',
    overdue: 'Overdue',
    cancelled: 'Cancelled'
  };
  return labels[status] || status;
}

function getStatusStyle(status: string) {
  const styles: Record<string, any> = {
    draft: { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' },
    sent: { backgroundColor: '#dbeafe', borderColor: '#2563eb' },
    viewed: { backgroundColor: '#ede9fe', borderColor: '#7c3aed' },
    partially_paid: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
    paid: { backgroundColor: '#d1fae5', borderColor: '#059669' },
    overdue: { backgroundColor: '#fee2e2', borderColor: '#dc2626' },
    cancelled: { backgroundColor: '#f3f4f6', borderColor: '#9ca3af' }
  };
  return styles[status] || styles.draft;
}

function getStatusTextStyle(status: string) {
  const styles: Record<string, any> = {
    draft: { color: '#4b5563' },
    sent: { color: '#1e40af' },
    viewed: { color: '#6d28d9' },
    partially_paid: { color: '#d97706' },
    paid: { color: '#047857' },
    overdue: { color: '#b91c1c' },
    cancelled: { color: '#4b5563' }
  };
  return styles[status] || styles.draft;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface.DEFAULT,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.DEFAULT,
  },
  viewAllButton: {
    fontSize: 14,
    color: colors.brand.DEFAULT,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted,
    marginBottom: 12,
  },
  createButton: {
    backgroundColor: colors.brand.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  createButtonText: {
    color: colors.brand.foreground,
    fontSize: 14,
    fontWeight: '600',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    minWidth: 100,
    backgroundColor: colors.surface.muted,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.DEFAULT,
  },
  overdueCard: {
    backgroundColor: colors.danger.muted,
    borderColor: colors.danger.DEFAULT,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.text.muted,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.DEFAULT,
    marginBottom: 2,
  },
  overdueValue: {
    color: colors.danger.DEFAULT,
  },
  paidValue: {
    color: colors.success.DEFAULT,
  },
  metricSubtext: {
    fontSize: 10,
    color: colors.text.subtle,
  },
  recentSection: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.muted,
    marginBottom: 8,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.muted,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    marginBottom: 2,
  },
  clientName: {
    fontSize: 12,
    color: colors.text.muted,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.DEFAULT,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  viewAllFullButton: {
    backgroundColor: colors.surface.muted,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewAllFullButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted,
  },
});
