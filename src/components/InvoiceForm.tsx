import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useInvoices } from '../hooks/useInvoices';
import { useInvoiceSettings } from '../hooks/useInvoiceSettings';
import { usePayers } from '../hooks/usePayers';
import { InvoiceFormData, PAYMENT_TERM_PRESETS, calculateDueDate, PaymentMethodDetail, PAYMENT_METHODS } from '../types/invoice';

interface InvoiceFormProps {
  invoiceId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function InvoiceForm({ invoiceId, onSuccess, onCancel }: InvoiceFormProps) {
  const { createInvoice, updateInvoice, invoices } = useInvoices();
  const { settings, getNextInvoiceNumber } = useInvoiceSettings();
  const { payers } = usePayers();
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<InvoiceFormData>({
    client_name: '',
    client_email: '',
    client_company: '',
    client_address: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: calculateDueDate(new Date().toISOString().split('T')[0], 'Net 30'),
    payment_terms: 'Net 30',
    notes: '',
    private_notes: '',
    tax_rate: settings?.default_tax_rate,
    discount_amount: 0,
    accepted_payment_methods: settings?.accepted_payment_methods || [],
    line_items: [{ description: '', quantity: 1, rate: 0 }]
  });

  useEffect(() => {
    if (invoiceId) {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (invoice) {
        setFormData({
          client_id: invoice.client_id,
          client_name: invoice.client_name,
          client_email: invoice.client_email,
          client_company: invoice.client_company,
          client_address: invoice.client_address,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          payment_terms: invoice.payment_terms,
          notes: invoice.notes,
          private_notes: invoice.private_notes,
          tax_rate: invoice.tax_rate,
          discount_amount: invoice.discount_amount,
          accepted_payment_methods: invoice.accepted_payment_methods,
          line_items: invoice.line_items?.map(item => ({
            description: item.description,
            quantity: item.quantity,
            rate: item.rate
          })) || [{ description: '', quantity: 1, rate: 0 }]
        });
      }
    }
  }, [invoiceId, invoices]);

  const addLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { description: '', quantity: 1, rate: 0 }]
    });
  };

  const removeLineItem = (index: number) => {
    if (formData.line_items.length === 1) {
      Alert.alert('Error', 'Invoice must have at least one line item');
      return;
    }
    const newLineItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: newLineItems });
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const newLineItems = [...formData.line_items];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    setFormData({ ...formData, line_items: newLineItems });
  };

  const selectClient = (payerId: string) => {
    const payer = payers.find(p => p.id === payerId);
    if (payer) {
      setFormData({
        ...formData,
        client_id: payer.id,
        client_name: payer.name,
        client_email: payer.email || '',
        client_company: payer.company || '',
        client_address: payer.address || ''
      });
    }
  };

  const handlePaymentTermChange = (term: string) => {
    setFormData({
      ...formData,
      payment_terms: term,
      due_date: calculateDueDate(formData.invoice_date, term)
    });
  };

  const togglePaymentMethod = (method: string) => {
    const exists = formData.accepted_payment_methods.find(pm => pm.method === method);
    if (exists) {
      setFormData({
        ...formData,
        accepted_payment_methods: formData.accepted_payment_methods.filter(pm => pm.method !== method)
      });
    } else {
      setFormData({
        ...formData,
        accepted_payment_methods: [...formData.accepted_payment_methods, { method: method as any, details: '' }]
      });
    }
  };

  const calculateSubtotal = () => {
    return formData.line_items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const calculateTax = () => {
    if (!formData.tax_rate) return 0;
    return calculateSubtotal() * (formData.tax_rate / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax() - (formData.discount_amount || 0);
  };

  const handleSave = async () => {
    if (!formData.client_name) {
      Alert.alert('Error', 'Client name is required');
      return;
    }

    if (formData.line_items.some(item => !item.description)) {
      Alert.alert('Error', 'All line items must have a description');
      return;
    }

    try {
      setSaving(true);

      if (invoiceId) {
        await updateInvoice(invoiceId, formData);
        Alert.alert('Success', 'Invoice updated successfully');
      } else {
        const invoiceNumber = await getNextInvoiceNumber();
        await createInvoice(formData, invoiceNumber);
        Alert.alert('Success', 'Invoice created successfully');
      }

      onSuccess?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to save invoice');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Client Information</Text>

        {payers.length > 0 && !invoiceId && (
          <>
            <Text style={styles.label}>Select Existing Client</Text>
            <ScrollView horizontal style={styles.clientSelector}>
              {payers.map((payer) => (
                <TouchableOpacity
                  key={payer.id}
                  style={[
                    styles.clientButton,
                    formData.client_id === payer.id && styles.clientButtonActive
                  ]}
                  onPress={() => selectClient(payer.id)}
                >
                  <Text style={[
                    styles.clientButtonText,
                    formData.client_id === payer.id && styles.clientButtonTextActive
                  ]}>
                    {payer.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Text style={styles.orText}>OR</Text>
          </>
        )}

        <Text style={styles.label}>Client Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.client_name}
          onChangeText={(text) => setFormData({ ...formData, client_name: text })}
          placeholder="Client Name"
        />

        <Text style={styles.label}>Company</Text>
        <TextInput
          style={styles.input}
          value={formData.client_company}
          onChangeText={(text) => setFormData({ ...formData, client_company: text })}
          placeholder="Company Name"
        />

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={formData.client_email}
          onChangeText={(text) => setFormData({ ...formData, client_email: text })}
          placeholder="client@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.client_address}
          onChangeText={(text) => setFormData({ ...formData, client_address: text })}
          placeholder="123 Main St, City, State 12345"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Details</Text>

        <Text style={styles.label}>Invoice Date</Text>
        <TextInput
          style={styles.input}
          value={formData.invoice_date}
          onChangeText={(text) => setFormData({ ...formData, invoice_date: text })}
          placeholder="YYYY-MM-DD"
        />

        <Text style={styles.label}>Payment Terms</Text>
        <View style={styles.paymentTermsContainer}>
          {PAYMENT_TERM_PRESETS.map((preset) => (
            <TouchableOpacity
              key={preset.value}
              style={[
                styles.termButton,
                formData.payment_terms === preset.value && styles.termButtonActive
              ]}
              onPress={() => handlePaymentTermChange(preset.value)}
            >
              <Text style={[
                styles.termButtonText,
                formData.payment_terms === preset.value && styles.termButtonTextActive
              ]}>
                {preset.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Due Date</Text>
        <TextInput
          style={styles.input}
          value={formData.due_date}
          onChangeText={(text) => setFormData({ ...formData, due_date: text })}
          placeholder="YYYY-MM-DD"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Line Items</Text>

        {formData.line_items.map((item, index) => (
          <View key={index} style={styles.lineItemContainer}>
            <View style={styles.lineItemHeader}>
              <Text style={styles.lineItemNumber}>Item {index + 1}</Text>
              {formData.line_items.length > 1 && (
                <TouchableOpacity onPress={() => removeLineItem(index)}>
                  <Text style={styles.removeButton}>Remove</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={item.description}
              onChangeText={(text) => updateLineItem(index, 'description', text)}
              placeholder="Service or product description"
              multiline
              numberOfLines={2}
            />

            <View style={styles.lineItemRow}>
              <View style={styles.lineItemField}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  style={styles.input}
                  value={item.quantity.toString()}
                  onChangeText={(text) => updateLineItem(index, 'quantity', parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="1"
                />
              </View>

              <View style={styles.lineItemField}>
                <Text style={styles.label}>Rate</Text>
                <TextInput
                  style={styles.input}
                  value={item.rate.toString()}
                  onChangeText={(text) => updateLineItem(index, 'rate', parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
              </View>

              <View style={styles.lineItemField}>
                <Text style={styles.label}>Amount</Text>
                <Text style={styles.amountText}>${(item.quantity * item.rate).toFixed(2)}</Text>
              </View>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addButton} onPress={addLineItem}>
          <Text style={styles.addButtonText}>+ Add Line Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Totals</Text>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>${calculateSubtotal().toFixed(2)}</Text>
        </View>

        <View style={styles.inputRow}>
          <Text style={styles.label}>Tax Rate (%)</Text>
          <TextInput
            style={[styles.input, styles.smallInput]}
            value={formData.tax_rate?.toString() || ''}
            onChangeText={(text) => setFormData({ ...formData, tax_rate: parseFloat(text) || undefined })}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>

        {formData.tax_rate && formData.tax_rate > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Tax ({formData.tax_rate}%)</Text>
            <Text style={styles.totalValue}>${calculateTax().toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <Text style={styles.label}>Discount</Text>
          <TextInput
            style={[styles.input, styles.smallInput]}
            value={formData.discount_amount?.toString() || ''}
            onChangeText={(text) => setFormData({ ...formData, discount_amount: parseFloat(text) || 0 })}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>

        <View style={[styles.totalRow, styles.grandTotalRow]}>
          <Text style={styles.grandTotalLabel}>TOTAL DUE</Text>
          <Text style={styles.grandTotalValue}>${calculateTotal().toFixed(2)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment Methods Accepted</Text>
        <View style={styles.paymentMethodsGrid}>
          {PAYMENT_METHODS.map((method) => {
            const isSelected = formData.accepted_payment_methods.find(pm => pm.method === method);
            return (
              <TouchableOpacity
                key={method}
                style={[
                  styles.paymentMethodChip,
                  isSelected && styles.paymentMethodChipActive
                ]}
                onPress={() => togglePaymentMethod(method)}
              >
                <Text style={[
                  styles.paymentMethodChipText,
                  isSelected && styles.paymentMethodChipTextActive
                ]}>
                  {method}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Information</Text>

        <Text style={styles.label}>Notes (visible to client)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.notes}
          onChangeText={(text) => setFormData({ ...formData, notes: text })}
          placeholder="Thank you for your business!"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Private Notes (for your records only)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.private_notes}
          onChangeText={(text) => setFormData({ ...formData, private_notes: text })}
          placeholder="Internal notes..."
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.buttonContainer}>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {invoiceId ? 'Update Invoice' : 'Create Invoice'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#111827',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 12,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  smallInput: {
    width: 120,
  },
  clientSelector: {
    marginBottom: 12,
  },
  clientButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  clientButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  clientButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  clientButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  orText: {
    textAlign: 'center',
    color: '#6b7280',
    marginVertical: 12,
    fontSize: 14,
  },
  paymentTermsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  termButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  termButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  termButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  termButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  lineItemContainer: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f9fafb',
  },
  lineItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lineItemNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '500',
  },
  lineItemRow: {
    flexDirection: 'row',
    gap: 12,
  },
  lineItemField: {
    flex: 1,
  },
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    paddingVertical: 12,
  },
  addButton: {
    borderWidth: 2,
    borderColor: '#2563eb',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#2563eb',
    fontSize: 16,
    fontWeight: '600',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    color: '#374151',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#111827',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#111827',
    marginTop: 12,
    paddingTop: 12,
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  paymentMethodChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  paymentMethodChipActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  paymentMethodChipText: {
    fontSize: 13,
    color: '#374151',
  },
  paymentMethodChipTextActive: {
    color: '#fff',
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
});
