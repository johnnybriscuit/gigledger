/**
 * Payment Methods Editor Component
 * 
 * Provides method-specific forms for configuring payment methods
 * with validation and live preview.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { 
  PaymentMethodsConfig, 
  PaymentMethodConfig,
  PaymentMethodType,
  PaymentMethodValidationError 
} from '../types/paymentMethods';
import { validatePaymentMethodsConfig } from '../utils/paymentMethodsMigration';
import { formatPaymentMethodsForDisplay } from '../utils/formatPaymentMethods';
import { colors, spacing, radius, typography } from '../styles/theme';

interface PaymentMethodsEditorProps {
  config: PaymentMethodsConfig;
  onChange: (config: PaymentMethodsConfig) => void;
  invoiceNumber?: string;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethodType, string> = {
  cash: 'Cash',
  check: 'Check',
  venmo: 'Venmo',
  zelle: 'Zelle',
  paypal: 'PayPal',
  cashapp: 'Cash App',
  wire: 'Wire Transfer',
  card: 'Credit Card',
};

export function PaymentMethodsEditor({ config, onChange, invoiceNumber }: PaymentMethodsEditorProps) {
  const [validationErrors, setValidationErrors] = useState<PaymentMethodValidationError[]>([]);
  const [expandedMethods, setExpandedMethods] = useState<Set<PaymentMethodType>>(new Set());

  // Validate on config change
  useEffect(() => {
    const errors = validatePaymentMethodsConfig(config);
    setValidationErrors(errors);
  }, [config]);

  const isMethodEnabled = (type: PaymentMethodType): boolean => {
    return config.methods.some(m => m.type === type && m.enabled);
  };

  const getMethod = (type: PaymentMethodType): PaymentMethodConfig | undefined => {
    return config.methods.find(m => m.type === type);
  };

  const toggleMethod = (type: PaymentMethodType) => {
    const existing = getMethod(type);
    
    if (existing) {
      // Toggle enabled state
      const updatedMethods = config.methods.map(m =>
        m.type === type ? { ...m, enabled: !m.enabled } : m
      );
      onChange({ ...config, methods: updatedMethods });
      
      // Auto-expand when enabling
      if (!existing.enabled) {
        setExpandedMethods(new Set([...expandedMethods, type]));
      }
    } else {
      // Add new method with defaults
      const newMethod = createDefaultMethod(type);
      onChange({ ...config, methods: [...config.methods, newMethod] });
      setExpandedMethods(new Set([...expandedMethods, type]));
    }
  };

  const updateMethod = (type: PaymentMethodType, updates: Partial<PaymentMethodConfig>) => {
    const updatedMethods = config.methods.map(m =>
      m.type === type ? { ...m, ...updates } as PaymentMethodConfig : m
    );
    onChange({ ...config, methods: updatedMethods });
  };

  const getFieldError = (type: PaymentMethodType, field: string): string | undefined => {
    return validationErrors.find(e => e.type === type && e.field === field)?.message;
  };

  const preview = formatPaymentMethodsForDisplay(config, invoiceNumber || 'INV-001');

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Accepted Payment Methods</Text>
      <Text style={styles.helperText}>
        Select payment methods and configure details for your invoices
      </Text>

      {/* Payment Methods List */}
      <View style={styles.methodsList}>
        {Object.entries(PAYMENT_METHOD_LABELS).map(([type, label]) => {
          const typedType = type as PaymentMethodType;
          const enabled = isMethodEnabled(typedType);
          const method = getMethod(typedType);
          const isExpanded = expandedMethods.has(typedType);

          return (
            <View key={type} style={styles.methodContainer}>
              {/* Checkbox + Label */}
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => toggleMethod(typedType)}
              >
                <View style={[styles.checkbox, enabled && styles.checkboxChecked]}>
                  {enabled && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>{label}</Text>
              </TouchableOpacity>

              {/* Method-specific form (when enabled) */}
              {enabled && method && (
                <View style={styles.methodDetails}>
                  {renderMethodForm(typedType, method, updateMethod, getFieldError)}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Preview Section */}
      {preview.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>Invoice Preview</Text>
          <Text style={styles.previewSubtitle}>How payment methods will appear on invoices:</Text>
          <View style={styles.previewBox}>
            {preview.map((p, idx) => (
              <View key={idx} style={styles.previewItem}>
                <Text style={styles.previewLabel}>{p.label}:</Text>
                <Text style={styles.previewDetails}>{p.details}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Validation Errors Summary */}
      {validationErrors.length > 0 && (
        <View style={styles.errorSummary}>
          <Text style={styles.errorSummaryText}>
            ⚠️ Please fix {validationErrors.length} error{validationErrors.length > 1 ? 's' : ''} before saving
          </Text>
        </View>
      )}
    </View>
  );
}

function createDefaultMethod(type: PaymentMethodType): PaymentMethodConfig {
  switch (type) {
    case 'cash':
      return { type: 'cash', enabled: true };
    case 'check':
      return { type: 'check', enabled: true, payableTo: '' };
    case 'venmo':
      return { type: 'venmo', enabled: true, handle: '' };
    case 'zelle':
      return { type: 'zelle', enabled: true, contact: '' };
    case 'paypal':
      return { type: 'paypal', enabled: true, contact: '' };
    case 'cashapp':
      return { type: 'cashapp', enabled: true, cashtag: '' };
    case 'wire':
      return { type: 'wire', enabled: true, includeBankDetailsOnInvoice: false };
    case 'card':
      return { type: 'card', enabled: true, paymentUrl: '' };
  }
}

function renderMethodForm(
  type: PaymentMethodType,
  method: PaymentMethodConfig,
  updateMethod: (type: PaymentMethodType, updates: Partial<PaymentMethodConfig>) => void,
  getFieldError: (type: PaymentMethodType, field: string) => string | undefined
) {
  switch (type) {
    case 'cash':
      return (
        <View>
          <Text style={styles.fieldLabel}>Instructions (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={(method as any).instructions || ''}
            onChangeText={(text) => updateMethod(type, { instructions: text })}
            placeholder="Optional instructions (e.g., 'Cash accepted in person.')"
            multiline
            numberOfLines={2}
          />
        </View>
      );

    case 'check':
      return (
        <View>
          <Text style={styles.fieldLabel}>Payable to *</Text>
          <TextInput
            style={[styles.input, getFieldError(type, 'payableTo') && styles.inputError]}
            value={(method as any).payableTo || ''}
            onChangeText={(text) => updateMethod(type, { payableTo: text })}
            placeholder="Payable to (e.g., John Burkhardt / Bozzy LLC)"
          />
          {getFieldError(type, 'payableTo') && (
            <Text style={styles.errorText}>{getFieldError(type, 'payableTo')}</Text>
          )}

          <Text style={styles.fieldLabel}>Mailing Address (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={(method as any).mailingAddress || ''}
            onChangeText={(text) => updateMethod(type, { mailingAddress: text })}
            placeholder="Mailing address (optional)"
            multiline
            numberOfLines={2}
          />

          <Text style={styles.fieldLabel}>Memo (optional)</Text>
          <TextInput
            style={styles.input}
            value={(method as any).memo || ''}
            onChangeText={(text) => updateMethod(type, { memo: text })}
            placeholder="Memo line (optional — defaults to invoice #)"
          />
        </View>
      );

    case 'venmo':
      return (
        <View>
          <Text style={styles.fieldLabel}>Venmo Handle *</Text>
          <TextInput
            style={[styles.input, getFieldError(type, 'handle') && styles.inputError]}
            value={(method as any).handle || ''}
            onChangeText={(text) => updateMethod(type, { handle: text })}
            placeholder="@yourhandle"
          />
          {getFieldError(type, 'handle') && (
            <Text style={styles.errorText}>{getFieldError(type, 'handle')}</Text>
          )}

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={(method as any).note || ''}
            onChangeText={(text) => updateMethod(type, { note: text })}
            placeholder="Note to include (optional)"
          />
        </View>
      );

    case 'zelle':
      return (
        <View>
          <Text style={styles.fieldLabel}>Email or Phone *</Text>
          <TextInput
            style={[styles.input, getFieldError(type, 'contact') && styles.inputError]}
            value={(method as any).contact || ''}
            onChangeText={(text) => updateMethod(type, { contact: text })}
            placeholder="Email or phone number"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {getFieldError(type, 'contact') && (
            <Text style={styles.errorText}>{getFieldError(type, 'contact')}</Text>
          )}

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={(method as any).note || ''}
            onChangeText={(text) => updateMethod(type, { note: text })}
            placeholder="Note to include (optional)"
          />
        </View>
      );

    case 'paypal':
      return (
        <View>
          <Text style={styles.fieldLabel}>Email or PayPal.me URL *</Text>
          <TextInput
            style={[styles.input, getFieldError(type, 'contact') && styles.inputError]}
            value={(method as any).contact || ''}
            onChangeText={(text) => updateMethod(type, { contact: text })}
            placeholder="Email or paypal.me URL"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {getFieldError(type, 'contact') && (
            <Text style={styles.errorText}>{getFieldError(type, 'contact')}</Text>
          )}

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={(method as any).note || ''}
            onChangeText={(text) => updateMethod(type, { note: text })}
            placeholder="Note to include (optional)"
          />
        </View>
      );

    case 'cashapp':
      return (
        <View>
          <Text style={styles.fieldLabel}>Cash App Cashtag *</Text>
          <TextInput
            style={[styles.input, getFieldError(type, 'cashtag') && styles.inputError]}
            value={(method as any).cashtag || ''}
            onChangeText={(text) => updateMethod(type, { cashtag: text })}
            placeholder="$yourcashtag"
          />
          {getFieldError(type, 'cashtag') && (
            <Text style={styles.errorText}>{getFieldError(type, 'cashtag')}</Text>
          )}

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={(method as any).note || ''}
            onChangeText={(text) => updateMethod(type, { note: text })}
            placeholder="Note to include (optional)"
          />
        </View>
      );

    case 'wire':
      return (
        <View>
          <Text style={styles.fieldLabel}>Wire Instructions (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={(method as any).instructions || ''}
            onChangeText={(text) => updateMethod(type, { instructions: text })}
            placeholder="Wire instructions (or tell them to contact support@bozzygigs.com)"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => updateMethod(type, { 
              includeBankDetailsOnInvoice: !(method as any).includeBankDetailsOnInvoice 
            })}
          >
            <View style={[
              styles.checkbox, 
              (method as any).includeBankDetailsOnInvoice && styles.checkboxChecked
            ]}>
              {(method as any).includeBankDetailsOnInvoice && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Include bank details on invoice</Text>
          </TouchableOpacity>

          {(method as any).includeBankDetailsOnInvoice && (
            <View style={styles.bankDetailsSection}>
              <Text style={styles.fieldLabel}>Account Holder</Text>
              <TextInput
                style={styles.input}
                value={(method as any).accountHolder || ''}
                onChangeText={(text) => updateMethod(type, { accountHolder: text })}
                placeholder="Account holder name"
              />

              <Text style={styles.fieldLabel}>Bank Name</Text>
              <TextInput
                style={styles.input}
                value={(method as any).bankName || ''}
                onChangeText={(text) => updateMethod(type, { bankName: text })}
                placeholder="Bank name"
              />

              <Text style={styles.fieldLabel}>Routing Number</Text>
              <TextInput
                style={styles.input}
                value={(method as any).routingNumber || ''}
                onChangeText={(text) => updateMethod(type, { routingNumber: text })}
                placeholder="Routing number"
                keyboardType="number-pad"
              />

              <Text style={styles.fieldLabel}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={(method as any).accountNumber || ''}
                onChangeText={(text) => updateMethod(type, { accountNumber: text })}
                placeholder="Account number"
                keyboardType="number-pad"
                secureTextEntry
              />

              <Text style={styles.fieldLabel}>SWIFT (optional)</Text>
              <TextInput
                style={styles.input}
                value={(method as any).swift || ''}
                onChangeText={(text) => updateMethod(type, { swift: text })}
                placeholder="SWIFT (optional)"
              />

              <Text style={styles.fieldLabel}>Reference (optional)</Text>
              <TextInput
                style={styles.input}
                value={(method as any).reference || ''}
                onChangeText={(text) => updateMethod(type, { reference: text })}
                placeholder="Reference (optional — defaults to invoice #)"
              />
            </View>
          )}
        </View>
      );

    case 'card':
      return (
        <View>
          <Text style={styles.fieldLabel}>Payment Link *</Text>
          <TextInput
            style={[styles.input, getFieldError(type, 'paymentUrl') && styles.inputError]}
            value={(method as any).paymentUrl || ''}
            onChangeText={(text) => updateMethod(type, { paymentUrl: text })}
            placeholder="Payment link (Stripe/PayPal checkout URL, etc.)"
            keyboardType="url"
            autoCapitalize="none"
          />
          {getFieldError(type, 'paymentUrl') && (
            <Text style={styles.errorText}>{getFieldError(type, 'paymentUrl')}</Text>
          )}

          <Text style={styles.fieldLabel}>Accepted Cards (optional)</Text>
          <TextInput
            style={styles.input}
            value={(method as any).acceptedCards || ''}
            onChangeText={(text) => updateMethod(type, { acceptedCards: text })}
            placeholder="Accepted cards (optional, e.g., Visa, MC, Amex)"
          />

          <Text style={styles.fieldLabel}>Note (optional)</Text>
          <TextInput
            style={styles.input}
            value={(method as any).note || ''}
            onChangeText={(text) => updateMethod(type, { note: text })}
            placeholder="Note (optional)"
          />
        </View>
      );
  }
}

const styles = StyleSheet.create({
  container: {
    marginBottom: parseInt(spacing[4]),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#111827',
  },
  helperText: {
    fontSize: 13,
    color: '#6b7280',
    marginBottom: 16,
  },
  methodsList: {
    marginBottom: parseInt(spacing[4]),
  },
  methodContainer: {
    marginBottom: parseInt(spacing[3]),
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
  methodDetails: {
    marginLeft: 36,
    marginTop: 8,
    padding: parseInt(spacing[3]),
    backgroundColor: '#f9fafb',
    borderRadius: parseInt(radius.sm),
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 6,
    marginTop: 12,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  textArea: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: 4,
  },
  bankDetailsSection: {
    marginTop: parseInt(spacing[2]),
    paddingTop: parseInt(spacing[2]),
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  previewSection: {
    marginTop: parseInt(spacing[4]),
    padding: parseInt(spacing[4]),
    backgroundColor: '#eff6ff',
    borderRadius: parseInt(radius.md),
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: 4,
  },
  previewSubtitle: {
    fontSize: 13,
    color: '#3b82f6',
    marginBottom: 12,
  },
  previewBox: {
    backgroundColor: '#fff',
    padding: parseInt(spacing[3]),
    borderRadius: parseInt(radius.sm),
    borderWidth: 1,
    borderColor: '#dbeafe',
  },
  previewItem: {
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  previewDetails: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 18,
  },
  errorSummary: {
    marginTop: parseInt(spacing[3]),
    padding: parseInt(spacing[3]),
    backgroundColor: '#fef2f2',
    borderRadius: parseInt(radius.sm),
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorSummaryText: {
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '500',
  },
});
