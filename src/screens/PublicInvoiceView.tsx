import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Invoice, InvoiceSettings, PublicInvoicePayload } from '../types/invoice';
import { InvoiceTemplate } from '../components/InvoiceTemplate';
import { downloadInvoiceHTML, printInvoice } from '../utils/generateInvoicePDF';
import { getBaseUrl } from '../lib/getBaseUrl';

interface PublicInvoiceViewProps {
  invoiceId: string;
  token: string | null;
}

export function PublicInvoiceView({ invoiceId, token }: PublicInvoiceViewProps) {
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchInvoice();
  }, [invoiceId, token]);

  const fetchInvoice = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!token) {
        throw new Error('This invoice link is invalid or incomplete.');
      }

      const baseUrl = getBaseUrl();
      const url = new URL('/api/invoices/public', baseUrl);
      url.searchParams.set('invoiceId', invoiceId);
      url.searchParams.set('token', token);

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to load invoice');
      }

      const payload = (await response.json()) as PublicInvoicePayload;

      setInvoice(payload.invoice as Invoice);
      setSettings(payload.settings as InvoiceSettings);
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
    paddingHorizontal: 10,
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
