import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Invoice, InvoiceStatus, getStatusLabel, formatCurrency } from '../types/invoice';
import { OnboardingHelperCard } from './OnboardingHelperCard';
import { formatStoredDate, parseStoredDate } from '../lib/date';
import { getEffectiveInvoiceStatus } from '../utils/invoiceCalculations';
import { colors } from '../styles/theme';

const T = {
  surface: colors.surface.elevated,
  border: colors.border.DEFAULT,
  textPrimary: colors.text.DEFAULT,
  textSecondary: colors.text.muted,
  textMuted: colors.text.subtle,
  green: colors.success.DEFAULT,
  greenLight: colors.success.muted,
  red: colors.danger.DEFAULT,
  redLight: colors.danger.muted,
  accent: colors.brand.DEFAULT,
  accentLight: colors.brand.muted,
};

interface InvoiceListProps {
  invoices: Invoice[];
  loading: boolean;
  onSelectInvoice?: (invoice: Invoice) => void;
  onCreateNew?: () => void;
}

export function InvoiceList({ invoices, loading, onSelectInvoice, onCreateNew }: InvoiceListProps) {
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'due_date'>('date');
  const { width } = useWindowDimensions();
  const isMobile = Platform.OS !== 'web' || width < 768;

  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const isEmpty = invoices.length === 0;

  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    if (statusFilter !== 'all') {
      filtered = filtered.filter((invoice) => getEffectiveInvoiceStatus(invoice) === statusFilter);
    }

    if (normalizedSearchQuery) {
      filtered = filtered.filter((invoice) =>
        invoice.invoice_number.toLowerCase().includes(normalizedSearchQuery)
        || invoice.client_name.toLowerCase().includes(normalizedSearchQuery)
        || invoice.client_company?.toLowerCase().includes(normalizedSearchQuery)
        || invoice.client_email?.toLowerCase().includes(normalizedSearchQuery)
        || false
      );
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.total_amount - a.total_amount;
        case 'due_date':
          return parseStoredDate(a.due_date).getTime() - parseStoredDate(b.due_date).getTime();
        case 'date':
        default:
          return parseStoredDate(b.invoice_date).getTime() - parseStoredDate(a.invoice_date).getTime();
      }
    });

    return filtered;
  }, [invoices, normalizedSearchQuery, sortBy, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: invoices.length,
      draft: 0,
      sent: 0,
      viewed: 0,
      partially_paid: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    invoices.forEach((invoice) => {
      const status = getEffectiveInvoiceStatus(invoice);
      counts[status] = (counts[status] || 0) + 1;
    });

    return counts;
  }, [invoices]);

  const getStatusBadgeStyle = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
        return { backgroundColor: colors.surface.muted, borderColor: T.border };
      case 'sent':
      case 'viewed':
      case 'partially_paid':
        return { backgroundColor: T.accentLight, borderColor: T.accent };
      case 'overdue':
        return { backgroundColor: T.redLight, borderColor: T.red };
      case 'paid':
        return { backgroundColor: T.greenLight, borderColor: T.green };
      case 'cancelled':
      default:
        return { backgroundColor: colors.surface.muted, borderColor: T.border };
    }
  };

  const getStatusTextColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'draft':
      case 'cancelled':
        return T.textMuted;
      case 'sent':
      case 'viewed':
      case 'partially_paid':
        return T.accent;
      case 'overdue':
        return T.red;
      case 'paid':
        return T.green;
      default:
        return T.textMuted;
    }
  };

  const formatAmount = (amount: number) => formatCurrency(amount).replace(/\.00$/, '');
  const formatDateShort = (dateStr: string) =>
    formatStoredDate(dateStr, 'en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.searchSortRow, isMobile && styles.searchSortRowMobile]}>
          <View style={[styles.skeletonText, styles.searchSkeleton]} />
          <View style={styles.sortSkeletonRow}>
            <View style={[styles.skeletonText, styles.sortSkeleton]} />
            <View style={[styles.skeletonText, styles.sortSkeleton]} />
            <View style={[styles.skeletonText, styles.sortSkeleton]} />
          </View>
        </View>

        <View style={styles.filterSkeletonRow}>
          <View style={[styles.skeletonText, styles.filterSkeleton]} />
          <View style={[styles.skeletonText, styles.filterSkeleton]} />
          <View style={[styles.skeletonText, styles.filterSkeletonWide]} />
        </View>

        <ScrollView
          style={styles.listContainer}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        >
          {[1, 2, 3].map((item) => (
            <View key={item} style={[styles.invoiceCard, styles.skeletonCard]}>
              <View style={styles.cardTopRow}>
                <View style={styles.cardLeft}>
                  <View style={[styles.skeletonText, styles.cardTitleSkeleton]} />
                  <View style={[styles.skeletonText, styles.cardSubtitleSkeleton]} />
                </View>
                <View style={styles.cardRight}>
                  <View style={[styles.skeletonText, styles.cardAmountSkeleton]} />
                  <View style={[styles.skeletonText, styles.cardBadgeSkeleton]} />
                </View>
              </View>
              <View style={styles.cardDivider} />
              <View style={styles.cardDates}>
                <View style={styles.dateRow}>
                  <View style={[styles.skeletonText, styles.dateLabelSkeleton]} />
                  <View style={[styles.skeletonText, styles.dateValueSkeleton]} />
                </View>
                <View style={styles.dateRow}>
                  <View style={[styles.skeletonText, styles.dateLabelSkeleton]} />
                  <View style={[styles.skeletonText, styles.dateValueSkeleton]} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.container}>
        <View style={styles.onboardingCard}>
          <OnboardingHelperCard
            icon="🧾"
            title="Create your first invoice"
            description="Send professional invoices to clients and keep payment tracking in one place."
            actionLabel="Create Invoice"
            onAction={onCreateNew || (() => {})}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.searchSortRow, isMobile && styles.searchSortRowMobile]}>
        <TextInput
          style={[styles.searchInput, isMobile && styles.searchInputMobile]}
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {([
          { key: 'all', label: `All (${statusCounts.all})` },
          { key: 'draft', label: `Draft (${statusCounts.draft})` },
          { key: 'sent', label: `Sent (${statusCounts.sent})` },
          { key: 'viewed', label: `Viewed (${statusCounts.viewed})` },
          { key: 'partially_paid', label: `Partial (${statusCounts.partially_paid})` },
          { key: 'overdue', label: `Overdue (${statusCounts.overdue})` },
          { key: 'paid', label: `Paid (${statusCounts.paid})` },
          { key: 'cancelled', label: `Cancelled (${statusCounts.cancelled})` },
        ] as const).map(({ key, label }) => (
          <TouchableOpacity
            key={key}
            style={[styles.filterPill, statusFilter === key && styles.filterPillActive]}
            onPress={() => setStatusFilter(key)}
          >
            <Text style={[styles.filterPillText, statusFilter === key && styles.filterPillTextActive]}>
              {label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No invoices found</Text>
            <Text style={styles.emptyStateDescription}>Try a different search or status filter.</Text>
          </View>
        ) : (
          filteredInvoices.map((invoice) => {
            const status = getEffectiveInvoiceStatus(invoice);

            return (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceCard}
                onPress={() => onSelectInvoice?.(invoice)}
                activeOpacity={0.8}
              >
                <View style={styles.cardTopRow}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardInvoiceNumber}>{invoice.invoice_number}</Text>
                    <Text style={styles.cardClientName} numberOfLines={1}>
                      {invoice.client_name}
                    </Text>
                    {invoice.client_company ? (
                      <Text style={styles.cardCompany} numberOfLines={1}>
                        {invoice.client_company}
                      </Text>
                    ) : null}
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>{formatAmount(invoice.total_amount)}</Text>
                    <View style={[styles.cardStatusBadge, getStatusBadgeStyle(status)]}>
                      <Text style={[styles.cardStatusText, { color: getStatusTextColor(status) }]}>
                        {getStatusLabel(status).toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardDates}>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Invoice Date</Text>
                    <Text style={styles.dateValue}>{formatDateShort(invoice.invoice_date)}</Text>
                  </View>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Due Date</Text>
                    <Text style={styles.dateValue}>{formatDateShort(invoice.due_date)}</Text>
                  </View>
                  {invoice.balance_due !== undefined && invoice.balance_due > 0 && status !== 'paid' ? (
                    <View style={styles.dateRow}>
                      <Text style={styles.dateLabel}>Balance Due</Text>
                      <Text style={[styles.dateValue, styles.balanceDueValue]}>
                        {formatAmount(invoice.balance_due)}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const monoFont = Platform.OS === 'ios' ? 'Courier New' : 'monospace';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface.DEFAULT,
  },
  onboardingCard: {
    padding: 16,
  },
  searchSortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 10,
  },
  searchSortRowMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  searchInput: {
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
  searchInputMobile: {
    width: '100%',
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
    fontWeight: '600',
    color: T.textSecondary,
  },
  sortOptionTextActive: {
    color: T.accent,
  },
  filterContainer: {
    maxHeight: 46,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingRight: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.surface,
  },
  filterPillActive: {
    backgroundColor: T.textPrimary,
    borderColor: T.textPrimary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: T.textSecondary,
  },
  filterPillTextActive: {
    color: T.surface,
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 10,
  },
  listContentContainer: {
    paddingBottom: 24,
    gap: 10,
  },
  invoiceCard: {
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
  cardRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  cardInvoiceNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: T.textMuted,
    fontFamily: monoFont,
    marginBottom: 4,
  },
  cardClientName: {
    fontSize: 15,
    fontWeight: '700',
    color: T.textPrimary,
  },
  cardCompany: {
    fontSize: 13,
    color: T.textSecondary,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: T.textPrimary,
    fontFamily: monoFont,
  },
  cardStatusBadge: {
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
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
    minHeight: 24,
  },
  dateLabel: {
    fontSize: 13,
    color: T.textSecondary,
  },
  dateValue: {
    fontSize: 13,
    fontWeight: '500',
    color: T.textPrimary,
    fontFamily: monoFont,
  },
  balanceDueValue: {
    color: T.red,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: T.textPrimary,
    marginBottom: 6,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: T.textSecondary,
    textAlign: 'center',
  },
  skeletonCard: {
    overflow: 'hidden',
  },
  skeletonText: {
    backgroundColor: colors.surface.muted,
    borderRadius: 999,
  },
  searchSkeleton: {
    flex: 1,
    height: 42,
  },
  sortSkeletonRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sortSkeleton: {
    width: 52,
    height: 38,
  },
  filterSkeletonRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  filterSkeleton: {
    width: 88,
    height: 34,
  },
  filterSkeletonWide: {
    width: 112,
    height: 34,
  },
  cardTitleSkeleton: {
    width: 110,
    height: 12,
    marginBottom: 8,
  },
  cardSubtitleSkeleton: {
    width: 150,
    height: 18,
  },
  cardAmountSkeleton: {
    width: 88,
    height: 26,
  },
  cardBadgeSkeleton: {
    width: 72,
    height: 22,
    marginTop: 8,
  },
  dateLabelSkeleton: {
    width: 86,
    height: 12,
  },
  dateValueSkeleton: {
    width: 92,
    height: 14,
  },
});
