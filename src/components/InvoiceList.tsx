import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, useWindowDimensions, Platform } from 'react-native';
import { Invoice, InvoiceStatus, getStatusColor, getStatusLabel, formatCurrency } from '../types/invoice';
import { OnboardingHelperCard } from './OnboardingHelperCard';

// Design tokens
const T = {
  bg: '#F5F4F0',
  surface: '#FFFFFF',
  surface2: '#EEECEA',
  border: '#E5E3DE',
  textPrimary: '#1A1A1A',
  textSecondary: '#7A7671',
  textMuted: '#B0ADA8',
  green: '#1D9B5E',
  greenLight: '#E8F7F0',
  red: '#DC2626',
  redLight: '#FEE2E2',
  accent: '#2D5BE3',
  accentLight: '#EEF2FF',
  mono: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
};

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  onSelectInvoice?: (invoice: Invoice) => void;
  onCreateNew?: () => void;
  onOpenSettings?: () => void;
}

export function InvoiceList({ invoices, loading, onSelectInvoice, onCreateNew, onOpenSettings }: InvoiceListProps) {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'due_date'>('date');
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;

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
    switch (status) {
      case 'draft': return { backgroundColor: T.surface2, borderColor: T.border };
      case 'sent': case 'viewed': return { backgroundColor: T.accentLight, borderColor: T.accent };
      case 'overdue': return { backgroundColor: T.redLight, borderColor: T.red };
      case 'paid': return { backgroundColor: T.greenLight, borderColor: T.green };
      case 'partially_paid': return { backgroundColor: T.accentLight, borderColor: T.accent };
      default: return { backgroundColor: T.surface2, borderColor: T.border };
    }
  };

  const getStatusTextColor = (status: InvoiceStatus): string => {
    switch (status) {
      case 'draft': return T.textMuted;
      case 'sent': case 'viewed': return T.accent;
      case 'overdue': return T.red;
      case 'paid': return T.green;
      case 'partially_paid': return T.accent;
      default: return T.textMuted;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {/* Loading skeleton */}
        <View style={styles.metricsRow}>
          <View style={[styles.metricCard, styles.skeletonCard]}>
            <View style={[styles.skeletonText, { width: 100, height: 14 }]} />
            <View style={[styles.skeletonText, { width: 80, height: 24, marginTop: 8 }]} />
          </View>
          <View style={[styles.metricCard, styles.skeletonCard]}>
            <View style={[styles.skeletonText, { width: 80, height: 14 }]} />
            <View style={[styles.skeletonText, { width: 70, height: 24, marginTop: 8 }]} />
          </View>
          <View style={[styles.metricCard, styles.skeletonCard]}>
            <View style={[styles.skeletonText, { width: 90, height: 14 }]} />
            <View style={[styles.skeletonText, { width: 75, height: 24, marginTop: 8 }]} />
          </View>
        </View>
        
        {/* Skeleton invoice cards */}
        {[1, 2, 3].map((i) => (
          <View key={i} style={[styles.invoiceCard, styles.skeletonCard]}>
            <View style={styles.invoiceCardHeader}>
              <View style={[styles.skeletonText, { width: 120, height: 18 }]} />
              <View style={[styles.skeletonText, { width: 60, height: 24, borderRadius: 12 }]} />
            </View>
            <View style={[styles.skeletonText, { width: 150, height: 14, marginTop: 8 }]} />
            <View style={styles.invoiceCardFooter}>
              <View style={[styles.skeletonText, { width: 80, height: 14 }]} />
              <View style={[styles.skeletonText, { width: 90, height: 20 }]} />
            </View>
          </View>
        ))}
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
              💡 <Text style={styles.reminderBold}>Tip:</Text> Configure payment methods in <Text style={styles.reminderBold}>Settings</Text> to include payment instructions on invoices.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const formatAmount = (amount: number) => {
    const formatted = formatCurrency(amount);
    return formatted.replace(/\.00$/, '');
  };

  const formatDateShort = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <View style={styles.container}>
      {/* Stats card */}
      <View style={isMobile ? styles.statsCardMobile : styles.compactMetricsStrip}>
        <View style={styles.statCol}>
          <Text style={isMobile ? styles.statLabelMobile : styles.compactMetricLabel}>Outstanding</Text>
          <Text style={[isMobile ? styles.statValueMobile : styles.compactMetricValue]}>
            {formatAmount(metrics.totalOutstanding)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.statCol}>
          <Text style={isMobile ? styles.statLabelMobile : styles.compactMetricLabel}>Overdue</Text>
          <Text style={[isMobile ? styles.statValueMobile : styles.compactMetricValue, styles.statDanger]}>
            {formatAmount(metrics.overdueAmount)}
          </Text>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.statCol}>
          <Text style={isMobile ? styles.statLabelMobile : styles.compactMetricLabel}>Paid This Month</Text>
          <Text style={[isMobile ? styles.statValueMobile : styles.compactMetricValue, styles.statSuccess]}>
            {formatAmount(metrics.totalPaidThisMonth)}
          </Text>
        </View>
      </View>

      {/* Section header row — mobile only */}
      {isMobile && (
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>ALL INVOICES</Text>
          <View style={styles.sectionHeaderActions}>
            <TouchableOpacity style={styles.btnGhost} onPress={onOpenSettings}>
              <Text style={styles.btnGhostText}>Edit Template</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnPrimary} onPress={onCreateNew}>
              <Text style={styles.btnPrimaryText}>+ Create Invoice</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search + sort row */}
      <View style={[styles.searchSortRow, isMobile && styles.searchSortRowMobile]}>
        <TextInput
          style={isMobile ? styles.searchInputMobile : styles.compactSearchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search invoices..."
          placeholderTextColor={T.textMuted}
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

      {/* Status filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.compactFilterContainer}
        contentContainerStyle={styles.compactFilterContent}
      >
        {([
          { key: 'all', label: `All (${statusCounts.all})` },
          { key: 'sent', label: `Sent (${statusCounts.sent})` },
          { key: 'overdue', label: `Overdue (${statusCounts.overdue})` },
          { key: 'paid', label: `Paid (${statusCounts.paid})` },
          { key: 'draft', label: `Draft (${statusCounts.draft})` },
        ] as const).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.compactPill, statusFilter === key && styles.compactPillActive]}
            onPress={() => setStatusFilter(key)}
          >
            <Text style={[styles.compactPillText, statusFilter === key && styles.compactPillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Invoice list */}
      <View style={styles.listWrapper}>
        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={isMobile ? styles.listContentContainerMobile : styles.listContentContainer}
        >
          {filteredInvoices.length === 0 ? (
            isEmpty && statusFilter === 'all' && !searchQuery ? (
              <View style={{ padding: 20 }}>
                <OnboardingHelperCard
                  icon="🧾"
                  title="Create your first invoice"
                  description="Send professional invoices to clients and track payments easily."
                  actionLabel="Create Invoice"
                  onAction={onCreateNew || (() => {})}
                />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No invoices found</Text>
              </View>
            )
          ) : (
            filteredInvoices.map((invoice) => (
              isMobile ? (
                <TouchableOpacity
                  key={invoice.id}
                  style={styles.invoiceCardMobile}
                  onPress={() => onSelectInvoice?.(invoice)}
                  activeOpacity={0.75}
                >
                  {/* Top section */}
                  <View style={styles.cardTopRow}>
                    <View style={styles.cardLeft}>
                      <Text style={styles.cardInvoiceNumber}>{invoice.invoice_number}</Text>
                      <Text style={styles.cardClientName} numberOfLines={1}>{invoice.client_name}</Text>
                      {invoice.client_company && (
                        <Text style={styles.cardBandName}>{invoice.client_company}</Text>
                      )}
                    </View>
                    <View style={styles.cardRight}>
                      <Text style={styles.cardAmount}>{formatAmount(invoice.total_amount)}</Text>
                      <View style={[styles.cardStatusBadge, getStatusBadgeStyle(invoice.status)]}>
                        <Text style={[styles.cardStatusText, { color: getStatusTextColor(invoice.status) }]}>
                          {getStatusLabel(invoice.status).toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Divider */}
                  <View style={styles.cardDivider} />

                  {/* Date rows */}
                  <View style={styles.cardDates}>
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>Invoice Date</Text>
                      <Text style={styles.dateValue}>{formatDateShort(invoice.invoice_date)}</Text>
                    </View>
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>Due Date</Text>
                      <Text style={styles.dateValue}>{formatDateShort(invoice.due_date)}</Text>
                    </View>
                    {invoice.balance_due !== undefined && invoice.balance_due > 0 && invoice.status !== 'paid' && (
                      <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>Balance Due</Text>
                        <Text style={[styles.dateValue, styles.balanceDueValue]}>
                          {formatAmount(invoice.balance_due)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ) : (
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
                      <Text style={[styles.detailValue, invoice.status === 'overdue' && styles.detailValueOverdue]}>
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
              )
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
    backgroundColor: T.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Stats card ──────────────────────────────────────────
  statsCardMobile: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 20,
    marginHorizontal: 10,
    marginBottom: 16,
    padding: 18,
  },
  compactMetricsStrip: {
    flexDirection: 'row',
    backgroundColor: T.surface,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 8,
    marginHorizontal: 10,
    marginBottom: 12,
    padding: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statLabelMobile: {
    fontSize: 11,
    fontWeight: '600',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
    textAlign: 'center',
  },
  statValueMobile: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textPrimary,
  },
  statDanger: { color: T.red },
  statSuccess: { color: T.green },
  compactMetric: {
    flex: 1,
    alignItems: 'center',
  },
  compactMetricLabel: {
    fontSize: 11,
    color: T.textMuted,
    marginBottom: 4,
    textAlign: 'center',
  },
  compactMetricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
  },
  metricDivider: {
    width: 1,
    backgroundColor: T.border,
    marginHorizontal: 8,
  },

  // ── Section header row ────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 14,
  },
  sectionHeaderLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  sectionHeaderActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  btnGhost: {
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnGhostText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
  },
  btnPrimary: {
    backgroundColor: T.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  btnPrimaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.surface,
  },

  // ── Search + sort ──────────────────────────────────────
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  searchSortRowMobile: {
    marginTop: 14,
  },
  compactSearchInput: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    padding: 9,
    fontSize: 14,
    color: T.textPrimary,
  },
  searchInputMobile: {
    flex: 1,
    backgroundColor: T.surface,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: T.textPrimary,
  },
  sortDropdown: {
    flexDirection: 'row',
    gap: 4,
  },
  sortOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  sortOptionActive: {
    backgroundColor: T.accentLight,
    borderColor: T.accent,
  },
  sortOptionText: {
    fontSize: 13,
    color: T.textSecondary,
    fontWeight: '600',
  },
  sortOptionTextActive: {
    color: T.accent,
    fontWeight: '600',
  },

  // ── Filter pills ────────────────────────────────────────
  compactFilterContainer: {
    paddingHorizontal: 10,
    marginBottom: 12,
    maxHeight: 44,
  },
  compactFilterContent: {
    paddingRight: 16,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  compactPillActive: {
    backgroundColor: T.textPrimary,
    borderColor: T.textPrimary,
  },
  compactPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
  },
  compactPillTextActive: {
    color: T.surface,
    fontWeight: '600',
  },

  // ── List ────────────────────────────────────────────────
  listWrapper: {
    flex: 1,
    minHeight: 0,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContentContainer: {
    paddingBottom: 24,
  },
  listContentContainerMobile: {
    paddingBottom: 32,
    gap: 10,
  },

  // ── Invoice card — mobile ────────────────────────────────
  invoiceCardMobile: {
    backgroundColor: T.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    overflow: 'hidden',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  cardLeft: {
    flex: 1,
    minWidth: 0,
  },
  cardInvoiceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    marginBottom: 4,
  },
  cardClientName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
  },
  cardBandName: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: T.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  cardStatusBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 0,
  },
  cardStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardDivider: {
    height: 1,
    backgroundColor: T.border,
    marginHorizontal: 10,
  },
  cardDates: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 13,
    color: T.textSecondary,
    lineHeight: 22,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: T.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    lineHeight: 22,
  },
  balanceDueValue: {
    color: T.accent,
    fontWeight: '700',
  },

  // ── Invoice card — desktop ───────────────────────────────
  invoiceCard: {
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: T.textPrimary,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 15,
    color: T.textPrimary,
    marginBottom: 2,
  },
  clientCompany: {
    fontSize: 13,
    color: T.textSecondary,
  },
  invoiceHeaderRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: T.textPrimary,
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
    borderTopColor: T.border,
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: {
    fontSize: 13,
    color: T.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    color: T.textPrimary,
    fontWeight: '500',
  },
  detailValueOverdue: {
    color: T.red,
    fontWeight: '600',
  },
  balanceDue: {
    color: T.accent,
    fontWeight: '600',
  },

  // ── Empty states ──────────────────────────────────────────
  emptyStateHero: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingTop: 80,
    paddingBottom: 40,
  },
  emptyStateHeroMobile: {
    paddingHorizontal: 10,
    paddingTop: 60,
  },
  emptyStateTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: T.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyStateTitleMobile: {
    fontSize: 24,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    color: T.textSecondary,
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
    backgroundColor: T.accent,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 8,
  },
  emptyStateCTAMobile: {
    width: '100%',
    maxWidth: 400,
  },
  emptyStateCTAText: {
    color: T.surface,
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
    color: T.textSecondary,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: T.accent,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: T.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  reminderBox: {
    backgroundColor: T.accentLight,
    borderWidth: 1,
    borderColor: T.accent,
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  reminderText: {
    fontSize: 14,
    color: T.accent,
    lineHeight: 20,
  },
  reminderBold: {
    fontWeight: '600',
  },

  // ── Skeleton ───────────────────────────────────────────────
  skeletonCard: {
    opacity: 0.6,
  },
  skeletonText: {
    backgroundColor: T.border,
    borderRadius: 4,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    flex: 1,
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  invoiceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
});
