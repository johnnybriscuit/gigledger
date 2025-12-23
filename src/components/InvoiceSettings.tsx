import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useInvoiceSettings } from '../hooks/useInvoiceSettings';
import { PaymentMethodDetail, PAYMENT_METHODS, COLOR_SCHEMES, FONT_STYLES, LAYOUT_STYLES, CURRENCIES } from '../types/invoice';

export function InvoiceSettings() {
  const { settings, loading, createSettings, updateSettings } = useInvoiceSettings();
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone: '',
    address: '',
    website: '',
    tax_id: '',
    invoice_prefix: 'INV-',
    default_payment_terms: 'Net 30',
    default_tax_rate: '',
    default_currency: 'USD',
    color_scheme: 'blue',
    font_style: 'modern',
    layout_style: 'classic',
  });
  const [selectedPaymentMethods, setSelectedPaymentMethods] = useState<PaymentMethodDetail[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormData({
        business_name: settings.business_name,
        email: settings.email,
        phone: settings.phone || '',
        address: settings.address || '',
        website: settings.website || '',
        tax_id: settings.tax_id || '',
        invoice_prefix: settings.invoice_prefix,
        default_payment_terms: settings.default_payment_terms,
        default_tax_rate: settings.default_tax_rate?.toString() || '',
        default_currency: settings.default_currency,
        color_scheme: settings.color_scheme,
        font_style: settings.font_style,
        layout_style: settings.layout_style,
      });
      setSelectedPaymentMethods(settings.accepted_payment_methods || []);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!formData.business_name || !formData.email) {
      Alert.alert('Error', 'Business name and email are required');
      return;
    }

    try {
      setSaving(true);
      const settingsData = {
        ...formData,
        default_tax_rate: formData.default_tax_rate ? parseFloat(formData.default_tax_rate) : undefined,
        accepted_payment_methods: selectedPaymentMethods,
      };

      if (settings) {
        await updateSettings(settingsData);
        Alert.alert('Success', 'Invoice settings updated successfully');
      } else {
        await createSettings(settingsData);
        Alert.alert('Success', 'Invoice settings created successfully');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save invoice settings');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = (method: string) => {
    const exists = selectedPaymentMethods.find(pm => pm.method === method);
    if (exists) {
      setSelectedPaymentMethods(selectedPaymentMethods.filter(pm => pm.method !== method));
    } else {
      setSelectedPaymentMethods([...selectedPaymentMethods, { method: method as any, details: '' }]);
    }
  };

  const updatePaymentMethodDetails = (method: string, details: string) => {
    setSelectedPaymentMethods(
      selectedPaymentMethods.map(pm =>
        pm.method === method ? { ...pm, details } : pm
      )
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Business Information</Text>
        
        <Text style={styles.label}>Business/Professional Name *</Text>
        <TextInput
          style={styles.input}
          value={formData.business_name}
          onChangeText={(text) => setFormData({ ...formData, business_name: text })}
          placeholder="Your Business Name"
        />

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          placeholder="business@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone</Text>
        <TextInput
          style={styles.input}
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          placeholder="(555) 123-4567"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Address</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={formData.address}
          onChangeText={(text) => setFormData({ ...formData, address: text })}
          placeholder="123 Main St, City, State 12345"
          multiline
          numberOfLines={3}
        />

        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={formData.website}
          onChangeText={(text) => setFormData({ ...formData, website: text })}
          placeholder="https://yourwebsite.com"
          keyboardType="url"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Tax ID / EIN</Text>
        <TextInput
          style={styles.input}
          value={formData.tax_id}
          onChangeText={(text) => setFormData({ ...formData, tax_id: text })}
          placeholder="12-3456789"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Defaults</Text>

        <Text style={styles.label}>Invoice Number Prefix</Text>
        <TextInput
          style={styles.input}
          value={formData.invoice_prefix}
          onChangeText={(text) => setFormData({ ...formData, invoice_prefix: text })}
          placeholder="INV-"
        />

        <Text style={styles.label}>Default Payment Terms</Text>
        <TextInput
          style={styles.input}
          value={formData.default_payment_terms}
          onChangeText={(text) => setFormData({ ...formData, default_payment_terms: text })}
          placeholder="Net 30"
        />

        <Text style={styles.label}>Default Tax Rate (%)</Text>
        <TextInput
          style={styles.input}
          value={formData.default_tax_rate}
          onChangeText={(text) => setFormData({ ...formData, default_tax_rate: text })}
          placeholder="8.5"
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Currency</Text>
        <View style={styles.currencyContainer}>
          {CURRENCIES.map((currency) => (
            <TouchableOpacity
              key={currency.code}
              style={[
                styles.currencyButton,
                formData.default_currency === currency.code && styles.currencyButtonActive
              ]}
              onPress={() => setFormData({ ...formData, default_currency: currency.code })}
            >
              <Text style={[
                styles.currencyButtonText,
                formData.default_currency === currency.code && styles.currencyButtonTextActive
              ]}>
                {currency.symbol} {currency.code}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
        <Text style={styles.helperText}>Select the payment methods you accept and add details (optional)</Text>

        {PAYMENT_METHODS.map((method) => {
          const isSelected = selectedPaymentMethods.find(pm => pm.method === method);
          return (
            <View key={method} style={styles.paymentMethodContainer}>
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => togglePaymentMethod(method)}
              >
                <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{method}</Text>
              </TouchableOpacity>
              
              {isSelected && (
                <TextInput
                  style={[styles.input, styles.paymentDetailsInput]}
                  value={isSelected.details || ''}
                  onChangeText={(text) => updatePaymentMethodDetails(method, text)}
                  placeholder={`e.g., @username or email`}
                />
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Invoice Branding</Text>

        <Text style={styles.label}>Color Scheme</Text>
        <View style={styles.colorSchemeContainer}>
          {COLOR_SCHEMES.map((scheme) => (
            <TouchableOpacity
              key={scheme.value}
              style={[
                styles.colorSchemeButton,
                formData.color_scheme === scheme.value && styles.colorSchemeButtonActive
              ]}
              onPress={() => setFormData({ ...formData, color_scheme: scheme.value })}
            >
              <View style={[styles.colorPreview, { backgroundColor: scheme.primary }]} />
              <Text style={styles.colorSchemeName}>{scheme.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Font Style</Text>
        <View style={styles.optionContainer}>
          {FONT_STYLES.map((font) => (
            <TouchableOpacity
              key={font.value}
              style={[
                styles.optionButton,
                formData.font_style === font.value && styles.optionButtonActive
              ]}
              onPress={() => setFormData({ ...formData, font_style: font.value })}
            >
              <Text style={[
                styles.optionButtonText,
                formData.font_style === font.value && styles.optionButtonTextActive
              ]}>
                {font.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Layout Style</Text>
        <View style={styles.optionContainer}>
          {LAYOUT_STYLES.map((layout) => (
            <TouchableOpacity
              key={layout.value}
              style={[
                styles.optionButton,
                formData.layout_style === layout.value && styles.optionButtonActive
              ]}
              onPress={() => setFormData({ ...formData, layout_style: layout.value })}
            >
              <Text style={[
                styles.optionButtonText,
                formData.layout_style === layout.value && styles.optionButtonTextActive
              ]}>
                {layout.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveButtonText}>Save Settings</Text>
        )}
      </TouchableOpacity>

      <View style={styles.bottomPadding} />
    </ScrollView>
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 12,
  },
  paymentMethodContainer: {
    marginBottom: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 16,
    color: '#111827',
  },
  paymentDetailsInput: {
    marginLeft: 36,
    marginTop: 4,
  },
  currencyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  currencyButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  currencyButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  currencyButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  currencyButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  colorSchemeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorSchemeButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  colorSchemeButtonActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  colorPreview: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 8,
  },
  colorSchemeName: {
    fontSize: 13,
    color: '#374151',
  },
  optionContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
  },
  optionButtonActive: {
    backgroundColor: '#2563eb',
    borderColor: '#2563eb',
  },
  optionButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  optionButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    margin: 20,
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
