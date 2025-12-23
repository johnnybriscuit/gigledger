import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../lib/supabase';
import { Invoice, InvoiceSettings } from '../types/invoice';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { downloadInvoiceHTML, printInvoice } from '../utils/generateInvoicePDF';

interface PublicInvoiceViewProps {
  invoiceId: string;
}

export function PublicInvoiceView({ invoiceId }: PublicInvoiceViewProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoice();
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices' as any)
        .select(`
          *,
          line_items:invoice_line_items(*)
        `)
        .eq('id', invoiceId)
        .single();

      if (invoiceError) throw invoiceError;

      if (!invoiceData) {
        throw new Error('Invoice not found');
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from('invoice_settings' as any)
        .select('*')
        .eq('user_id', invoiceData.user_id)
        .single();

      if (settingsError) throw settingsError;

      setInvoice(invoiceData);
      setSettings(settingsData);

      if (invoiceData.status === 'sent' && !invoiceData.viewed_at) {
        await supabase
          .from('invoices' as any)
          .update({ 
            status: 'viewed', 
            viewed_at: new Date().toISOString() 
          })
          .eq('id', invoiceId);
      }

    } catch (err) {
      console.error('Error fetching invoice:', err);
      setError(err instanceof Error ? err.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (invoice && settings) {
      downloadInvoiceHTML(invoice, settings);
    }
  };

  const handlePrint = () => {
    if (invoice && settings) {
      printInvoice(invoice, settings);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading invoice...</Text>
      </View>
    );
  }

  if (error || !invoice || !settings) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Invoice Not Found</Text>
        <Text style={styles.errorText}>
          {error || 'This invoice may have been deleted or the link is invalid.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invoice {invoice.invoice_number}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleDownload}>
            <Text style={styles.actionButtonText}>📥 Download</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handlePrint}>
            <Text style={styles.actionButtonText}>🖨️ Print</Text>
          </TouchableOpacity>
        </View>
      </View>

      <InvoiceTemplate invoice={invoice} settings={settings} />
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
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f9fafb',
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
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
});
