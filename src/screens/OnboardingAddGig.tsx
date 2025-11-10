import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useCreateGig } from '../hooks/useGigs';
import { supabase } from '../lib/supabase';
import { useTaxEstimate } from '../hooks/useTaxEstimate';

interface OnboardingAddGigProps {
  payerId: string | null;
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export function OnboardingAddGig({ payerId, onComplete, onSkip, onBack }: OnboardingAddGigProps) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [title, setTitle] = useState('');
  const [grossAmount, setGrossAmount] = useState('');
  const [fees, setFees] = useState('');
  const [otherIncome, setOtherIncome] = useState('');
  const [taxesWithheld, setTaxesWithheld] = useState(false);
  const createGig = useCreateGig();

  // Calculate live tax estimate
  const netBeforeTax = useMemo(() => {
    const gross = parseFloat(grossAmount) || 0;
    const fee = parseFloat(fees) || 0;
    const other = parseFloat(otherIncome) || 0;
    return gross + other - fee;
  }, [grossAmount, fees, otherIncome]);

  const { estimate: taxEstimate } = useTaxEstimate(netBeforeTax);
  const estimatedNet = netBeforeTax - (taxEstimate?.total || 0);

  const handleComplete = async () => {
    if (!payerId) {
      Alert.alert('Error', 'No payer selected. Please go back and add a payer first.');
      return;
    }

    if (!title.trim()) {
      Alert.alert('Title Required', 'Please enter a gig title');
      return;
    }

    if (!grossAmount || parseFloat(grossAmount) <= 0) {
      Alert.alert('Amount Required', 'Please enter a valid amount');
      return;
    }

    try {
      await createGig.mutateAsync({
        payer_id: payerId,
        date,
        title: title.trim(),
        gross_amount: parseFloat(grossAmount),
        tips: 0,
        fees: parseFloat(fees) || 0,
        per_diem: 0,
        other_income: parseFloat(otherIncome) || 0,
        net_amount: netBeforeTax,
        paid: false,
        taxes_withheld: taxesWithheld,
      });

      // Mark onboarding as complete
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id);
      }

      onComplete();
    } catch (error: any) {
      console.error('[OnboardingAddGig] Error creating gig:', error);
      Alert.alert('Error', error.message || 'Failed to create gig');
    }
  };

  const handleSkip = async () => {
    // Mark onboarding as complete even if skipped
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ onboarding_complete: true })
          .eq('id', user.id);
      }
      onSkip();
    } catch (error) {
      console.error('[OnboardingAddGig] Error marking onboarding complete:', error);
      onSkip(); // Skip anyway
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text style={styles.title}>Log your first gig 💰</Text>
          <Text style={styles.subtitle}>
            Use a real or sample gig so you can see your true net after expenses & taxes.
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date *</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gig Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Friday Night Show"
              value={title}
              onChangeText={setTitle}
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gross Amount *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={grossAmount}
              onChangeText={setGrossAmount}
              keyboardType="decimal-pad"
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Fees (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={fees}
              onChangeText={setFees}
              keyboardType="decimal-pad"
              editable={!createGig.isPending}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Other Income (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={otherIncome}
              onChangeText={setOtherIncome}
              keyboardType="decimal-pad"
              editable={!createGig.isPending}
            />
          </View>

          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => setTaxesWithheld(!taxesWithheld)}
            disabled={createGig.isPending}
          >
            <View style={[styles.checkbox, taxesWithheld && styles.checkboxChecked]}>
              {taxesWithheld && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>Taxes withheld?</Text>
          </TouchableOpacity>

          {/* Live Summary Card */}
          {netBeforeTax > 0 && (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Your estimated take-home for this gig</Text>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gross:</Text>
                <Text style={styles.summaryValue}>${(parseFloat(grossAmount) || 0).toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Est. taxes to set aside:</Text>
                <Text style={styles.summaryValue}>${(taxEstimate?.total || 0).toFixed(2)}</Text>
              </View>
              <View style={[styles.summaryRow, styles.summaryRowTotal]}>
                <Text style={styles.summaryLabelTotal}>Est. net after taxes & fees:</Text>
                <Text style={styles.summaryValueTotal}>${estimatedNet.toFixed(2)}</Text>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          disabled={createGig.isPending}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={createGig.isPending}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.completeButton, createGig.isPending && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={createGig.isPending}
        >
          {createGig.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.completeButtonText}>Save gig & go to your dashboard</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 32,
  },
  step: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3b82f6',
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    lineHeight: 24,
  },
  form: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 4,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  summaryCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e40af',
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#374151',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  summaryRowTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#bfdbfe',
  },
  summaryLabelTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e40af',
  },
  summaryValueTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  completeButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
