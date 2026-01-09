import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Invoice, InvoiceSettings, formatCurrency } from '../types/invoice';

interface InvoiceTemplateProps {
  invoice: Invoice;
  settings: InvoiceSettings;
  onDeletePayment?: (paymentId: string) => void;
}

export function InvoiceTemplate({ invoice, settings, onDeletePayment }: InvoiceTemplateProps) {
  const handleDeletePayment = (paymentId: string, paymentAmount: number) => {
    Alert.alert(
      'Delete Payment',
      `Are you sure you want to delete this payment of ${formatCurrency(paymentAmount, invoice.currency)}? This will update the invoice status.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeletePayment?.(paymentId)
        }
      ]
    );
  };
  const getColorScheme = () => {
    switch (settings.color_scheme) {
      case 'blue':
        return { primary: '#2563eb', secondary: '#dbeafe' };
      case 'green':
        return { primary: '#059669', secondary: '#d1fae5' };
      case 'purple':
        return { primary: '#7c3aed', secondary: '#ede9fe' };
      case 'gray':
        return { primary: '#4b5563', secondary: '#f3f4f6' };
      default:
        return { primary: '#2563eb', secondary: '#dbeafe' };
    }
  };

  const colors = getColorScheme();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.invoice}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.businessName, { color: colors.primary }]}>
              {settings.business_name}
            </Text>
            {settings.email && <Text style={styles.contactInfo}>{settings.email}</Text>}
            {settings.phone && <Text style={styles.contactInfo}>{settings.phone}</Text>}
            {settings.address && <Text style={styles.contactInfo}>{settings.address}</Text>}
            {settings.website && <Text style={styles.contactInfo}>{settings.website}</Text>}
            {settings.tax_id && <Text style={styles.contactInfo}>Tax ID: {settings.tax_id}</Text>}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.primary }]} />

        <Text style={[styles.invoiceTitle, { color: colors.primary }]}>INVOICE</Text>

        <View style={styles.invoiceInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Invoice #:</Text>
            <Text style={styles.infoValue}>{invoice.invoice_number}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Date:</Text>
            <Text style={styles.infoValue}>{new Date(invoice.invoice_date).toLocaleDateString()}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Due Date:</Text>
            <Text style={styles.infoValue}>{new Date(invoice.due_date).toLocaleDateString()}</Text>
          </View>
        </View>

        <View style={styles.billTo}>
          <Text style={styles.billToLabel}>Bill To:</Text>
          <Text style={styles.clientName}>{invoice.client_name}</Text>
          {invoice.client_company && <Text style={styles.clientInfo}>{invoice.client_company}</Text>}
          {invoice.client_address && <Text style={styles.clientInfo}>{invoice.client_address}</Text>}
          {invoice.client_email && <Text style={styles.clientInfo}>{invoice.client_email}</Text>}
        </View>

        <View style={styles.lineItemsContainer}>
          <View style={[styles.lineItemsHeader, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.lineItemHeaderText, styles.descriptionColumn]}>Description</Text>
            <Text style={[styles.lineItemHeaderText, styles.qtyColumn]}>Qty</Text>
            <Text style={[styles.lineItemHeaderText, styles.rateColumn]}>Rate</Text>
            <Text style={[styles.lineItemHeaderText, styles.amountColumn]}>Amount</Text>
          </View>

          {invoice.line_items?.map((item, index) => (
            <View key={item.id} style={[styles.lineItemRow, index % 2 === 1 && styles.lineItemRowAlt]}>
              <Text style={[styles.lineItemText, styles.descriptionColumn]}>{item.description}</Text>
              <Text style={[styles.lineItemText, styles.qtyColumn]}>{item.quantity}</Text>
              <Text style={[styles.lineItemText, styles.rateColumn]}>{formatCurrency(item.rate, invoice.currency)}</Text>
              <Text style={[styles.lineItemText, styles.amountColumn]}>{formatCurrency(item.amount, invoice.currency)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsContainer}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal, invoice.currency)}</Text>
          </View>

          {invoice.tax_rate && invoice.tax_amount && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Tax ({invoice.tax_rate}%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax_amount, invoice.currency)}</Text>
            </View>
          )}

          {invoice.discount_amount && invoice.discount_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Discount:</Text>
              <Text style={styles.totalValue}>-{formatCurrency(invoice.discount_amount, invoice.currency)}</Text>
            </View>
          )}

          <View style={[styles.divider, { backgroundColor: colors.primary, marginVertical: 8 }]} />

          <View style={styles.totalRow}>
            <Text style={[styles.grandTotalLabel, { color: colors.primary }]}>TOTAL DUE:</Text>
            <Text style={[styles.grandTotalValue, { color: colors.primary }]}>
              {formatCurrency(invoice.total_amount, invoice.currency)}
            </Text>
          </View>
        </View>

        {invoice.status === 'paid' && (
          <View style={styles.paidStamp}>
            <Text style={styles.paidStampText}>PAID</Text>
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: '#e5e7eb', marginVertical: 16 }]} />

        {invoice.payment_terms && (
          <View style={styles.termsSection}>
            <Text style={styles.termsSectionLabel}>Payment Terms:</Text>
            <Text style={styles.termsSectionText}>{invoice.payment_terms}</Text>
          </View>
        )}

        {invoice.accepted_payment_methods && invoice.accepted_payment_methods.length > 0 && (
          <View style={styles.termsSection}>
            <Text style={styles.termsSectionLabel}>Payment Methods Accepted:</Text>
            {invoice.accepted_payment_methods.map((pm, index) => (
              <Text key={index} style={styles.termsSectionText}>
                {pm.method}{pm.details ? `: ${pm.details}` : ''}
              </Text>
            ))}
          </View>
        )}

        {invoice.notes && (
          <View style={styles.termsSection}>
            <Text style={styles.termsSectionLabel}>Notes:</Text>
            <Text style={styles.termsSectionText}>{invoice.notes}</Text>
          </View>
        )}

        {invoice.payments && invoice.payments.length > 0 && (
          <View style={styles.paymentsSection}>
            <Text style={styles.paymentsSectionTitle}>Payment History</Text>
            {invoice.payments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentDate}>
                    {new Date(payment.payment_date).toLocaleDateString()}
                  </Text>
                  <Text style={styles.paymentMethod}>{payment.payment_method}</Text>
                  {payment.reference_number && (
                    <Text style={styles.paymentReference}>Ref: {payment.reference_number}</Text>
                  )}
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>
                    {formatCurrency(payment.amount, invoice.currency)}
                  </Text>
                  {onDeletePayment && (
                    <TouchableOpacity
                      onPress={() => handleDeletePayment(payment.id, payment.amount)}
                      style={styles.deletePaymentButton}
                    >
                      <Text style={styles.deletePaymentText}>✕ Undo</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Thank you for your business!</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  invoice: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  header: {
    marginBottom: 16,
  },
  businessName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 2,
  },
  divider: {
    height: 2,
    marginVertical: 16,
  },
  invoiceTitle: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  invoiceInfo: {
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  billTo: {
    marginBottom: 24,
  },
  billToLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  clientInfo: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 2,
  },
  lineItemsContainer: {
    marginBottom: 20,
  },
  lineItemsHeader: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  lineItemHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  lineItemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lineItemRowAlt: {
    backgroundColor: '#f9fafb',
  },
  lineItemText: {
    fontSize: 14,
    color: '#374151',
  },
  descriptionColumn: {
    flex: 3,
  },
  qtyColumn: {
    flex: 1,
    textAlign: 'center',
  },
  rateColumn: {
    flex: 1.5,
    textAlign: 'right',
  },
  amountColumn: {
    flex: 1.5,
    textAlign: 'right',
    fontWeight: '600',
  },
  totalsContainer: {
    alignItems: 'flex-end',
    marginTop: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    minWidth: 250,
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 15,
    color: '#374151',
  },
  totalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
  },
  grandTotalValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  paidStamp: {
    position: 'absolute',
    top: '40%',
    left: '30%',
    transform: [{ rotate: '-25deg' }],
    borderWidth: 4,
    borderColor: '#059669',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    opacity: 0.3,
  },
  paidStampText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#059669',
  },
  termsSection: {
    marginBottom: 12,
  },
  termsSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  termsSectionText: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 2,
  },
  footer: {
    marginTop: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  paymentsSection: {
    marginTop: 24,
    marginBottom: 16,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
    paddingTop: 16,
  },
  paymentsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  paymentMethod: {
    fontSize: 13,
    color: '#6b7280',
  },
  paymentReference: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
    marginBottom: 4,
  },
  deletePaymentButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#fee2e2',
    borderRadius: 4,
  },
  deletePaymentText: {
    fontSize: 12,
    color: '#dc2626',
    fontWeight: '600',
  },
});
